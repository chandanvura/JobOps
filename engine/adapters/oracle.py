from typing import List
from urllib.parse import urlparse
import httpx
from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob


class OracleAdapter(BaseATS):
    provider_name = "oracle"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> List[RawJob]:
        parsed = urlparse(company.careers_url or "")
        origin = f"{parsed.scheme}://{parsed.hostname}" if parsed.hostname else "https://oracle.com"
        site = company.ats_identifier or "CX_1"
        base_api = f"{origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitions"

        params = {
            "onlyData": "true",
            "finder": f"findReqs;siteNumber={site},limit=50,sortBy=POSTING_DATES_DESC",
        }

        try:
            response = await client.get(base_api, params=params, timeout=20.0)
            if response.status_code != 200:
                return []

            data = response.json()
            items = data.get("items", [])
            results: List[RawJob] = []

            for item in items:
                job_id = str(item.get("Id") or item.get("RequisitionNumber") or "")
                title = item.get("Title", "").strip()
                if not title:
                    continue

                loc_str = item.get("PrimaryLocation", "")
                raw_desc = item.get("ExternalDescriptionStr", "")
                clean_desc = self.clean_html(raw_desc)
                posted_at = parse_datetime(item.get("PostedDate"))
                job_url = f"{origin}/hcmUI/CandidateExperience/en/sites/{site}/job/{job_id}"

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

            return results
        except Exception:
            return []
