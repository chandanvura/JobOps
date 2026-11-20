from datetime import datetime, timezone
from typing import List
import httpx
from engine.adapters.base import BaseATS
from engine.models import Company, RawJob


class LeverAdapter(BaseATS):
    provider_name = "lever"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> List[RawJob]:
        site_token = company.ats_identifier.strip()
        url = f"https://api.lever.co/v0/postings/{site_token}?mode=json"

        response = await client.get(url, timeout=20.0)
        if response.status_code != 200:
            return []

        postings = response.json()
        if not isinstance(postings, list):
            return []

        results: List[RawJob] = []

        for item in postings:
            job_id = str(item.get("id"))
            title = item.get("text", "").strip()
            if not title:
                continue

            cats = item.get("categories", {})
            loc_name = cats.get("location", "") if isinstance(cats, dict) else ""

            clean_desc = item.get("descriptionPlain", "")
            if not clean_desc:
                clean_desc = self.clean_html(item.get("description", ""))

            # Handle createdAt (epoch ms)
            created_at_ms = item.get("createdAt")
            posted_at = None
            if created_at_ms and isinstance(created_at_ms, (int, float)):
                posted_at = datetime.fromtimestamp(created_at_ms / 1000.0, tz=timezone.utc)

            job_url = item.get("hostedUrl") or f"https://jobs.lever.co/{site_token}/{job_id}"

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
                    description_html=item.get("description", ""),
                    posted_at=posted_at,
                    raw_payload={"categories": cats},
                )
            )

        return results
