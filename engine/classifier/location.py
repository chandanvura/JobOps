import json
import re
from pathlib import Path

from engine.models import WorkMode

CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "locations.json"


class LocationNormalizer:
    """Normalizes location strings into standard Indian tech hubs and detects work mode."""

    def __init__(self):
        self.cities = {}
        self.country_tokens = ["india", "in", "bharat"]
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.cities = data.get("cities", {})
                self.country_tokens = data.get("country_tokens", self.country_tokens)

    def normalize(self, raw_location: str | None, title: str = "", description: str = "") -> tuple[str | None, bool, WorkMode]:
        """
        Returns (city_name, is_india, work_mode).
        """
        safe_raw = (raw_location or "").strip()
        combined = f"{safe_raw} {title} {description[:500]}".lower()

        # 1. Determine Work Mode
        mode = WorkMode.ONSITE
        if re.search(r"\b(remote|work from home|wfh|anywhere)\b", combined):
            mode = WorkMode.REMOTE
        elif re.search(r"\b(hybrid|flexible)\b", combined):
            mode = WorkMode.HYBRID

        # 2. Match City
        detected_city = None
        for city_label, aliases in self.cities.items():
            for alias in aliases:
                # Use word boundary or exact substring check
                if re.search(rf"\b{re.escape(alias)}\b", combined):
                    detected_city = city_label
                    break
            if detected_city:
                break

        # 3. Determine if India-relevant
        is_india = False
        if detected_city:
            is_india = True
        else:
            for token in self.country_tokens:
                if re.search(rf"\b{re.escape(token)}\b", safe_raw.lower()):
                    is_india = True
                    break

        return detected_city, is_india, mode
