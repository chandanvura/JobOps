
import httpx

from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob


class GreenhouseAdapter(BaseATS):
    provider_name = "greenhouse"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> list[RawJob]:
        board_token = company.ats_identifier.strip()
        url = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true"

        response = await client.get(url, timeout=20.0)
        if response.status_code != 200:
            return []

        data = response.json()
        jobs_list = data.get("jobs", [])
        results: list[RawJob] = []

        for item in jobs_list:
            job_id = str(item.get("id"))
            title = item.get("title", "").strip()
            if not title:
                continue

            loc_obj = item.get("location", {})
            loc_name = loc_obj.get("name", "") if isinstance(loc_obj, dict) else str(loc_obj)

            raw_desc = item.get("content", "")
            clean_desc = self.clean_html(raw_desc)

            posted_at = parse_datetime(item.get("updated_at"))
            job_url = item.get("absolute_url") or f"https://boards.greenhouse.io/{board_token}/jobs/{job_id}"

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
                    raw_payload={"departments": item.get("departments", [])},
                )
            )

        return results
