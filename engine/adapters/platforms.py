import json
import logging
import re

import httpx

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

try:
    from selectolax.parser import HTMLParser
except ImportError:
    HTMLParser = None

from engine.adapters.base import BaseATS
from engine.dedup.freshness import parse_datetime
from engine.models import Company, RawJob

logger = logging.getLogger("JobOpsPlatforms")


class GenericPlatformAdapter(BaseATS):
    """
    Adapter that parses public API endpoints or JSON-LD JobPosting schemas
    from enterprise career portals (e.g. Workable, Keka, Jibe, TalentBrew, TurboHire).
    """

    def __init__(self, provider_name: str = "platform"):
        self.provider_name = provider_name

    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> list[RawJob]:
        if not company.careers_url:
            return []

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8",
        }

        # 1. Specialized API endpoints by platform provider
        if self.provider_name == "workable":
            api_url = f"https://apply.workable.com/api/v1/widget/accounts/{company.ats_identifier}"
            try:
                res = await client.get(api_url, headers=headers, timeout=20.0)
                if res.status_code == 200:
                    data = res.json()
                    jobs = []
                    for item in data.get("jobs", []):
                        job_id = str(item.get("shortcode") or item.get("id"))
                        title = item.get("title")
                        loc = item.get("city") or item.get("country") or "India"
                        job_url = item.get("url") or f"https://apply.workable.com/{company.ats_identifier}/j/{job_id}/"
                        jobs.append(
                            RawJob(
                                external_id=job_id,
                                company_id=company.id,
                                company_name=company.name,
                                ats_provider=self.provider_name,
                                title=title,
                                job_url=job_url,
                                location_raw=loc,
                                description_text=self.clean_html(item.get("description", "")),
                                description_html=item.get("description", ""),
                                posted_at=None,
                            )
                        )
                    if jobs:
                        return jobs
            except (httpx.HTTPError, OSError, ValueError, TypeError, KeyError) as e:
                logger.debug(f"Platform API attempt failed for {company.name}: {e}")

        # 2. Scrape careers URL and extract JSON-LD JobPosting schemas
        try:
            res = await client.get(company.careers_url, headers=headers, timeout=20.0, follow_redirects=True)
            if res.status_code != 200:
                return []
            html = res.text
        except (httpx.HTTPError, OSError) as e:
            logger.warning(f"Failed to fetch {company.name} ({self.provider_name}): {e}")
            return []

        # Parse JSON-LD JobPosting blocks
        raw_jobs = []
        script_texts = []

        if BeautifulSoup is not None:
            soup = BeautifulSoup(html, "html.parser")
            for tag in soup.find_all("script", type=re.compile(r"application/ld\+json", re.IGNORECASE)):
                text = tag.get_text().strip()
                if text:
                    script_texts.append(text)
        elif HTMLParser is not None:
            tree = HTMLParser(html)
            for node in tree.css('script[type*="ld+json"]'):
                text = node.text(strip=True)
                if text:
                    script_texts.append(text)
        else:
            for match in re.finditer(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE):
                text = match.group(1).strip()
                if text:
                    script_texts.append(text)

        for script_text in script_texts:
            try:
                data = json.loads(script_text)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    if item.get("@type") == "JobPosting":
                        title = item.get("title", "").strip()
                        if not title:
                            continue
                        job_id = str(item.get("identifier", {}).get("value") or item.get("jobImmediateId") or title)
                        job_url = item.get("url") or company.careers_url
                        posted_at = parse_datetime(item.get("datePosted"))
                        raw_desc = item.get("description", "")

                        loc = item.get("jobLocation", {})
                        addr = loc.get("address", {}) if isinstance(loc, dict) else {}
                        loc_str = addr.get("addressLocality", "") or addr.get("addressCountry", "") or "India"

                        raw_jobs.append(
                            RawJob(
                                external_id=job_id,
                                company_id=company.id,
                                company_name=company.name,
                                ats_provider=self.provider_name,
                                title=title,
                                job_url=job_url,
                                location_raw=loc_str,
                                description_text=self.clean_html(raw_desc),
                                description_html=raw_desc,
                                posted_at=posted_at,
                            )
                        )
            except (json.JSONDecodeError, ValueError, TypeError, KeyError) as e:
                logger.debug(f"Skipping malformed JSON-LD block for {company.name}: {e}")
                continue

        return raw_jobs
