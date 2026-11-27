import json
import re
from pathlib import Path

CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "skills.json"


class SkillExtractor:
    """Extracts tech skills from title and description using exact boundary matching."""

    def __init__(self):
        self.skills_list: list[str] = []
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.skills_list = data.get("skills", [])

        # Precompile regexes for fast lookup
        self._compiled: list[tuple[str, re.Pattern]] = []
        for s in self.skills_list:
            escaped = re.escape(s)
            pattern = re.compile(rf"\b{escaped}\b", re.IGNORECASE)
            self._compiled.append((s, pattern))

    def extract(self, text: str, max_skills: int = 8) -> list[str]:
        found: set[str] = set()
        for skill_name, pattern in self._compiled:
            if pattern.search(text):
                found.add(skill_name)
                if len(found) >= max_skills:
                    break
        return sorted(found)
