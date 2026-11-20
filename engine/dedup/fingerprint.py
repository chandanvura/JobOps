import hashlib
from typing import Set


def compute_job_id(company_id: str, ats_provider: str, external_id: str) -> str:
    """
    Generates a deterministic SHA256 hex digest for a job posting.
    Ensures that identical jobs from the same company and ATS provider have a stable ID.
    """
    raw_key = f"{company_id.strip().lower()}:{ats_provider.strip().lower()}:{str(external_id).strip()}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:24]


class SeenJobsRegistry:
    """
    In-memory Bloom/Set filter of previously ingested jobs.
    Prevents redundant processing, re-fetching of details, and duplicate DB writes.
    """

    def __init__(self, initial_ids: Set[str] | None = None):
        self._seen: Set[str] = set(initial_ids or [])

    def is_seen(self, job_id: str) -> bool:
        return job_id in self._seen

    def mark_seen(self, job_id: str) -> None:
        self._seen.add(job_id)

    def count(self) -> int:
        return len(self._seen)

    def all_ids(self) -> Set[str]:
        return set(self._seen)
