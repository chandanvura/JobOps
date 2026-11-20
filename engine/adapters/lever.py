"""
Lever Public Postings API Adapter.
Public endpoint: https://api.lever.co/v0/postings/{company}?mode=json
"""
from datetime import datetime
from typing import List
from engine.adapters.base import BaseATS
from engine.models import Company, RawJob


class LeverAdapter(BaseATS):
    BASE_URL = "https://api.lever.co/v0/postings/{company}?mode=json"

    async def fetch_jobs(self, company: Company) -> List[RawJob]:
        url = self.BASE_URL.format(company=company.ats_identifier)
        try:
            resp = await self.client.get(url, timeout=15.0)
            if resp.status_code != 200:
                return []
            items = resp.json()
            if not isinstance(items, list):
                return []
        except Exception:
            return []

        jobs: List[RawJob] = []

        for item in items:
            ext_id = str(item.get("id"))
            title = (item.get("text") or "").strip()
            job_url = item.get("hostedUrl") or item.get("applyUrl") or ""
            
            categories = item.get("categories") or {}
            loc_name = categories.get("location") or ""
            commitment = categories.get("commitment") or ""
            
            # Plain text description
            desc_plain = item.get("descriptionPlain") or ""
            desc_html = item.get("description") or ""

            # Created timestamp (in milliseconds epoch)
            created_at_ms = item.get("createdAt")
            posted_at = datetime.utcnow()
            if created_at_ms:
                try:
                    posted_at = datetime.utcfromtimestamp(created_at_ms / 1000.0)
                except Exception:
                    pass

            jobs.append(RawJob(
                external_id=ext_id,
                company_id=company.id,
                company_name=company.name,
                ats_provider="lever",
                title=title,
                job_url=job_url,
                location_raw=f"{loc_name} {commitment}".strip(),
                description_html=desc_html,
                description_text=desc_plain,
                posted_at=posted_at,
                raw_payload={"id": ext_id}
            ))

        return jobs
