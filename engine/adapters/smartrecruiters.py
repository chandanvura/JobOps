"""
SmartRecruiters Public Postings API Adapter.
Public endpoint: https://api.smartrecruiters.com/v1/companies/{company}/postings
"""
from datetime import datetime
from typing import List
from dateutil import parser as dt_parser
from engine.adapters.base import BaseATS
from engine.models import Company, RawJob


class SmartRecruitersAdapter(BaseATS):
    BASE_URL = "https://api.smartrecruiters.com/v1/companies/{company}/postings?limit=100"

    async def fetch_jobs(self, company: Company) -> List[RawJob]:
        url = self.BASE_URL.format(company=company.ats_identifier)
        try:
            resp = await self.client.get(url, timeout=15.0)
            if resp.status_code != 200:
                return []
            data = resp.json()
        except Exception:
            return []

        jobs: List[RawJob] = []
        raw_jobs = data.get("content", [])

        for item in raw_jobs:
            ext_id = str(item.get("id"))
            title = (item.get("name") or "").strip()
            job_url = f"https://jobs.smartrecruiters.com/{company.ats_identifier}/{ext_id}"
            
            loc_obj = item.get("location") or {}
            city = loc_obj.get("city") or ""
            country = loc_obj.get("country") or ""
            loc_name = f"{city}, {country}".strip(", ")

            released_date_str = item.get("releasedDate")
            posted_at = datetime.utcnow()
            if released_date_str:
                try:
                    posted_at = dt_parser.parse(released_date_str).replace(tzinfo=None)
                except Exception:
                    pass

            jobs.append(RawJob(
                external_id=ext_id,
                company_id=company.id,
                company_name=company.name,
                ats_provider="smartrecruiters",
                title=title,
                job_url=job_url,
                location_raw=loc_name,
                description_html="",
                description_text="",
                posted_at=posted_at,
                raw_payload={"id": ext_id}
            ))

        return jobs
