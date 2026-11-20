"""
Data models for JobOps ingestion, classification, and presentation.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
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
    ats_provider: str  # greenhouse, lever, ashby, smartrecruiters, workday, etc.
    ats_identifier: str  # company board token or tenant
    careers_url: Optional[str] = None
    priority: int = 1
    enabled: bool = True
    tags: List[str] = Field(default_factory=list)


class RawJob(BaseModel):
    external_id: str
    company_id: str
    company_name: str
    ats_provider: str
    title: str
    job_url: str
    location_raw: str
    description_html: Optional[str] = ""
    description_text: str = ""
    posted_at: Optional[datetime] = None
    created_at_source: Optional[datetime] = None
    raw_payload: Optional[Dict[str, Any]] = None


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
    role_subcategory: Optional[str] = None
    
    # Location & Mode
    location_raw: str
    normalized_city: str = "Other-India"  # Bengaluru, Hyderabad, Pune, Delhi-NCR, Mumbai, Chennai, Remote-India
    work_mode: WorkMode = WorkMode.UNKNOWN
    is_india: bool = True
    
    # Experience parsing
    min_years: Optional[float] = None
    max_years: Optional[float] = None
    experience_raw_evidence: Optional[str] = None
    seniority_level: str = "mid"  # fresher (0-1), early (1-3), mid (3-5), senior (5+)
    
    # Skills & Tech stack
    skills: List[str] = Field(default_factory=list)
    
    # Timestamps & Freshness
    posted_at: datetime
    age_hours: float = 0.0
    first_seen_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    
    # Clean text snippet for fast UI display (no heavy 20KB HTML payload)
    summary: str = ""
