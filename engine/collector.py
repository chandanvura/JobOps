"""
High-concurrency async job collector orchestrator.
Dispatches jobs across ATS adapters, runs the 24h freshness gate,
deduplicates postings, applies the ML/NLP classifier, and stores results.
"""
import asyncio
from datetime import datetime
from typing import List, Dict, Any
import httpx

from engine.models import Company, RawJob, ProcessedJob
from engine.adapters.registry import get_adapter
from engine.dedup.freshness import FreshnessGate, DedupStore
from engine.classifier.processor import JobClassifier
from engine.storage.db import JobStorage


class JobCollector:
    def __init__(self, db_path: str = "data/jobops.db", max_age_hours: float = 24.0):
        self.storage = JobStorage(db_path)
        self.freshness = FreshnessGate(max_age_hours=max_age_hours)
        self.dedup = DedupStore()
        self.classifier = JobClassifier()

    async def collect_company(self, client: httpx.AsyncClient, company: Company) -> Dict[str, Any]:
        stats = {
            "company": company.name,
            "fetched": 0,
            "fresh": 0,
            "new": 0,
            "engineering": 0,
            "errors": 0
        }
        try:
            adapter = get_adapter(company.ats_provider, client)
            raw_jobs = await adapter.fetch_jobs(company)
            stats["fetched"] = len(raw_jobs)

            for rj in raw_jobs:
                # 1. Freshness Gate (Last 24 hours only)
                is_fresh, age_hours = self.freshness.is_fresh(rj)
                if not is_fresh:
                    continue
                stats["fresh"] += 1

                # 2. Dedup Hash Check (Zero redundant writes)
                if self.dedup.has_seen(company.id, company.ats_provider, rj.external_id):
                    continue
                
                # Mark as seen
                job_hash = self.dedup.mark_seen(company.id, company.ats_provider, rj.external_id)
                stats["new"] += 1

                # 3. AI / ML Engineering Classifier & Entity Extraction
                processed = self.classifier.process(rj, job_hash, age_hours)
                if processed.is_engineering:
                    stats["engineering"] += 1

                # 4. Save to Database
                self.storage.save_job(processed)

        except Exception as e:
            stats["errors"] += 1
            stats["error_msg"] = str(e)

        return stats

    async def run(self, companies: List[Company], concurrency: int = 10) -> List[Dict[str, Any]]:
        sem = asyncio.Semaphore(concurrency)
        results = []

        headers = {
            "User-Agent": "JobOps-Engine/1.0 (Job Intelligence for India; +https://github.com/chandanvura/JobOps)",
            "Accept": "application/json, text/plain, */*"
        }

        async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
            async def bounded_collect(comp: Company):
                async with sem:
                    return await self.collect_company(client, comp)

            tasks = [bounded_collect(c) for c in companies if c.enabled]
            results = await asyncio.gather(*tasks, return_exceptions=False)

        # Save dedup cache and export static catalog
        self.dedup.save()
        self.storage.export_catalog_json()
        return results
