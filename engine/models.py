from datetime import UTC, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class WorkMode(str, Enum):
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"
    UNKNOWN = "unknown"


class RoleCategory(str, Enum):
    BACKEND = "backend"
    FRONTEND = "frontend"
    FULLSTACK = "fullstack"
    DEVOPS_SRE = "devops_sre"
    AI_ML = "ai_ml"
    DATA_ENGINEERING = "data_engineering"
    MOBILE = "mobile"
    QA_SDET = "qa_sdet"
    SECURITY = "security"
    SYSTEMS_EMBEDDED = "systems_embedded"
    SOFTWARE_GENERAL = "software_general"
    NON_TECH = "non_tech"


class Company(BaseModel):
    id: str
    name: str
    ats_provider: str
    ats_identifier: str
    careers_url: str | None = None
    priority: int = 1
    tier: str | None = "Growth Tech"
    enabled: bool = True
    health_status: str | None = "healthy"
    tags: list[str] = Field(default_factory=list)


class RawJob(BaseModel):
    external_id: str
    company_id: str
    company_name: str
    ats_provider: str
    title: str
    job_url: str
    location_raw: str = ""
    description_text: str = ""
    description_html: str | None = ""
    posted_at: datetime | None = None
    raw_payload: dict[str, Any] | None = None


class ProcessedJob(BaseModel):
    id: str  # Deterministic SHA256(company_id + ":" + ats_provider + ":" + external_id)
    external_id: str
    company_id: str
    company_name: str
    ats_provider: str
    title: str
    job_url: str

    # Classification & Segregation
    is_engineering: bool = True
    role_category: RoleCategory = RoleCategory.SOFTWARE_GENERAL
    role_label: str = "Software Engineering"

    # Location & Mode
    location_raw: str = ""
    city: str = "Other-India"
    work_mode: WorkMode = WorkMode.UNKNOWN
    is_india: bool = True

    # Experience
    min_years: float | None = None
    max_years: float | None = None
    experience_level: str = "Any Experience"

    # Skills & Tech stack
    skills: list[str] = Field(default_factory=list)

    # Freshness & Timestamps
    posted_at: datetime | None = None
    age_hours: float = 0.0
    is_fresh_24h: bool = True
    first_seen_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_seen_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    is_active: bool = True

    # UI snippet
    summary: str = ""
