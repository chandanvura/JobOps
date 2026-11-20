from typing import List
import httpx
from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob


class AshbyAdapter(BaseATS):
    provider_name = "ashby"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> List[RawJob]:
        org_id = company.ats_identifier.strip()
        url = f"https://api.ashbyhq.com/posting-api/job-board/{org_id}?includeCompensation=true"

        response = await client.get(url, timeout=20.0)
        if response.status_code != 200:
            return []

        data = response.json()
        jobs_list = data.get("jobs", [])
        results: List[RawJob] = []

        for item in jobs_list:
            if item.get("isListed") is False:
                continue

            job_id = str(item.get("id"))
            title = item.get("title", "").strip()
            if not title:
                continue

            loc_name = item.get("locationName", "")
            raw_desc = item.get("descriptionHtml", "")
            clean_desc = self.clean_html(raw_desc) or item.get("descriptionPlain", "")

            posted_at = parse_datetime(item.get("publishedAt"))
            job_url = item.get("jobUrl") or f"https://jobs.ashbyhq.com/{org_id}/{job_id}"

            results.append(
                RawJob(
                    external_id=job_id,
                    company_id=company.id,
                    company_name=company.name,
                    ats_provider=self.provider_name,
                    title=title,
                    job_url=job_url,
                    location_raw=loc_name,
                    description_text=clean_desc,
                    description_html=raw_desc,
                    posted_at=posted_at,
                    raw_payload={"department": item.get("departmentName")},
                )
            )

        return results
