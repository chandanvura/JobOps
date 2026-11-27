import re

NON_TECH_PATTERNS = [
    r"\b(account executive|business development|sales executive|sales manager|bdr|sdr)\b",
    r"\b(talent acquisition|human resources|hr executive|hr recruiter|hrbp|recruiter)\b",
    r"\b(marketing manager|social media|content writer|seo specialist|copywriter)\b",
    r"\b(legal counsel|compliance officer|paralegal|attorney)\b",
    r"\b(accountant|finance manager|payroll executive|financial analyst)\b",
    r"\b(customer support|customer care|bpo|telecaller|call center|helpdesk agent)\b",
    r"\b(warehouse associate|supply chain executive|logistics coordinator)\b",
    r"\b(office assistant|receptionist|front desk|executive assistant)\b",
    r"\b(nurse|physician|doctor|pharmacist|medical officer)\b",
]

TECH_POSITIVE_PATTERNS = [
    r"\b(software|developer|engineer|architect|sde|mts|programmer)\b",
    r"\b(devops|sre|cloud|infrastructure|platform|reliability)\b",
    r"\b(frontend|backend|fullstack|full-stack|full stack|web development)\b",
    r"\b(ai|ml|machine learning|deep learning|data scientist|data engineer|nlp|computer vision)\b",
    r"\b(qa|sdet|test automation|quality assurance)\b",
    r"\b(security engineer|infosec|appsec|cybersecurity)\b",
    r"\b(mobile developer|android|ios|flutter|react native)\b",
    r"\b(firmware|embedded|rtos|iot|hardware engineer)\b",
    r"\b(technical lead|tech lead|engineering manager|vp of engineering|cto)\b",
    r"\b(java|python|golang|go|c\+\+|rust|node|react|angular|vue|aws|azure|gcp|docker|kubernetes)\b",
]


def is_engineering_job(title: str, description: str = "") -> bool:
    """
    Two-stage segregation:
    1. Checks if title matches strong non-tech indicators.
    2. Verifies positive engineering indicators in title or description.
    """
    clean_title = title.lower().strip()

    # If title strongly matches non-tech and doesn't contain tech overrides
    for pattern in NON_TECH_PATTERNS:
        if re.search(pattern, clean_title, re.IGNORECASE) and not re.search(
            r"\b(engineer|developer|architect|sde)\b", clean_title
        ):
            return False

    # Check positive tech indicators
    for pattern in TECH_POSITIVE_PATTERNS:
        if re.search(pattern, clean_title, re.IGNORECASE):
            return True

    # If title is generic (e.g. "Graduate Trainee", "Associate"), check description snippet
    desc_sample = description[:1500].lower()
    for pattern in TECH_POSITIVE_PATTERNS:
        if re.search(pattern, desc_sample, re.IGNORECASE):
            return True

    return False
