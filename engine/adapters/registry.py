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
from engine.adapters.eightfold import EightfoldAdapter
from engine.adapters.phenom import PhenomAdapter
from engine.adapters.darwinbox import DarwinboxAdapter
from engine.adapters.amazon import AmazonAdapter
from engine.adapters.platforms import GenericPlatformAdapter

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
_eightfold = EightfoldAdapter()
_phenom = PhenomAdapter()
_darwinbox = DarwinboxAdapter()
_amazon = AmazonAdapter()

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
    "eightfold": _eightfold,
    "eightfold_legacy": _eightfold,
    "eightfold_complete": _eightfold,
    "phenom": _phenom,
    "darwinbox": _darwinbox,
    "amazon": _amazon,
    "talentbrew": GenericPlatformAdapter("talentbrew"),
    "jibe": GenericPlatformAdapter("jibe"),
    "workable": GenericPlatformAdapter("workable"),
    "turbohire": GenericPlatformAdapter("turbohire"),
    "keka": GenericPlatformAdapter("keka"),
    "mynexthire": GenericPlatformAdapter("mynexthire"),
    "kula": GenericPlatformAdapter("kula"),
    "google_careers": GenericPlatformAdapter("google_careers"),
    "accenture": GenericPlatformAdapter("accenture"),
    "ibm": GenericPlatformAdapter("ibm"),
    "icims": GenericPlatformAdapter("icims"),
    "successfactors": GenericPlatformAdapter("successfactors"),
    "infineon": GenericPlatformAdapter("infineon"),
    "infosys": GenericPlatformAdapter("infosys"),
    "kissflow": GenericPlatformAdapter("kissflow"),
    "netapp": GenericPlatformAdapter("netapp"),
    "thoughtspot": GenericPlatformAdapter("thoughtspot"),
    "zerodha": GenericPlatformAdapter("zerodha"),
    "deel": GenericPlatformAdapter("deel"),
    "adidas": GenericPlatformAdapter("adidas"),
    "cgi_njoyn": GenericPlatformAdapter("cgi_njoyn"),
    "pyjamahr": GenericPlatformAdapter("pyjamahr"),
    "juspay": GenericPlatformAdapter("juspay"),
    "avature": GenericPlatformAdapter("avature"),
    "paylocity": GenericPlatformAdapter("paylocity"),
}


def get_adapter(ats_provider: str) -> Optional[BaseATS]:
    """Returns the adapter instance for the specified ATS provider or alias."""
    provider_key = ats_provider.strip().lower()
    return ADAPTER_REGISTRY.get(provider_key, _custom)
