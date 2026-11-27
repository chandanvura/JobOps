import asyncio
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

from engine.adapters.base import sanitize_text
from engine.adapters.registry import get_adapter
from engine.classifier.engineering import is_engineering_job
from engine.classifier.experience import extract_experience
from engine.classifier.location import LocationNormalizer
from engine.classifier.roles import RoleClassifier
from engine.classifier.skills import SkillExtractor
from engine.dedup.fingerprint import SeenJobsRegistry, compute_job_id
from engine.dedup.freshness import evaluate_freshness
from engine.models import Company, ProcessedJob, RawJob
from engine.storage.db import JobDatabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("JobOpsCollector")

COMPANIES_PATH = Path(__file__).resolve().parent.parent / "registry" / "companies.json"


class JobCollector:
    def __init__(self, db: Optional[JobDatabase] = None):
        self.db = db or JobDatabase()
        self.role_classifier = RoleClassifier()
        self.skill_extractor = SkillExtractor()
        self.location_normalizer = LocationNormalizer()
        self.registry = SeenJobsRegistry(self.db.get_seen_job_ids())

    def load_companies(self) -> List[Company]:
        if not COMPANIES_PATH.exists():
            return []
        with open(COMPANIES_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            companies = [Company(**item) for item in data if item.get("enabled", True)]
            for c in companies:
                self.db.upsert_company(c)
            return companies

    async def collect_from_company(
        self, company: Company, client: httpx.AsyncClient, strict_24h: bool = True
    ) -> List[ProcessedJob]:
        adapter = get_adapter(company.ats_provider)
        if not adapter:
            logger.warning(f"No adapter found for ATS provider: {company.ats_provider}")
            return []

        try:
            raw_jobs = await adapter.fetch_jobs(company, client)
            self.db.record_company_outcome(company.id, success=True, jobs_found=len(raw_jobs))
        except Exception as e:
            self.db.record_company_outcome(company.id, success=False, error=str(e))
            logger.error(f"Error fetching jobs for {company.name} ({company.ats_provider}): {e}")
            return []

        processed: List[ProcessedJob] = []

        for raw in raw_jobs:
            job_id = compute_job_id(company.id, company.ats_provider, raw.external_id)

            # Deduplication: If already seen, skip reprocessing (Zero Overhead!)
            if self.registry.is_seen(job_id):
                continue

            desc_text = raw.description_text or ""

            # Stage 1: Engineering Segregation Filter (discard Sales, HR, Legal, etc.)
            if not is_engineering_job(raw.title, desc_text):
                continue

            # Freshness Evaluation (Strict 24h Window)
            is_fresh, hours_ago = evaluate_freshness(raw.posted_at, max_hours=24.0)

            now_utc = datetime.now(timezone.utc)

            # If strict 24h is requested and an explicit date is given that exceeds 24h, skip
            if strict_24h and raw.posted_at is not None and not is_fresh:
                continue

            # If no explicit date was provided by ATS API, synthesize posted_at as now_utc
            effective_posted_at = raw.posted_at or now_utc
            if raw.posted_at is None:
                is_fresh = True
                hours_ago = 0.0

            # Stage 2: Entity Extraction & Role Categorization
            role_cat, role_label = self.role_classifier.classify(raw.title, desc_text)
            exp_min, exp_max, exp_level = extract_experience(raw.title, desc_text)
            skills = self.skill_extractor.extract(f"{raw.title} {desc_text}")
            city, is_india, work_mode = self.location_normalizer.normalize(
                raw.location_raw, raw.title, desc_text
            )

            final_title = sanitize_text(raw.title) or raw.title
            cleaned_desc = sanitize_text(desc_text, strip_boilerplate=True)
            summary = cleaned_desc[:320].strip() if cleaned_desc else f"{final_title} at {company.name}"

            job = ProcessedJob(
                id=job_id,
                external_id=raw.external_id,
                company_id=company.id,
                company_name=company.name,
                ats_provider=company.ats_provider,
                title=final_title,
                job_url=raw.job_url,
                is_engineering=True,
                role_category=role_cat,
                role_label=role_label,
                location_raw=raw.location_raw,
                city=city or "India",
                work_mode=work_mode,
                is_india=is_india,
                min_years=float(exp_min) if exp_min is not None else None,
                max_years=float(exp_max) if exp_max is not None else None,
                experience_level=exp_level,
                skills=skills,
                posted_at=effective_posted_at,
                age_hours=hours_ago or 0.0,
                is_fresh_24h=is_fresh,
                summary=summary,
            )

            processed.append(job)
            self.registry.mark_seen(job_id)

        return processed

    async def run(self, strict_24h: bool = True, concurrency: int = 10) -> Dict[str, Any]:
        companies = self.load_companies()
        open_circuits = self.db.get_open_circuit_company_ids()
        run_id = self.db.start_ingestion_run(companies_checked=len(companies))
        logger.info(f"Loaded {len(companies)} active companies from registry (open circuits skipped: {len(open_circuits)}).")

        start_time = datetime.now(timezone.utc)
        all_new_jobs: List[ProcessedJob] = []

        semaphore = asyncio.Semaphore(concurrency)
        limits = httpx.Limits(max_keepalive_connections=25, max_connections=60)
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36 JobOps-Collector/1.0"
            ),
            "Accept": "application/json, text/plain, */*",
        }

        async with httpx.AsyncClient(timeout=12.0, limits=limits, headers=headers) as client:
            async def worker(comp: Company):
                if comp.health_status == "unreachable" or comp.id in open_circuits:
                    return []
                async with semaphore:
                    try:
                        jobs = await self.collect_from_company(comp, client, strict_24h=strict_24h)
                        if jobs:
                            logger.info(f"[{comp.name}] Found {len(jobs)} new engineering jobs.")
                        return jobs
                    except Exception as e:
                        logger.debug(f"[{comp.name}] Collection exception: {e}")
                        return []

            tasks = [worker(c) for c in companies]
            results = await asyncio.gather(*tasks)
            for res in results:
                all_new_jobs.extend(res)

        saved_count = self.db.save_processed_jobs(all_new_jobs)
        self.db.refresh_freshness_and_prune()
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()

        fresh_count = sum(1 for j in all_new_jobs if j.is_fresh_24h)
        self.db.finish_ingestion_run(
            run_id=run_id,
            raw_jobs_found=len(all_new_jobs),
            new_jobs_saved=saved_count,
            fresh_24h_jobs=fresh_count,
            duration_seconds=duration,
            status="completed",
        )

        logger.info(
            f"Run #{run_id} completed in {duration:.2f}s. Scanned: {len(companies)} companies "
            f"(skipped circuits: {len(open_circuits)}). New Jobs: {saved_count}. Fresh (24h): {fresh_count}."
        )

        return {
            "run_id": run_id,
            "companies_scanned": len(companies),
            "circuits_skipped": len(open_circuits),
            "new_jobs_saved": saved_count,
            "fresh_24h_jobs": fresh_count,
            "duration_seconds": round(duration, 2),
        }
