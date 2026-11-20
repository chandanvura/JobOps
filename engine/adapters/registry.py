from typing import Dict, Optional
from engine.adapters.base import BaseATS
from engine.adapters.greenhouse import GreenhouseAdapter
from engine.adapters.lever import LeverAdapter
from engine.adapters.ashby import AshbyAdapter
from engine.adapters.smartrecruiters import SmartRecruitersAdapter
from engine.adapters.workday import WorkdayAdapter
from engine.adapters.recruitee import RecruiteeAdapter
from engine.adapters.bamboohr import BambooHRAdapter


ADAPTER_REGISTRY: Dict[str, BaseATS] = {
    "greenhouse": GreenhouseAdapter(),
    "lever": LeverAdapter(),
    "ashby": AshbyAdapter(),
    "smartrecruiters": SmartRecruitersAdapter(),
    "workday": WorkdayAdapter(),
    "recruitee": RecruiteeAdapter(),
    "bamboohr": BambooHRAdapter(),
}


def get_adapter(ats_provider: str) -> Optional[BaseATS]:
    """Returns the adapter instance for the specified ATS provider."""
    return ADAPTER_REGISTRY.get(ats_provider.strip().lower())
