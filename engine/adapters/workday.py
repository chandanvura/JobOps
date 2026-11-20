from typing import List
import httpx
from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob


class WorkdayAdapter(BaseATS):
    provider_name = "workday"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> List[RawJob]:
        parts = company.ats_identifier.split("|")
        if len(parts) != 3:
            return []

        host, tenant, site = parts[0].strip(), parts[1].strip(), parts[2].strip()
        url = f"https://{host}/wday/cxs/{tenant}/{site}/jobs"

        payload = {
            "appliedFacets": {},
            "limit": 20,
            "offset": 0,
            "searchText": "",
        }

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

        results: List[RawJob] = []

        try:
            response = await client.post(url, json=payload, headers=headers, timeout=20.0)
            if response.status_code != 200:
                return []

            data = response.json()
            postings = data.get("jobPostings", [])

            for item in postings:
                title = item.get("title", "").strip()
                if not title:
                    continue

                external_path = item.get("externalPath", "")
                job_id = external_path.strip("/").split("/")[-1] if external_path else title

                loc_str = item.get("locationsText", "")
                posted_str = item.get("postedOn", "")
                posted_at = parse_datetime(posted_str)

                job_url = f"https://{host}/en-US/{tenant}/{site}{external_path}" if external_path else company.careers_url or ""

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
                        raw_payload={"bulletFields": item.get("bulletFields", [])},
                    )
                )
        except Exception:
            return []

        return results
