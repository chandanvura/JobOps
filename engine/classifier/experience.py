import re

# Word-to-number mapping for spelled-out years in job descriptions
WORD_NUMS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "twelve": 12,
    "fifteen": 15,
}

WORD_NUMS_PATTERN = r"(?:\d+|" + "|".join(WORD_NUMS.keys()) + r")"


def _parse_num(val: str) -> int | None:
    val = val.strip().lower()
    if val.isdigit():
        return int(val)
    return WORD_NUMS.get(val)


def extract_experience(title: str, description: str = "") -> tuple[int | None, int | None, str]:
    """
    Extracts experience requirements in years (min, max, label).
    Deeply analyzes title seniority, corporate leveling tokens (I, II, III, IV, Senior, Lead, Staff),
    and semantic context patterns across job descriptions.
    """
    clean_title = title.lower().strip()
    clean_desc = (description or "")[:4000].lower()
    full_text = f"{clean_title} {clean_desc}"

    # 1. Early-Career / Fresher Title Overrides
    if re.search(r"\b(intern|internship|trainee|fresher|graduate engineer|apprentice|campus|college)\b", clean_title):
        return 0, 1, "Fresher / 0-1 yr"

    # 2. Executive / High Leadership Overrides
    if re.search(r"\b(director|vp|vice president|head of|fellow|chief architect|partner)\b", clean_title):
        return 8, None, "5+ yrs"

    if re.search(r"\b(principal|staff|lead|architect|distinguished|engineering manager|tech lead|em\b)\b", clean_title):
        return 5, None, "5+ yrs"

    # 3. Deep Contextual JD Parsing for Explicit Experience Requirements
    # Pattern A: "X to Y years", "X - Y years", "X-Y yrs"
    range_match = re.search(
        rf"(?:experience|relevant experience|work experience)?\s*(?:of)?\s*({WORD_NUMS_PATTERN})\s*(?:-|to)\s*({WORD_NUMS_PATTERN})\s*(?:\+)?\s*(?:years?|yrs?)",
        full_text,
    )
    if range_match:
        mn = _parse_num(range_match.group(1))
        mx = _parse_num(range_match.group(2))
        if mn is not None and mx is not None and mn <= mx <= 30:
            return mn, mx, _format_level(mn, mx)

    # Pattern B: "minimum of X years", "at least X+ years", "X+ years of hands-on experience"
    min_match = re.search(
        rf"(?:at least|minimum|min\.?|more than|over)?\s*({WORD_NUMS_PATTERN})\s*(?:\+)?\s*(?:years?|yrs?)\s*(?:of)?\s*(?:relevant|hands-on|industry|software|technical|professional|engineering)?\s*(?:experience|background)",
        full_text,
    )
    if min_match:
        mn = _parse_num(min_match.group(1))
        if mn is not None and mn <= 25:
            return mn, None, _format_level(mn, None)

    # Pattern C: "Requires X+ years", "Should have X years"
    req_match = re.search(
        rf"(?:require[sd]?|looking for|possess(?:es)?|with)\s*({WORD_NUMS_PATTERN})\s*(?:\+)?\s*(?:years?|yrs?)",
        full_text,
    )
    if req_match:
        mn = _parse_num(req_match.group(1))
        if mn is not None and mn <= 25:
            return mn, None, _format_level(mn, None)

    # 4. Standard Corporate Engineering Band Leveling in Title
    # Level 4 / 5 / Senior Staff (5+ yrs)
    if re.search(r"\b(sde[- ]?(?:4|iv)\b|engineer[- ]?(?:4|iv)\b|mts[- ]?(?:4|iv)\b|ic[- ]?(?:5|6)\b|level[- ]?(?:5|6)\b)\b", clean_title):
        return 6, None, "5+ yrs"

    # Senior / Level 3 (3-5 yrs)
    if re.search(r"\b(senior|sr\.?|sde[- ]?(?:3|iii)\b|engineer[- ]?(?:3|iii)\b|mts[- ]?(?:3|iii)\b|specialist|expert|ic[- ]?4\b|level[- ]?4\b)\b", clean_title):
        return 4, None, "3-5 yrs"

    # Intermediate / Level 2 (1-3 yrs)
    if re.search(r"\b(sde[- ]?(?:2|ii)\b|engineer[- ]?(?:2|ii)\b|mts[- ]?(?:2|ii)\b|ic[- ]?3\b|level[- ]?3\b|mid[- ]?level|mid[- ]?senior)\b", clean_title):
        return 2, 4, "1-3 yrs"

    # Junior / Level 1 / Associate (0-2 yrs)
    if re.search(r"\b(junior|jr\.?|associate|entry level|sde[- ]?(?:1|i)\b|engineer[- ]?(?:1|i)\b|mts[- ]?(?:1|i)\b|ic[- ]?(?:1|2)\b|level[- ]?(?:1|2)\b|assoc\b)\b", clean_title):
        return 0, 2, "0-2 yrs"

    # General open-level engineering roles (Defaults to Early / Intermediate 1-3 yrs)
    if re.search(r"\b(software engineer|developer|programmer|coder|qa engineer|devops engineer|cloud engineer|sre|ai engineer|systems engineer|infrastructure engineer|data engineer|support engineer|mechanical engineer|design engineer|test engineer)\b", clean_title):
        return 1, 3, "1-3 yrs"

    return None, None, "Any Experience"


def _format_level(min_y: int | None, max_y: int | None) -> str:
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
