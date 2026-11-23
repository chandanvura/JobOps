import json
import re
from typing import List
from urllib.parse import urljoin
import httpx
from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob


class CustomAdapter(BaseATS):
    """
    Crawls custom career pages, auto-detects embedded ATS providers,
    or extracts JSON-LD JobPosting schema.
    """
    provider_name = "custom"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> List[RawJob]:
        if not company.careers_url:
            return []

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

        try:
            response = await client.get(company.careers_url, headers=headers, timeout=20.0, follow_redirects=True)
            if response.status_code == 200:
                html = response.text
            else:
                html = ""
        except Exception:
            html = ""

        if not html:
            try:
                from curl_cffi.requests import AsyncSession as CurlAsyncSession
                async with CurlAsyncSession(impersonate="chrome124", verify=False, timeout=20) as c_session:
                    c_resp = await c_session.get(company.careers_url, allow_redirects=True)
                    if c_resp.status_code == 200:
                        html = c_resp.text
            except Exception:
                return []

        if not html:
            return []

        # 1. Check for embedded Greenhouse
        gh_match = re.search(r"boards(?:\.greenhouse\.io|-api\.greenhouse\.io/v1/boards)/([A-Za-z0-9_-]+)", html)
        if gh_match:
            token = gh_match.group(1)
            from engine.adapters.greenhouse import GreenhouseAdapter
            sub_comp = company.model_copy(update={"ats_identifier": token})
            return await GreenhouseAdapter().fetch_jobs(sub_comp, client)

        # 2. Check for embedded Lever
        lever_match = re.search(r"jobs\.lever\.co/([A-Za-z0-9_-]+)", html)
        if lever_match:
            token = lever_match.group(1)
            from engine.adapters.lever import LeverAdapter
            sub_comp = company.model_copy(update={"ats_identifier": token})
            return await LeverAdapter().fetch_jobs(sub_comp, client)

        # 3. Check for embedded Ashby
        ashby_match = re.search(r"jobs\.ashbyhq\.com/([A-Za-z0-9_-]+)", html)
        if ashby_match:
            token = ashby_match.group(1)
            from engine.adapters.ashby import AshbyAdapter
            sub_comp = company.model_copy(update={"ats_identifier": token})
            return await AshbyAdapter().fetch_jobs(sub_comp, client)

        # 4. Check for JSON-LD JobPosting schemas
        results: List[RawJob] = []
        json_ld_blocks = re.findall(r'<script[^>]*type=[\'"]application/ld\+json[\'"][^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE)

        for block in json_ld_blocks:
            try:
                data = json.loads(block.strip())
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if item.get("@type") == "JobPosting":
                        title = item.get("title", "").strip()
                        if not title:
                            continue
                        job_id = str(item.get("identifier", {}).get("value") or title)
                        raw_desc = item.get("description", "")
                        clean_desc = self.clean_html(raw_desc)

                        job_url = item.get("url") or company.careers_url
                        posted_at = parse_datetime(item.get("datePosted"))

                        loc = item.get("jobLocation", {})
                        address = loc.get("address", {}) if isinstance(loc, dict) else {}
                        loc_str = address.get("addressLocality", "") or address.get("addressCountry", "") or ""

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
                            )
                        )
            except Exception:
                continue

        return results
