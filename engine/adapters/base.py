from abc import ABC, abstractmethod
from typing import List
import httpx
import re
from engine.models import Company, RawJob


class BaseATS(ABC):
    """Abstract Base Class for all ATS Adapters."""

    provider_name: str = "base"

    @abstractmethod
    async def fetch_jobs(self, company: Company, client: httpx.AsyncClient) -> List[RawJob]:
        """Fetches raw jobs from the target company ATS endpoint."""
        pass

    @staticmethod
    def clean_html(html_text: str) -> str:
        """Strips HTML tags and normalizes whitespace."""
        if not html_text:
            return ""
        try:
            from selectolax.parser import HTMLParser
            tree = HTMLParser(html_text)
            text = tree.text(separator=" ", strip=True)
            return re.sub(r"\s+", " ", text).strip()
        except Exception:
            # Fallback regex
            clean = re.sub(r"<[^>]+>", " ", html_text)
            return re.sub(r"\s+", " ", clean).strip()
