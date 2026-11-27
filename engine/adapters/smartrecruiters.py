
import httpx

from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob


class SmartRecruitersAdapter(BaseATS):
    provider_name = "smartrecruiters"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> list[RawJob]:
        identifier = company.ats_identifier.strip()
        url = f"https://api.smartrecruiters.com/v1/companies/{identifier}/postings?limit=100"

        response = await client.get(url, timeout=20.0)
        if response.status_code != 200:
            return []

        data = response.json()
        postings = data.get("content", [])
        results: list[RawJob] = []

        for item in postings:
            job_id = str(item.get("id"))
            title = item.get("name", "").strip()
            if not title:
                continue

            loc_obj = item.get("location", {})
            city = loc_obj.get("city", "")
            country = loc_obj.get("country", "")
            loc_str = f"{city}, {country}".strip(", ")

            posted_at = parse_datetime(item.get("releasedDate"))
            job_url = f"https://jobs.smartrecruiters.com/{identifier}/{job_id}"

            dept = item.get("department", {})
            dept_name = dept.get("label", "") if isinstance(dept, dict) else ""

            results.append(
                RawJob(
                    external_id=job_id,
                    company_id=company.id,
                    company_name=company.name,
                    ats_provider=self.provider_name,
                    title=title,
                    job_url=job_url,
                    location_raw=loc_str,
                    description_text="",
                    description_html="",
                    posted_at=posted_at,
                    raw_payload={"department": dept_name},
                )
            )

        return results
