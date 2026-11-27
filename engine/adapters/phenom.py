import logging
from urllib.parse import urlparse

import httpx

from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob

logger = logging.getLogger("JobOpsPhenom")


class PhenomAdapter(BaseATS):
    """
    Adapter for employers hosted on Phenom (e.g. Abbott, Merck, Philips, Siemens Healthineers).
    Queries the official /widgets search endpoint using refNum.
    """
    provider_name = "phenom"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> list[RawJob]:
        if not company.careers_url:
            return []

        parsed = urlparse(company.careers_url)
        base_origin = f"{parsed.scheme}://{parsed.netloc}"
        widget_endpoint = f"{base_origin}/widgets"

        ref_num = company.ats_identifier

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "Referer": company.careers_url,
        }

        payload = {
            "ddoKey": "refineSearch",
            "country": "us",
            "lang": "en",
            "locale": "en_us",
            "deviceType": "desktop",
            "refNum": ref_num,
            "from": 0,
            "size": 50,
            "keywords": "",
            "selected_fields": {"country": ["India", "IND", "INDIA", "IN"]},
            "all_fields": [],
            "jobs": True,
            "counts": True,
            "pageName": "search-results",
            "siteType": "external",
        }

        raw_jobs = []
        try:
            res = await client.post(widget_endpoint, json=payload, headers=headers, timeout=20.0)
            if res.status_code == 200:
                data = res.json().get("refineSearch", {})
                jobs_list = data.get("data", {}).get("jobs", [])
                for item in jobs_list:
                    job_id = str(item.get("jobId") or item.get("jobSeqNo") or "").strip()
                    title = item.get("title") or ""
                    if not job_id or not title:
                        continue

                    loc = item.get("cityStateCountry") or item.get("location") or "India"
                    job_url = item.get("applyUrl") or item.get("url") or f"{base_origin}/job/{job_id}"
                    posted_at = parse_datetime(item.get("postedDate"))
                    desc_raw = item.get("description") or ""

                    raw_jobs.append(
                        RawJob(
                            external_id=job_id,
                            company_id=company.id,
                            company_name=company.name,
                            ats_provider=self.provider_name,
                            title=title,
                            job_url=job_url,
                            location_raw=loc,
                            description_text=self.clean_html(desc_raw),
                            description_html=desc_raw,
                            posted_at=posted_at,
                        )
                    )
        except (httpx.HTTPError, OSError, ValueError, TypeError, KeyError) as e:
            logger.error(f"Error fetching Phenom jobs for {company.name}: {e}")

        return raw_jobs
