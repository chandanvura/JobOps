import json
import re
from pathlib import Path
from typing import Tuple
from engine.models import RoleCategory

CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "roles.json"


class RoleClassifier:
    """Classifies job titles and descriptions into standard engineering categories."""

    def __init__(self):
        self.rules = {}
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.rules = data.get("categories", {})

    def classify(self, title: str, description: str = "") -> Tuple[RoleCategory, str]:
        """
        Returns (RoleCategory, readable_label).
        Prioritizes specific technical domains over general titles.
        """
        clean_title = title.lower().strip()

        # Check priority order: AI/ML -> DevOps -> Data -> Mobile -> Security -> QA -> Embedded -> Frontend -> Backend -> Fullstack
        check_order = [
            ("ai_ml", RoleCategory.AI_ML),
            ("devops_cloud", RoleCategory.DEVOPS_CLOUD),
            ("data_eng", RoleCategory.DATA_ENG),
            ("mobile", RoleCategory.MOBILE),
            ("security", RoleCategory.SECURITY),
            ("qa_sdet", RoleCategory.QA_SDET),
            ("embedded_iot", RoleCategory.EMBEDDED_IOT),
            ("frontend", RoleCategory.FRONTEND),
            ("backend", RoleCategory.BACKEND),
            ("fullstack", RoleCategory.FULLSTACK),
        ]

        for cat_key, role_enum in check_order:
            cat_cfg = self.rules.get(cat_key, {})
            patterns = cat_cfg.get("patterns", [])
            negatives = cat_cfg.get("negative", [])

            # Skip if negative keyword present in title
            if any(neg in clean_title for neg in negatives):
                continue

            for pat in patterns:
                if re.search(pat, clean_title, re.IGNORECASE):
                    return role_enum, cat_cfg.get("label", role_enum.value.replace("_", " ").title())

        # Check description snippet if title is generic
        desc_sample = description[:1000].lower()
        for cat_key, role_enum in check_order:
            cat_cfg = self.rules.get(cat_key, {})
            patterns = cat_cfg.get("patterns", [])
            for pat in patterns:
                if re.search(pat, desc_sample, re.IGNORECASE):
                    return role_enum, cat_cfg.get("label", role_enum.value.replace("_", " ").title())

        return RoleCategory.ENGINEERING_GENERAL, "Software Engineering"
