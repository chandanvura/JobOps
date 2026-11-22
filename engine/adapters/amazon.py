import logging
from typing import List
import httpx
from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob

logger = logging.getLogger("JobOpsAmazon")


class AmazonAdapter(BaseATS):
    """
    Adapter for Amazon.jobs public API scoped to Indian tech hubs.
    Endpoint: https://www.amazon.jobs/en/search.json
    """
    provider_name = "amazon"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> List[RawJob]:
        api_url = "https://www.amazon.jobs/en/search.json"
        params = [
            ("country", "IND"),
            ("category[]", "software-development"),
            ("category[]", "systems-quality-engineering"),
            ("category[]", "operations-it-support-engineering"),
            ("category[]", "data-science"),
            ("result_limit", "100"),
            ("sort", "recent"),
        ]
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/json",
        }

        raw_jobs = []
        try:
            res = await client.get(api_url, params=params, headers=headers, timeout=25.0)
            if res.status_code == 200:
                data = res.json()
                for item in data.get("jobs", []):
                    job_id = str(item.get("id") or item.get("id_icims") or "").strip()
                    title = item.get("title") or ""
                    if not job_id or not title:
                        continue

                    city = item.get("city") or "India"
                    job_path = item.get("job_path") or f"/en/jobs/{job_id}"
                    job_url = f"https://www.amazon.jobs{job_path}"

                    posted_at = parse_datetime(item.get("posted_date"))
                    desc_raw = f"{item.get('description', '')}\n\n{item.get('basic_qualifications', '')}"

                    raw_jobs.append(
                        RawJob(
                            external_id=job_id,
                            company_id=company.id,
                            company_name=company.name,
                            ats_provider=self.provider_name,
                            title=title,
                            job_url=job_url,
                            location_raw=city,
                            description_text=self.clean_html(desc_raw),
                            description_html=desc_raw,
                            posted_at=posted_at,
                        )
                    )
        except Exception as e:
            logger.error(f"Error fetching Amazon jobs: {e}")

        return raw_jobs
