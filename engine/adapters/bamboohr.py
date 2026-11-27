
import httpx

from engine.adapters.base import BaseATS
from engine.models import Company, RawJob


class BambooHRAdapter(BaseATS):
    provider_name = "bamboohr"

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> list[RawJob]:
        subdomain = company.ats_identifier.strip()
        url = f"https://{subdomain}.bamboohr.com/careers/list"

        headers = {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

        try:
            response = await client.get(url, headers=headers, timeout=20.0)
            if response.status_code != 200:
                return []

            data = response.json()
            jobs_list = data.get("result", [])
            results: list[RawJob] = []

            for item in jobs_list:
                job_id = str(item.get("id"))
                title = item.get("jobOpeningName", "").strip()
                if not title:
                    continue

                loc_obj = item.get("location", {})
                city = loc_obj.get("city", "") if isinstance(loc_obj, dict) else ""
                country = loc_obj.get("country", "") if isinstance(loc_obj, dict) else ""
                loc_str = f"{city}, {country}".strip(", ")

                job_url = f"https://{subdomain}.bamboohr.com/careers/{job_id}"

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
                        posted_at=None,
                        raw_payload={"department": item.get("department")},
                    )
                )

            return results
        except (httpx.HTTPError, OSError, ValueError, TypeError, KeyError):
            return []
