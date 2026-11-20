"""
Ashby Public Job Board API Adapter.
Public endpoint: https://api.ashbyhq.com/posting-api/job-board/{organizationId}
"""
from datetime import datetime
from typing import List
from dateutil import parser as dt_parser
from selectolax.lexbor import LexborHTMLParser as HTMLParser
from engine.adapters.base import BaseATS
from engine.models import Company, RawJob


class AshbyAdapter(BaseATS):
    BASE_URL = "https://api.ashbyhq.com/posting-api/job-board/{orgId}"

    async def fetch_jobs(self, company: Company) -> List[RawJob]:
        url = self.BASE_URL.format(orgId=company.ats_identifier)
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
            job_url = item.get("jobUrl") or item.get("applyUrl") or ""
            
            loc_name = item.get("location") or ""
            secondary_locs = item.get("secondaryLocations") or []
            if secondary_locs:
                loc_name += " " + " ".join(secondary_locs)

            desc_html = item.get("descriptionHtml") or item.get("descriptionPlain") or ""
            text_desc = ""
            if desc_html:
                tree = HTMLParser(desc_html)
                text_desc = tree.text(separator=" ").strip()

            published_at_str = item.get("publishedAt")
            posted_at = datetime.utcnow()
            if published_at_str:
                try:
                    posted_at = dt_parser.parse(published_at_str).replace(tzinfo=None)
                except Exception:
                    pass

            jobs.append(RawJob(
                external_id=ext_id,
                company_id=company.id,
                company_name=company.name,
                ats_provider="ashby",
                title=title,
                job_url=job_url,
                location_raw=loc_name,
                description_html=desc_html,
                description_text=text_desc,
                posted_at=posted_at,
                raw_payload={"id": ext_id}
            ))

        return jobs
