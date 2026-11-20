from datetime import datetime, timezone, timedelta
from engine.dedup.fingerprint import compute_job_id, SeenJobsRegistry
from engine.dedup.freshness import evaluate_freshness, parse_datetime


def test_job_fingerprint_deterministic():
    id1 = compute_job_id("razorpay", "greenhouse", "12345")
    id2 = compute_job_id("razorpay", "greenhouse", "12345")
    id3 = compute_job_id("razorpay", "greenhouse", "99999")

    assert id1 == id2
    assert id1 != id3
    assert len(id1) == 24


def test_job_fingerprint_normalization():
    # Case insensitivity and whitespace stripping
    id_clean = compute_job_id("razorpay", "greenhouse", "12345")
    id_dirty = compute_job_id("  Razorpay  ", "  GREENHOUSE  ", " 12345 ")
    assert id_clean == id_dirty


def test_cross_provider_uniqueness():
    # Identical external_id from different providers must yield distinct digests
    id_gh = compute_job_id("uber", "greenhouse", "7890")
    id_wd = compute_job_id("uber", "workday", "7890")
    assert id_gh != id_wd


def test_seen_registry():
    reg = SeenJobsRegistry()
    assert not reg.is_seen("job_abc")
    reg.mark_seen("job_abc")
    assert reg.is_seen("job_abc")
    assert reg.count() == 1


def test_freshness_boundary_conditions():
    now = datetime.now(timezone.utc)

    # 23.9 hours ago -> within 24h
    t_23_9 = now - timedelta(hours=23.9)
    is_fresh, age = evaluate_freshness(t_23_9, max_hours=24.0)
    assert is_fresh is True
    assert 23.8 <= age <= 24.0

    # 24.0 hours ago -> exactly on boundary
    t_24_0 = now - timedelta(hours=24.0)
    is_fresh, age = evaluate_freshness(t_24_0, max_hours=24.0)
    assert is_fresh is True
    assert 23.9 <= age <= 24.1

    # 24.1 hours ago -> strictly outside 24h
    t_24_1 = now - timedelta(hours=24.1)
    is_fresh, age = evaluate_freshness(t_24_1, max_hours=24.0)
    assert is_fresh is False
    assert 24.0 <= age <= 24.2


def test_clock_skew_and_future_dates():
    now = datetime.now(timezone.utc)
    # 10 minutes in future due to server clock drift
    future_time = now + timedelta(minutes=10)
    is_fresh, age = evaluate_freshness(future_time, max_hours=24.0)
    assert is_fresh is True
    assert age == 0.0


def test_parse_datetime_multi_timezone():
    # ISO 8601 with timezone offsets
    dt_utc = parse_datetime("2026-11-20T12:00:00Z")
    dt_ist = parse_datetime("2026-11-20T17:30:00+05:30")
    assert dt_utc is not None
    assert dt_ist is not None
    assert dt_utc == dt_ist


def test_parse_datetime_relative():
    dt = parse_datetime("3 hours ago")
    assert dt is not None
    assert (datetime.now(timezone.utc) - dt).total_seconds() < 4 * 3600
