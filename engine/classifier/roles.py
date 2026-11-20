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

        check_order = [
            ("ai_ml", RoleCategory.AI_ML, "AI / Machine Learning"),
            ("devops_cloud", RoleCategory.DEVOPS_SRE, "DevOps / SRE / Cloud"),
            ("data_eng", RoleCategory.DATA_ENGINEERING, "Data Engineering"),
            ("mobile", RoleCategory.MOBILE, "Mobile Engineering"),
            ("security", RoleCategory.SECURITY, "Security Engineering"),
            ("qa_sdet", RoleCategory.QA_SDET, "QA / SDET"),
            ("embedded_iot", RoleCategory.SYSTEMS_EMBEDDED, "Systems / Embedded"),
            ("frontend", RoleCategory.FRONTEND, "Frontend Engineering"),
            ("backend", RoleCategory.BACKEND, "Backend Engineering"),
            ("fullstack", RoleCategory.FULLSTACK, "Full Stack Engineering"),
        ]

        for cat_key, role_enum, default_label in check_order:
            cat_cfg = self.rules.get(cat_key, {})
            patterns = cat_cfg.get("patterns", [])
            negatives = cat_cfg.get("negative", [])

            if any(neg in clean_title for neg in negatives):
                continue

            for pat in patterns:
                if re.search(pat, clean_title, re.IGNORECASE):
                    return role_enum, cat_cfg.get("label", default_label)

        # Check description snippet if title is generic
        desc_sample = description[:1000].lower()
        for cat_key, role_enum, default_label in check_order:
            cat_cfg = self.rules.get(cat_key, {})
            patterns = cat_cfg.get("patterns", [])
            for pat in patterns:
                if re.search(pat, desc_sample, re.IGNORECASE):
                    return role_enum, cat_cfg.get("label", default_label)

        return RoleCategory.SOFTWARE_GENERAL, "Software Engineering"
