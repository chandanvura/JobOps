from typing import List
from urllib.parse import urlparse
import httpx
from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob


class OracleAdapter(BaseATS):
    provider_name = "oracle"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> List[RawJob]:
        parts = [p.strip() for p in (company.ats_identifier or "").split("|") if p.strip()]
        parsed = urlparse(company.careers_url or "")

        if parts and "." in parts[0]:
            host = parts[0]
            site = parts[1] if len(parts) > 1 else "CX_1"
        else:
            host = parsed.hostname or "oracle.com"
            site = parts[-1] if parts else "CX_1"

        scheme = parsed.scheme or "https"
        origin = f"{scheme}://{host}"
        base_api = f"{origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitions"

        params = {
            "onlyData": "true",
            "finder": f"findReqs;siteNumber={site},limit=50,sortBy=POSTING_DATES_DESC",
            "expand": "requisitionList",
        }

        try:
            response = await client.get(base_api, params=params, timeout=20.0)
            if response.status_code != 200:
                return []

            data = response.json()
            items_arr = data.get("items", [])
            if not items_arr:
                return []

            # Requisitions are in the expanded requisitionList of the search response
            req_list = items_arr[0].get("requisitionList", [])
            items = req_list if req_list else items_arr
            results: List[RawJob] = []

            for item in items:
                job_id = str(item.get("Id") or item.get("RequisitionNumber") or "")
                title = item.get("Title", "").strip()
                if not title:
                    continue

                loc_str = item.get("PrimaryLocation", "") or item.get("PrimaryLocationCountry", "")
                raw_desc = (
                    item.get("ExternalResponsibilitiesStr", "")
                    or item.get("ExternalQualificationsStr", "")
                    or item.get("ShortDescriptionStr", "")
                )
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
