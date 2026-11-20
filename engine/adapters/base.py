"""
Base ATS abstract class with standardized async fetching, rate-limiting, and error-resilience.
"""
from abc import ABC, abstractmethod
from typing import List
import httpx
from engine.models import Company, RawJob


class BaseATS(ABC):
    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    @abstractmethod
    async def fetch_jobs(self, company: Company) -> List[RawJob]:
        """
        Fetch all candidate jobs from the ATS for the specified company.
        Implementations should:
        1. Fetch using standard JSON/REST endpoints.
        2. Filter out non-India locations early if supported by the API.
        3. Convert results into RawJob objects.
        """
        pass
