import pytest
from datetime import datetime, timezone
from engine.collector import JobCollector
from engine.models import Company, RawJob
from engine.storage.db import JobDatabase


class FailingAdapter:
    async def fetch_jobs(self, company, client):
        raise ConnectionResetError("Remote server closed connection unexpectedly")


class SuccessfulAdapter:
    def __init__(self, jobs):
        self.jobs = jobs

    async def fetch_jobs(self, company, client):
        return self.jobs


@pytest.mark.asyncio
async def test_partial_source_failure_resilience(tmp_path):
    """Verify that when one ATS source crashes, the collector still saves jobs from other sources."""
    import httpx
    collector = JobCollector(db=JobDatabase(tmp_path / "resilience.db"))

    failing_co = Company(
        id="failing_co",
        name="Failing Co",
        ats_provider="custom_failing",
        ats_identifier="failing",
    )
    success_co = Company(
        id="success_co",
        name="Success Co",
        ats_provider="custom_success",
        ats_identifier="success",
    )

    valid_raw_job = RawJob(
        company_id="success_co",
        company_name="Success Co",
        ats_provider="custom_success",
        external_id="ext_999",
        title="Senior Backend Engineer",
        job_url="https://example.com/job/999",
        location_raw="Bengaluru, India",
        description_text="Building distributed Golang microservices and PostgreSQL systems.",
        posted_at=datetime.now(timezone.utc),
    )

    import engine.adapters.registry
    engine.adapters.registry.ADAPTER_REGISTRY["custom_failing"] = FailingAdapter()
    engine.adapters.registry.ADAPTER_REGISTRY["custom_success"] = SuccessfulAdapter([valid_raw_job])

    async with httpx.AsyncClient() as client:
        # Failing source should return empty list gracefully without crashing
        failing_jobs = await collector.collect_from_company(failing_co, client)
        assert failing_jobs == []

        # Successful source should process and extract normalized job
        success_jobs = await collector.collect_from_company(success_co, client)
        assert len(success_jobs) == 1
        job = success_jobs[0]
        assert job.company_name == "Success Co"
        assert job.role_category == "backend"
        assert job.city == "Bengaluru"
        assert job.is_india is True
        assert job.is_engineering is True


@pytest.mark.asyncio
async def test_malformed_source_data_handling(tmp_path):
    """Verify that raw jobs with messy/missing fields and dirty HTML are safely normalized."""
    import httpx
    collector = JobCollector(db=JobDatabase(tmp_path / "malformed.db"))
    co = Company(
        id="messy_co",
        name="Messy Co",
        ats_provider="custom_messy",
        ats_identifier="messy",
    )

    dirty_raw_job = RawJob(
        company_id="messy_co",
        company_name="Messy Co",
        ats_provider="custom_messy",
        external_id="ext_dirty_1",
        title="&lt;span&gt;Full Stack Developer&lt;/span&gt;",
        job_url="https://example.com/job/dirty",
        location_raw="Other-India (Remote / Work from home)",
        description_text="<div class='role-desc'><p>Looking for a React and Node engineer. &amp;quot;High ownership&amp;quot;.</p></div>",
    )

    import engine.adapters.registry
    engine.adapters.registry.ADAPTER_REGISTRY["custom_messy"] = SuccessfulAdapter([dirty_raw_job])

    async with httpx.AsyncClient() as client:
        jobs = await collector.collect_from_company(co, client)
        assert len(jobs) == 1
        j = jobs[0]
        # Title must be cleaned
        assert "<span" not in j.title
        assert "&lt;" not in j.title
        assert "Full Stack Developer" in j.title
        # Summary must not have unclosed html tags
        assert "<div" not in j.summary
        assert "<p" not in j.summary
        assert "&quot;" not in j.summary
        # Location and work mode must be normalized
        assert j.work_mode == "remote"
        assert j.city in ["India", "Remote"] or j.city != "Other-India"
