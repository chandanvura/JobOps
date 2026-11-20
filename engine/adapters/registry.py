from typing import Dict, Optional
from engine.adapters.base import BaseATS
from engine.adapters.greenhouse import GreenhouseAdapter
from engine.adapters.lever import LeverAdapter
from engine.adapters.ashby import AshbyAdapter
from engine.adapters.smartrecruiters import SmartRecruitersAdapter
from engine.adapters.workday import WorkdayAdapter
from engine.adapters.recruitee import RecruiteeAdapter
from engine.adapters.bamboohr import BambooHRAdapter
from engine.adapters.jobvite import JobviteAdapter
from engine.adapters.oracle import OracleAdapter
from engine.adapters.custom import CustomAdapter

_greenhouse = GreenhouseAdapter()
_lever = LeverAdapter()
_ashby = AshbyAdapter()
_smartrecruiters = SmartRecruitersAdapter()
_workday = WorkdayAdapter()
_recruitee = RecruiteeAdapter()
_bamboohr = BambooHRAdapter()
_jobvite = JobviteAdapter()
_oracle = OracleAdapter()
_custom = CustomAdapter()

ADAPTER_REGISTRY: Dict[str, BaseATS] = {
    "greenhouse": _greenhouse,
    "lever": _lever,
    "ashby": _ashby,
    "smartrecruiters": _smartrecruiters,
    "workday": _workday,
    "workday_complete": _workday,
    "workday_all": _workday,
    "recruitee": _recruitee,
    "bamboohr": _bamboohr,
    "jobvite": _jobvite,
    "xml": _jobvite,
    "oracle": _oracle,
    "custom": _custom,
}


def get_adapter(ats_provider: str) -> Optional[BaseATS]:
    """Returns the adapter instance for the specified ATS provider or alias."""
    return ADAPTER_REGISTRY.get(ats_provider.strip().lower(), _custom)
