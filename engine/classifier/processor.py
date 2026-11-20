"""
JobOps NLP & Rule-Based Classifier.
Segregates Engineering vs Non-Engineering, classifies role families,
extracts YoE (Years of Experience), skills tags, and normalizes locations.
"""
import re
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from engine.models import RawJob, ProcessedJob, RoleCategory, WorkMode


class JobClassifier:
    def __init__(self, config_dir: str = "config"):
        self.config_dir = Path(config_dir)
        self.roles_cfg = self._load_json("roles.json")
        self.skills_cfg = self._load_json("skills.json")
        self.locations_cfg = self._load_json("locations.json")

    def _load_json(self, filename: str) -> Dict[str, Any]:
        p = self.config_dir / filename
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def is_engineering(self, title: str, description: str = "") -> bool:
        t = title.lower()
        non_tech_patterns = [
            r"\b(sales|account executive|bdr|sdr|business development|marketing|seo|content writer)\b",
            r"\b(recruiter|talent acquisition|hr|human resources|people operations|payroll)\b",
            r"\b(finance|accountant|financial analyst|legal|paralegal|counsel)\b",
            r"\b(customer support|customer success|operations associate|store manager)\b",
        ]
        for pattern in non_tech_patterns:
            if re.search(pattern, t):
                return False

        tech_indicators = [
            r"\b(engineer|developer|architect|devops|sre|programmer|coder)\b",
            r"\b(software|full\s?stack|backend|frontend|data|cloud|platform|machine learning|ai)\b",
            r"\b(qa|sdet|test automation|security engineer|infosec|firmware|embedded)\b"
        ]
        for pattern in tech_indicators:
            if re.search(pattern, t):
                return True
        return False

    def classify_role(self, title: str) -> RoleCategory:
        t = title.lower()
        cats = self.roles_cfg.get("categories", {})
        for cat_key, cat_data in cats.items():
            for pat in cat_data.get("patterns", []):
                if re.search(pat, t, re.IGNORECASE):
                    # Check negative words if any
                    negatives = cat_data.get("negative", [])
                    if any(neg in t for neg in negatives):
                        continue
                    try:
                        return RoleCategory(cat_key)
                    except ValueError:
                        pass
        return RoleCategory.SOFTWARE_GENERAL

    def extract_experience(self, text: str) -> Tuple[Optional[float], Optional[float], str]:
        """
        Extract min and max experience in years from JD text.
        Returns: (min_years, max_years, seniority_level)
        """
        # Look for explicit patterns: e.g. "2-5 years", "3+ years", "0-2 yrs", "minimum 3 years"
        range_match = re.search(r"(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years?|yrs?)", text, re.IGNORECASE)
        if range_match:
            min_y = float(range_match.group(1))
            max_y = float(range_match.group(2))
            level = self._seniority_from_years(min_y)
            return min_y, max_y, level

        min_match = re.search(r"(?:minimum|min|at least|\+)?\s*(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:relevant)?\s*experience", text, re.IGNORECASE)
        if min_match:
            min_y = float(min_match.group(1))
            level = self._seniority_from_years(min_y)
            return min_y, None, level

        # Check for fresher keywords in text
        if re.search(r"\b(fresher|fresh graduate|entry level|campus|intern|trainee)\b", text, re.IGNORECASE):
            return 0.0, 1.0, "fresher"

        return None, None, "mid"

    @staticmethod
    def _seniority_from_years(years: float) -> str:
        if years <= 1.0:
            return "fresher"
        elif years <= 3.0:
            return "early"
        elif years <= 6.0:
            return "mid"
        else:
            return "senior"

    def extract_skills(self, text: str) -> List[str]:
        skills_found = []
        skills_list = self.skills_cfg.get("skills", [])
        text_lower = text.lower()
        for skill_name in skills_list:
            escaped = re.escape(skill_name.lower())
            pat = rf"\b{escaped}\b"
            if re.search(pat, text_lower):
                skills_found.append(skill_name)
        return skills_found[:10]

    def normalize_location(self, loc_raw: str, text: str = "") -> Tuple[str, WorkMode, bool]:
        combined = f"{loc_raw} {text}".lower()
        is_india = False
        
        # Check India scope
        india_keywords = ["india", "bangalore", "bengaluru", "hyderabad", "pune", "delhi", "gurgaon", "noida", "mumbai", "chennai"]
        if any(k in combined for k in india_keywords):
            is_india = True
        
        # Work mode
        mode = WorkMode.UNKNOWN
        if "remote" in combined or "work from home" in combined:
            mode = WorkMode.REMOTE
        elif "hybrid" in combined:
            mode = WorkMode.HYBRID
        elif any(k in combined for k in ["onsite", "in-office", "office"]):
            mode = WorkMode.ONSITE

        # City determination
        if "bangalore" in combined or "bengaluru" in combined:
            return "Bengaluru", mode, is_india
        elif "hyderabad" in combined:
            return "Hyderabad", mode, is_india
        elif "pune" in combined:
            return "Pune", mode, is_india
        elif any(k in combined for k in ["gurgaon", "noida", "delhi"]):
            return "Delhi-NCR", mode, is_india
        elif "mumbai" in combined:
            return "Mumbai", mode, is_india
        elif "chennai" in combined:
            return "Chennai", mode, is_india
        elif mode == WorkMode.REMOTE:
            return "Remote-India", mode, is_india
        
        return "Other-India", mode, is_india

    def process(self, raw_job: RawJob, job_hash: str, age_hours: float) -> ProcessedJob:
        full_text = f"{raw_job.title} {raw_job.location_raw} {raw_job.description_text}"
        
        is_eng = self.is_engineering(raw_job.title, raw_job.description_text)
        role = self.classify_role(raw_job.title) if is_eng else RoleCategory.NON_TECH
        min_y, max_y, seniority = self.extract_experience(full_text)
        skills = self.extract_skills(full_text)
        city, mode, is_india = self.normalize_location(raw_job.location_raw, raw_job.description_text)
        
        # Short clean summary snippet (max 300 chars)
        summary = (raw_job.description_text[:300] + "...") if len(raw_job.description_text) > 300 else raw_job.description_text

        return ProcessedJob(
            id=job_hash,
            external_id=raw_job.external_id,
            company_id=raw_job.company_id,
            company_name=raw_job.company_name,
            ats_provider=raw_job.ats_provider,
            title=raw_job.title,
            job_url=raw_job.job_url,
            is_engineering=is_eng,
            role_category=role,
            location_raw=raw_job.location_raw,
            normalized_city=city,
            work_mode=mode,
            is_india=is_india,
            min_years=min_y,
            max_years=max_y,
            seniority_level=seniority,
            skills=skills,
            posted_at=raw_job.posted_at,
            age_hours=age_hours,
            summary=summary
        )
