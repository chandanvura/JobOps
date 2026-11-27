import logging
import re
from datetime import UTC, datetime, timedelta

logger = logging.getLogger("jobops.freshness")


def parse_datetime(dt_str: str | None) -> datetime | None:
    """Parses various date/time formats into UTC datetime."""
    if not dt_str:
        return None
    try:
        from dateutil import parser
        dt = parser.parse(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=UTC)
        return dt.astimezone(UTC)
    except (ValueError, TypeError, OverflowError) as e:
        logger.debug(f"Falling back to regex date parse for {dt_str!r}: {e}")

    # Fallback to regex for relative times
    low = str(dt_str).lower().strip()
    now = datetime.now(UTC)

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


def evaluate_freshness(posted_at: datetime | None, max_hours: float = 24.0) -> tuple[bool, float | None]:
    """
    Evaluates whether a job posting is within the freshness window (default: 24 hours).
    Returns (is_fresh, hours_ago).
    """
    if not posted_at:
        return False, None

    now = datetime.now(UTC)
    diff = (now - posted_at).total_seconds() / 3600.0

    if diff < 0:
        return True, 0.0

    rounded_diff = round(diff, 1)
    is_fresh = rounded_diff <= max_hours
    return is_fresh, rounded_diff
