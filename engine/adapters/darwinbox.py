import asyncio
import json
import logging
import urllib.request
from urllib.parse import urlparse

import httpx

from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob

logger = logging.getLogger("JobOpsDarwinbox")


class DarwinboxAdapter(BaseATS):
    """
    Adapter for employers on Darwinbox (e.g. Moneyview, Swiggy, Rapido, Porter, PharmEasy).
    Queries the official candidate API: https://{subdomain}.darwinbox.in/ms/candidateapi/job/alljobs.
    """
    provider_name = "darwinbox"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> list[RawJob]:
        parts = company.ats_identifier.split("|")
        subdomain = parts[0].strip()
        if not subdomain:
            hostname = urlparse(company.careers_url).hostname or ""
            subdomain = hostname.split(".")[0] if ".darwinbox.in" in hostname else company.id

        api_url = f"https://{subdomain}.darwinbox.in/ms/candidateapi/job/alljobs"
        payload = json.dumps({"page": 1, "limit": 100}).encode("utf-8")

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "Origin": f"https://{subdomain}.darwinbox.in",
            "Referer": f"https://{subdomain}.darwinbox.in/ms/candidate/careers",
        }

        # Run urllib in threadpool to avoid event loop block and bypass HTTP/2 header blocks
        def _fetch_sync():
            req = urllib.request.Request(api_url, data=payload, headers=headers)
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read().decode("utf-8"))

        loop = asyncio.get_running_loop()
        try:
            data = await loop.run_in_executor(None, _fetch_sync)
        except (OSError, ValueError, TypeError, KeyError) as e:
            logger.warning(f"Darwinbox candidate API failed for {company.name}: {e}")
            return []

        raw_items = data.get("data") if isinstance(data, dict) else []
        if not isinstance(raw_items, list):
            return []

        raw_jobs = []
        for item in raw_items:
            if not isinstance(item, dict):
                continue

            job_id = str(item.get("id") or item.get("_id") or item.get("internal_job_code") or "").strip()
            title = str(item.get("title") or item.get("designation_display_name") or "").strip()
            if not job_id or not title:
                continue

            loc_raw = item.get("officelocation_show_arr") or item.get("locations") or "India"
            loc_str = ", ".join(loc_raw) if isinstance(loc_raw, list) else str(loc_raw)

            job_url = f"https://{subdomain}.darwinbox.in/ms/candidate/careers/{job_id}"
            posted_val = item.get("created_on") or item.get("posted_on") or item.get("timestamp")
            posted_at = parse_datetime(posted_val)

            desc_raw = item.get("jd") or item.get("description") or item.get("jd_summary") or ""

            raw_jobs.append(
                RawJob(
                    external_id=job_id,
                    company_id=company.id,
                    company_name=company.name,
                    ats_provider=self.provider_name,
                    title=title,
                    job_url=job_url,
                    location_raw=loc_str,
                    description_text=self.clean_html(desc_raw),
                    description_html=desc_raw,
                    posted_at=posted_at,
                )
            )

        return raw_jobs
