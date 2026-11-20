from typing import List
import httpx
from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob


class RecruiteeAdapter(BaseATS):
    provider_name = "recruitee"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> List[RawJob]:
        company_slug = company.ats_identifier.strip()
        url = f"https://api.recruitee.com/c/{company_slug}/offers"

        response = await client.get(url, timeout=20.0)
        if response.status_code != 200:
            return []

        data = response.json()
        offers = data.get("offers", [])
        results: List[RawJob] = []

        for item in offers:
            job_id = str(item.get("id"))
            title = item.get("title", "").strip()
            if not title:
                continue

            city = item.get("city", "")
            country = item.get("country", "")
            loc_str = f"{city}, {country}".strip(", ")

            raw_desc = item.get("description", "")
            clean_desc = self.clean_html(raw_desc)

            posted_at = parse_datetime(item.get("created_at"))
            job_url = item.get("careers_url") or f"https://{company_slug}.recruitee.com/o/{item.get('slug', job_id)}"

            results.append(
                RawJob(
                    external_id=job_id,
                    company_id=company.id,
                    company_name=company.name,
                    ats_provider=self.provider_name,
                    title=title,
                    job_url=job_url,
                    location_raw=loc_str,
                    description_text=clean_desc,
                    description_html=raw_desc,
                    posted_at=posted_at,
                    raw_payload={"department": item.get("department")},
                )
            )

        return results
