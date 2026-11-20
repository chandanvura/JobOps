from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
import re


def parse_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    """Parses various date/time formats into UTC datetime."""
    if not dt_str:
        return None
    try:
        from dateutil import parser
        dt = parser.parse(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        pass

    # Fallback to regex for relative times
    low = str(dt_str).lower().strip()
    now = datetime.now(timezone.utc)

    if "today" in low or "just now" in low:
        return now

    match_hours = re.search(r"(\d+)\s*(?:hour|hr|h)s?\s*ago", low)
    if match_hours:
        hours = int(match_hours.group(1))
        return now - timedelta(hours=hours)

    match_days = re.search(r"(\d+)\s*(?:day|d)s?\s*ago", low)
    if match_days:
        days = int(match_days.group(1))
        return now - timedelta(days=days)

    return None


def evaluate_freshness(posted_at: Optional[datetime], max_hours: float = 24.0) -> Tuple[bool, Optional[float]]:
    """
    Evaluates whether a job posting is within the freshness window (default: 24 hours).
    Returns (is_fresh, hours_ago).
    """
    if not posted_at:
        return False, None

    now = datetime.now(timezone.utc)
    diff = (now - posted_at).total_seconds() / 3600.0

    if diff < 0:
        return True, 0.0

    is_fresh = diff <= max_hours
    return is_fresh, round(diff, 1)


class FreshnessGate:
    def __init__(self, max_age_hours: float = 24.0):
        self.max_age_hours = max_age_hours

    def is_fresh(self, posted_at: Optional[datetime]) -> Tuple[bool, Optional[float]]:
        return evaluate_freshness(posted_at, self.max_age_hours)
