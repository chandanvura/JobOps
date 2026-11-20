"""
High-throughput 24-hour freshness gating and deterministic SHA-256 deduplication.
Ensures zero redundant network requests or database writes.
"""
import hashlib
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Set, Tuple
from engine.models import RawJob


class FreshnessGate:
    """
    Filters jobs so only postings within the designated freshness window (default: 24h)
    are processed.
    """
    def __init__(self, max_age_hours: float = 24.0):
        self.max_age_hours = max_age_hours

    def is_fresh(self, job: RawJob, now: datetime = None) -> Tuple[bool, float]:
        if not now:
            now = datetime.utcnow()
        if not job.posted_at:
            return True, 0.0
        
        delta = now - job.posted_at
        age_hours = max(0.0, delta.total_seconds() / 3600.0)
        return (age_hours <= self.max_age_hours), age_hours


class DedupStore:
    """
    Fast in-memory & file-persisted set of seen job keys.
    Key: SHA-256(company_id + ':' + ats_provider + ':' + external_id)
    """
    def __init__(self, storage_path: str = "data/seen_hashes.json"):
        self.storage_path = Path(storage_path)
        self.seen_hashes: Set[str] = set()
        self.load()

    @staticmethod
    def compute_job_hash(company_id: str, ats_provider: str, external_id: str) -> str:
        raw_key = f"{company_id.strip().lower()}:{ats_provider.strip().lower()}:{external_id.strip()}".encode("utf-8")
        return hashlib.sha256(raw_key).hexdigest()

    def has_seen(self, company_id: str, ats_provider: str, external_id: str) -> bool:
        h = self.compute_job_hash(company_id, ats_provider, external_id)
        return h in self.seen_hashes

    def mark_seen(self, company_id: str, ats_provider: str, external_id: str) -> str:
        h = self.compute_job_hash(company_id, ats_provider, external_id)
        self.seen_hashes.add(h)
        return h

    def load(self):
        if self.storage_path.exists():
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.seen_hashes = set(data)
            except Exception:
                self.seen_hashes = set()

    def save(self):
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(list(self.seen_hashes), f)
