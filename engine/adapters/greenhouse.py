"""
Greenhouse Public Boards API Adapter.
Public endpoint: https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
"""
from datetime import datetime
from typing import List
from dateutil import parser as dt_parser
from selectolax.lexbor import LexborHTMLParser as HTMLParser
from engine.adapters.base import BaseATS
from engine.models import Company, RawJob


class GreenhouseAdapter(BaseATS):
    BASE_URL = "https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"

    async def fetch_jobs(self, company: Company) -> List[RawJob]:
        url = self.BASE_URL.format(token=company.ats_identifier)
        try:
            resp = await self.client.get(url, timeout=15.0)
            if resp.status_code != 200:
                return []
            data = resp.json()
        except Exception:
            return []

        jobs: List[RawJob] = []
        raw_jobs = data.get("jobs", [])

        for item in raw_jobs:
            ext_id = str(item.get("id"))
            title = (item.get("title") or "").strip()
            job_url = item.get("absolute_url") or ""
            
            # Location
            loc_obj = item.get("location") or {}
            loc_name = loc_obj.get("name") or ""
            
            # Content / description
            content_html = item.get("content") or ""
            text_desc = ""
            if content_html:
                tree = HTMLParser(content_html)
                text_desc = tree.text(separator=" ").strip()

            # Date parsing
            updated_at_str = item.get("updated_at")
            posted_at = None
            if updated_at_str:
                try:
                    posted_at = dt_parser.parse(updated_at_str).replace(tzinfo=None)
                except Exception:
                    posted_at = datetime.utcnow()
            else:
                posted_at = datetime.utcnow()

            jobs.append(RawJob(
                external_id=ext_id,
                company_id=company.id,
                company_name=company.name,
                ats_provider="greenhouse",
                title=title,
                job_url=job_url,
                location_raw=loc_name,
                description_html=content_html,
                description_text=text_desc,
                posted_at=posted_at,
                raw_payload={"id": ext_id}
            ))

        return jobs
