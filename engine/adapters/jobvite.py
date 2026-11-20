import re
from typing import List
import xml.etree.ElementTree as ET
import httpx
from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob


class JobviteAdapter(BaseATS):
    provider_name = "jobvite"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> List[RawJob]:
        identifier = company.ats_identifier.strip()
        feed_url = f"https://app.jobvite.com/CompanyJobs/Xml.aspx?c={identifier}"

        try:
            response = await client.get(feed_url, timeout=20.0)
            if response.status_code != 200:
                # Try landing page to get companyEId
                page_url = f"https://jobs.jobvite.com/{identifier}"
                page_resp = await client.get(page_url, timeout=15.0)
                match = re.search(r"companyEId\s*[:=]\s*['\"]([A-Za-z0-9_-]+)['\"]", page_resp.text)
                if match:
                    feed_url = f"https://app.jobvite.com/CompanyJobs/Xml.aspx?c={match.group(1)}"
                    response = await client.get(feed_url, timeout=20.0)

            if response.status_code != 200:
                return []

            root = ET.fromstring(response.text)
            results: List[RawJob] = []

            for item in root.findall(".//job"):
                job_id = item.findtext("id") or item.findtext("requisitionId") or ""
                title = item.findtext("title") or ""
                if not title or not job_id:
                    continue

                raw_desc = item.findtext("description") or ""
                clean_desc = self.clean_html(raw_desc)
                loc_str = item.findtext("location") or item.findtext("city") or ""
                posted_str = item.findtext("date") or ""
                posted_at = parse_datetime(posted_str)
                job_url = item.findtext("detail-url") or f"https://jobs.jobvite.com/{identifier}/job/{job_id}"

                results.append(
                    RawJob(
                        external_id=job_id,
                        company_id=company.id,
                        company_name=company.name,
                        ats_provider=self.provider_name,
                        title=title.strip(),
                        job_url=job_url,
                        location_raw=loc_str.strip(),
                        description_text=clean_desc,
                        description_html=raw_desc,
                        posted_at=posted_at,
                    )
                )

            return results
        except Exception:
            return []
