from typing import List
from urllib.parse import urlparse
import httpx
from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob

try:
    from curl_cffi.requests import AsyncSession as CurlAsyncSession
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False


class WorkdayAdapter(BaseATS):
    provider_name = "workday"

    def _resolve_config(self, company: Company):
        parts = [p.strip() for p in company.ats_identifier.split("|") if p.strip()]
        parsed = urlparse(company.careers_url or "")
        hostname = parsed.hostname or ""

        if parts and "." in parts[0]:
            host = parts[0]
            tenant = parts[1] if len(parts) > 1 else host.split(".")[0]
            site = parts[2] if len(parts) > 2 else "careers"
            return host, tenant, site

        host = hostname or (f"{parts[0]}.wd3.myworkdayjobs.com" if parts else "")
        tenant = parts[0] if parts else (hostname.split(".")[0] if "." in hostname else "careers")
        site = parts[1] if len(parts) > 1 else "careers"
        return host, tenant, site

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> List[RawJob]:
        host, tenant, site = self._resolve_config(company)
        if not host or not tenant or not site:
            return []

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
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        }

        results: List[RawJob] = []

        try:
            # Use curl_cffi for browser TLS/JA3 impersonation to bypass Cloudflare 429
            if HAS_CURL_CFFI:
                async with CurlAsyncSession(impersonate="chrome124", timeout=20.0) as session:
                    response = await session.post(url, json=payload, headers=headers)
                    if response.status_code != 200:
                        return []
                    data = response.json()
            else:
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

                clean_path = external_path if external_path.startswith("/") else f"/{external_path}"
                job_url = f"https://{host}/en-US/{site}{clean_path}" if external_path else company.careers_url or ""

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
