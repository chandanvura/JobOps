import re
from typing import Optional, Tuple


def extract_experience(title: str, description: str = "") -> Tuple[Optional[int], Optional[int], str]:
    """
    Extracts experience requirements in years (min, max, label).
    Analyzes title seniority tokens and context-aware patterns in JD text.
    """
    clean_title = title.lower().strip()

    # 1. Title seniority overrides
    if re.search(r"\b(intern|internship|trainee|fresher|graduate engineer|apprentice)\b", clean_title):
        return 0, 1, "Fresher / 0-1 yr"

    if re.search(r"\b(junior|jr\.?|associate|entry level|sde[- ]?1|sde[- ]?i\b|engineer[- ]?1|mts[- ]?1)\b", clean_title):
        return 0, 2, "0-2 yrs"

    if re.search(r"\b(lead|principal|staff|director|head|vp|architect)\b", clean_title):
        return 5, None, "5+ yrs"

    # 2. Search description for explicit experience statements
    # Focus on the first 3000 chars where requirements are usually listed
    text = f"{clean_title} {description[:3000]}".lower()

    # Pattern: "X to Y years", "X - Y years", "X-Y yrs"
    range_match = re.search(
        r"(?:experience|relevant experience|work experience)?\s*(?:of)?\s*(\d+)\s*(?:-|to)\s*(\d+)\s*(?:\+)?\s*(?:years?|yrs?)",
        text,
    )
    if range_match:
        mn, mx = int(range_match.group(1)), int(range_match.group(2))
        return mn, mx, _format_level(mn, mx)

    # Pattern: "X+ years", "at least X years", "minimum X years", "X years of experience"
    min_match = re.search(
        r"(?:at least|minimum|min\.?|more than)?\s*(\d+)\s*(?:\+)?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:relevant|hands-on|industry|software)?\s*(?:experience)",
        text,
    )
    if min_match:
        mn = int(min_match.group(1))
        return mn, None, _format_level(mn, None)

    # Pattern: "Senior SDE" in title implies 3-5+ years
    if re.search(r"\b(senior|sr\.?|sde[- ]?3|sde[- ]?iii\b|mts[- ]?3)\b", clean_title):
        return 4, None, "3-5 yrs"

    if re.search(r"\b(sde[- ]?2|sde[- ]?ii\b|engineer[- ]?2|mts[- ]?2)\b", clean_title):
        return 2, 4, "1-3 yrs"

    return None, None, "Any Experience"


def _format_level(min_y: Optional[int], max_y: Optional[int]) -> str:
    if min_y is None and max_y is None:
        return "Any Experience"
    if min_y == 0 and (max_y is None or max_y <= 1):
        return "Fresher / 0-1 yr"
    if min_y is not None and min_y <= 2 and (max_y is None or max_y <= 3):
        return "1-3 yrs"
    if min_y is not None and 3 <= min_y <= 5:
        return "3-5 yrs"
    if min_y is not None and min_y > 5:
        return "5+ yrs"
    return f"{min_y or 0}-{max_y or '+' } yrs"
