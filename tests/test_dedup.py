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


def test_seen_registry():
    reg = SeenJobsRegistry()
    assert not reg.is_seen("job_abc")
    reg.mark_seen("job_abc")
    assert reg.is_seen("job_abc")
    assert reg.count() == 1


def test_freshness_gate():
    now = datetime.now(timezone.utc)

    # 4 hours ago -> within 24h
    four_h_ago = now - timedelta(hours=4)
    is_fresh, age = evaluate_freshness(four_h_ago, max_hours=24.0)
    assert is_fresh is True
    assert 3.9 <= age <= 4.1

    # 36 hours ago -> outside 24h
    thirty_six_ago = now - timedelta(hours=36)
    is_fresh, age = evaluate_freshness(thirty_six_ago, max_hours=24.0)
    assert is_fresh is False
    assert 35.9 <= age <= 36.1


def test_parse_datetime_relative():
    dt = parse_datetime("3 hours ago")
    assert dt is not None
    assert (datetime.now(timezone.utc) - dt).total_seconds() < 4 * 3600
