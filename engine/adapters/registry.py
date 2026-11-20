"""
Registry and factory for ATS adapters.
"""
from typing import Dict, Type
import httpx
from engine.adapters.base import BaseATS
from engine.adapters.greenhouse import GreenhouseAdapter
from engine.adapters.lever import LeverAdapter
from engine.adapters.ashby import AshbyAdapter
from engine.adapters.smartrecruiters import SmartRecruitersAdapter

ADAPTER_MAP: Dict[str, Type[BaseATS]] = {
    "greenhouse": GreenhouseAdapter,
    "lever": LeverAdapter,
    "ashby": AshbyAdapter,
    "smartrecruiters": SmartRecruitersAdapter,
}

def get_adapter(ats_provider: str, client: httpx.AsyncClient) -> BaseATS:
    provider = ats_provider.lower().strip()
    adapter_cls = ADAPTER_MAP.get(provider)
    if not adapter_cls:
        raise ValueError(f"Unsupported ATS provider: {ats_provider}. Supported: {list(ADAPTER_MAP.keys())}")
    return adapter_cls(client)
