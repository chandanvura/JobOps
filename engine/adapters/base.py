from abc import ABC, abstractmethod
from typing import List
import httpx
import re
from engine.models import Company, RawJob


def sanitize_text(text: str, strip_boilerplate: bool = False) -> str:
    """Recursively decodes HTML entities, strips tags/brackets, and normalizes spaces."""
    if not text:
        return ""
    import html as html_lib
    curr = text
    for _ in range(5):
        prev = curr
        curr = html_lib.unescape(curr)
        if curr == prev:
            break
    curr = re.sub(r"<[^>]+>", " ", curr)
    curr = re.sub(r"<[a-zA-Z/][^>]*", " ", curr)
    curr = re.sub(r"&[a-zA-Z0-9#]+;?", " ", curr)
    curr = re.sub(r"[<>]", " ", curr)
    if strip_boilerplate:
        curr = re.sub(
            r"^[\s\S]*?(?:content-intro|company-intro)[\s\S]*?(?:Summary|Overview|Role|Responsibilities|About the Role|About the Job|Position Overview|Job Description):?\s*",
            "",
            curr,
            flags=re.I,
        )
    return re.sub(r"\s+", " ", curr).strip()


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
        return sanitize_text(html_text)
