import logging
from typing import List
import httpx
from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob

try:
    from curl_cffi.requests import AsyncSession as CurlSession
except ImportError:
    CurlSession = None

logger = logging.getLogger("JobOpsEightfold")


class EightfoldAdapter(BaseATS):
    """
    Adapter for Eightfold career portals (e.g. Microsoft, Qualcomm, Morgan Stanley, PayPal).
    Visits the career homepage to establish session cookies, then queries the PCSX search API.
    """
    provider_name = "eightfold"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> List[RawJob]:
        parts = company.ats_identifier.split("|")
        host = parts[0].strip()
        domain = parts[1].strip() if len(parts) > 1 else host

        base_url = f"https://{host}"
        careers_url = company.careers_url or f"{base_url}/careers"

        # Use curl_cffi for Cloudflare TLS session establishment if available
        if CurlSession is not None:
            try:
                async with CurlSession(impersonate="chrome124", timeout=25.0) as session:
                    # 1. Establish session cookies
                    await session.get(careers_url)
                    # 2. Query PCSX search API
                    api_url = f"{base_url}/api/pcsx/search"
                    params = {
                        "domain": domain,
                        "location": "India",
                        "start": 0,
                        "sort_by": "relevance",
                    }
                    res = await session.get(api_url, params=params)
                    if res.status_code == 200:
                        data = res.json().get("data", {})
                        positions = data.get("positions", [])
                        return self._parse_positions(positions, company, base_url, domain)
            except Exception as e:
                logger.warning(f"Eightfold curl_cffi failed for {company.name}: {e}")

        # Fallback to standard httpx
        try:
            await client.get(careers_url, headers={"User-Agent": "Mozilla/5.0"})
            api_url = f"{base_url}/api/pcsx/search"
            params = {
                "domain": domain,
                "location": "India",
                "start": 0,
                "sort_by": "relevance",
            }
            res = await client.get(api_url, params=params, headers={"User-Agent": "Mozilla/5.0"})
            if res.status_code == 200:
                data = res.json().get("data", {})
                positions = data.get("positions", [])
                return self._parse_positions(positions, company, base_url, domain)
        except Exception as e:
            logger.error(f"Error fetching Eightfold jobs for {company.name}: {e}")

        return []

    def _parse_positions(self, positions: list, company: Company, base_url: str, domain: str = "") -> List[RawJob]:
        raw_jobs = []
        for pos in positions:
            if not isinstance(pos, dict):
                continue
            job_id = str(pos.get("id") or pos.get("atsJobId") or "").strip()
            title = pos.get("name") or pos.get("title") or ""
            if not job_id or not title:
                continue

            locations = pos.get("locations") or pos.get("standardizedLocations") or []
            loc_str = ", ".join(locations) if isinstance(locations, list) else str(locations)

            pos_url = pos.get("positionUrl")
            if pos_url:
                job_url = f"{base_url}{pos_url}" if pos_url.startswith("/") else pos_url
                if domain and "domain=" not in job_url:
                    sep = "&" if "?" in job_url else "?"
                    job_url += f"{sep}domain={domain}"
            else:
                job_url = pos.get("canonicalUrl") or pos.get("job_url") or f"{base_url}/careers/job/{job_id}"
                if domain and "domain=" not in job_url:
                    sep = "&" if "?" in job_url else "?"
                    job_url += f"{sep}domain={domain}"
            posted_ts = pos.get("postedTs")
            posted_at = None
            if posted_ts:
                try:
                    posted_at = parse_datetime(posted_ts)
                except Exception:
                    pass

            desc_raw = pos.get("jobDescription") or pos.get("description") or ""
            clean_desc = self.clean_html(desc_raw)

            raw_jobs.append(
                RawJob(
                    external_id=job_id,
                    company_id=company.id,
                    company_name=company.name,
                    ats_provider=self.provider_name,
                    title=title,
                    job_url=job_url,
                    location_raw=loc_str,
                    description_text=clean_desc,
                    description_html=desc_raw,
                    posted_at=posted_at,
                )
            )
        return raw_jobs
