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
        """Strips HTML tags and normalizes whitespace, properly decoding entities."""
        if not html_text:
            return ""
        import html as html_lib
        # Recursively unescape to handle double-encoded entities like &amp;lt;div...
        text = html_lib.unescape(html_text)
        if "&amp;" in text or "&lt;" in text or "&gt;" in text or "&quot;" in text:
            text = html_lib.unescape(text)

        try:
            from selectolax.parser import HTMLParser
            tree = HTMLParser(text)
            clean = tree.text(separator=" ", strip=True)
            return re.sub(r"\s+", " ", clean).strip()
        except Exception:
            # Fallback regex
            clean = re.sub(r"<[^>]+>", " ", text)
            return re.sub(r"\s+", " ", clean).strip()
