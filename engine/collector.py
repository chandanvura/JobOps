import asyncio
import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

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
from engine.models import Company, ProcessedJob
from engine.storage.db import JobDatabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("JobOpsCollector")

COMPANIES_PATH = Path(__file__).resolve().parent.parent / "registry" / "companies.json"


class JobCollector:
    def __init__(self, db: JobDatabase | None = None):
        self.db = db or JobDatabase()
        self.role_classifier = RoleClassifier()
        self.skill_extractor = SkillExtractor()
        self.location_normalizer = LocationNormalizer()
        self.registry = SeenJobsRegistry(self.db.get_seen_job_ids())
        self._last_company_ok: dict[str, bool] = {}

    def load_companies(self) -> list[Company]:
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
    ) -> list[ProcessedJob]:
        adapter = get_adapter(company.ats_provider)
        if not adapter:
            logger.warning(f"No adapter found for ATS provider: {company.ats_provider}")
            return []

        try:
            raw_jobs = await adapter.fetch_jobs(company, client)
            self.db.record_company_outcome(company.id, success=True, jobs_found=len(raw_jobs))
            self._last_company_ok[company.id] = True
        except httpx.HTTPStatusError as e:
            if e.response is not None and e.response.status_code in (429, 503):
                retry_after = e.response.headers.get("Retry-After", "1.5")
                try:
                    delay = min(3.0, max(0.5, float(retry_after)))
                except ValueError:
                    delay = 1.5
                await asyncio.sleep(delay)
                try:
                    raw_jobs = await adapter.fetch_jobs(company, client)
                    self.db.record_company_outcome(company.id, success=True, jobs_found=len(raw_jobs))
                    self._last_company_ok[company.id] = True
                except (httpx.HTTPError, OSError, ValueError, TypeError, KeyError) as retry_err:
                    self.db.record_company_outcome(company.id, success=False, error=str(retry_err))
                    self._last_company_ok[company.id] = False
                    logger.error(f"Error fetching jobs for {company.name} ({company.ats_provider}) after retry: {retry_err}")
                    return []
            else:
                self.db.record_company_outcome(company.id, success=False, error=str(e))
                self._last_company_ok[company.id] = False
                logger.error(f"Error fetching jobs for {company.name} ({company.ats_provider}): {e}")
                return []
        except (httpx.HTTPError, OSError, ValueError, TypeError, KeyError) as e:
            self.db.record_company_outcome(company.id, success=False, error=str(e))
            self._last_company_ok[company.id] = False
            logger.error(f"Error fetching jobs for {company.name} ({company.ats_provider}): {e}")
            return []

        processed: list[ProcessedJob] = []

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

            now_utc = datetime.now(UTC)

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

    async def run(self, strict_24h: bool = True, concurrency: int = 10) -> dict[str, Any]:
        companies = self.load_companies()
        open_circuits = self.db.get_open_circuit_company_ids()
        run_id = self.db.start_ingestion_run(companies_checked=len(companies))
        logger.info(f"Loaded {len(companies)} active companies from registry (open circuits skipped: {len(open_circuits)}).")

        start_time = datetime.now(UTC)
        all_new_jobs: list[ProcessedJob] = []

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

        adapter_stats: dict[str, dict[str, Any]] = {}
        ok_companies = 0
        err_companies = 0

        async with httpx.AsyncClient(timeout=12.0, limits=limits, headers=headers) as client:
            async def worker(comp: Company):
                nonlocal ok_companies, err_companies
                if comp.health_status == "unreachable" or comp.id in open_circuits:
                    return []
                provider = comp.ats_provider
                bucket = adapter_stats.setdefault(provider, {"checked": 0, "ok": 0, "errors": 0, "jobs": 0})
                bucket["checked"] += 1
                async with semaphore:
                    try:
                        jobs = await self.collect_from_company(comp, client, strict_24h=strict_24h)
                        if self._last_company_ok.get(comp.id, True):
                            bucket["ok"] += 1
                            ok_companies += 1
                        else:
                            bucket["errors"] += 1
                            err_companies += 1
                        bucket["jobs"] += len(jobs)
                        if jobs:
                            logger.info(f"[{comp.name}] Found {len(jobs)} new engineering jobs.")
                        return jobs
                    except (httpx.HTTPError, OSError, ValueError, TypeError, KeyError) as e:
                        bucket["errors"] += 1
                        err_companies += 1
                        logger.debug(f"[{comp.name}] Collection exception: {e}")
                        return []

            tasks = [worker(c) for c in companies]
            results = await asyncio.gather(*tasks)
            for res in results:
                all_new_jobs.extend(res)

        saved_count = self.db.save_processed_jobs(all_new_jobs)
        self.db.refresh_freshness_and_prune()
        duration = (datetime.now(UTC) - start_time).total_seconds()

        fresh_count = sum(1 for j in all_new_jobs if j.is_fresh_24h)
        total_attempted = max(1, ok_companies + err_companies)
        success_rate = round(ok_companies / total_attempted, 4)

        core_providers = {"greenhouse", "lever", "ashby", "workday", "smartrecruiters", "eightfold", "oracle"}
        schema_drift_suspected = [
            prov for prov, st in adapter_stats.items()
            if prov in core_providers and st["checked"] >= 5 and st["ok"] == 0
        ]
        slo_status = (
            "BREACHED"
            if (success_rate < 0.80 or duration > 600 or schema_drift_suspected)
            else ("DEGRADED" if (success_rate < 0.90 or duration > 300) else "HEALTHY")
        )
        observability = {
            "slo_status": slo_status,
            "success_rate": success_rate,
            "duration_seconds": round(duration, 2),
            "schema_drift_suspected": schema_drift_suspected,
            "adapter_health": adapter_stats,
        }

        self.db.finish_ingestion_run(
            run_id=run_id,
            raw_jobs_found=len(all_new_jobs),
            new_jobs_saved=saved_count,
            fresh_24h_jobs=fresh_count,
            duration_seconds=duration,
            status="completed",
            observability=observability,
        )

        logger.info(
            f"Run #{run_id} completed in {duration:.2f}s. Scanned: {len(companies)} companies "
            f"(skipped circuits: {len(open_circuits)}, SLO: {slo_status} @ {success_rate:.1%}). "
            f"New Jobs: {saved_count}. Fresh (24h): {fresh_count}."
        )

        return {
            "run_id": run_id,
            "companies_scanned": len(companies),
            "circuits_skipped": len(open_circuits),
            "new_jobs_saved": saved_count,
            "fresh_24h_jobs": fresh_count,
            "duration_seconds": round(duration, 2),
            "slo_status": slo_status,
            "success_rate": success_rate,
            "schema_drift_suspected": schema_drift_suspected,
        }
