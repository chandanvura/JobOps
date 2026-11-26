import json
from pathlib import Path
from engine.playbooks import PLAYBOOKS, PlaybookResolver
from engine.playbooks.definitions import Playbook


def test_playbook_definitions_integrity():
    """Verify that all playbooks have required fields and valid schema."""
    assert len(PLAYBOOKS) >= 6, "At least 6 core playbooks must be registered"
    
    valid_categories = {"data_quality", "runtime", "caching", "reliability", "build"}
    valid_severities = {"critical", "high", "medium", "low"}
    
    for pb_id, pb in PLAYBOOKS.items():
        assert pb.id == pb_id
        assert len(pb.name) > 5
        assert pb.category in valid_categories, f"Invalid category {pb.category} for {pb_id}"
        assert pb.severity in valid_severities, f"Invalid severity {pb.severity} for {pb_id}"
        assert len(pb.trigger_symptoms) > 0, f"Playbook {pb_id} must have trigger symptoms"
        assert pb.auto_resolvable is True, f"Playbook {pb_id} should be auto-resolvable"


def test_playbook_resolver_listing():
    """Test that PlaybookResolver.list_playbooks() returns structured records."""
    resolver = PlaybookResolver()
    playbooks = resolver.list_playbooks()
    
    assert len(playbooks) == len(PLAYBOOKS)
    for pb in playbooks:
        assert "id" in pb
        assert "name" in pb
        assert "category" in pb
        assert "severity" in pb
        assert "description" in pb
        assert "trigger_symptoms" in pb


def test_playbook_diagnose_clean_catalog():
    """Test that on a healthy production state, diagnose finds no data corruption."""
    resolver = PlaybookResolver()
    issues = resolver.diagnose()
    
    # In clean catalog, there should be no data quality issues (PB-001, PB-002)
    data_quality_issues = [i for i in issues if i.playbook_id in ("PB-001", "PB-002")]
    assert len(data_quality_issues) == 0, f"Catalog should not have uncleaned data: {data_quality_issues}"


def test_playbook_resolve_pb001_sanitizer():
    """Verify PB-001 sanitization cleans escaped HTML and unclosed tags."""
    resolver = PlaybookResolver()
    result = resolver.resolve_pb001()
    
    assert result["status"] == "resolved"
    assert result["playbook_id"] == "PB-001"
    assert "records_sanitized" in result


def test_playbook_resolve_pb002_location_normalizer():
    """Verify PB-002 normalizes Indian locations."""
    resolver = PlaybookResolver()
    result = resolver.resolve_pb002()
    
    assert result["status"] == "resolved"
    assert result["playbook_id"] == "PB-002"
    assert "locations_normalized" in result


def test_playbook_resolve_pb003_dependencies():
    """Verify PB-003 dependency checker checks requirements.txt."""
    resolver = PlaybookResolver()
    result = resolver.resolve_pb003()
    
    assert result["status"] == "resolved"
    assert result["playbook_id"] == "PB-003"
    assert "added_dependencies" in result


def test_playbook_resolve_pb004_cache_sync():
    """Verify PB-004 re-exports edge cache without truncation and keeps catalog synchronized."""
    resolver = PlaybookResolver()
    result = resolver.resolve_pb004()

    assert result["status"] == "resolved"
    assert result["playbook_id"] == "PB-004"
    assert result["exported_jobs"] > 0

    # Ensure no desync remains
    issues = [i for i in resolver.diagnose() if i.playbook_id == "PB-004"]
    assert len(issues) == 0, f"PB-004 should leave zero desync issues: {issues}"


def test_playbook_resolve_all_report():
    """Verify that resolve_all generates a valid zero-cost remediation report."""
    resolver = PlaybookResolver()
    report = resolver.resolve_all()
    
    assert "timestamp" in report
    assert "diagnosed_count" in report
    assert "resolved_count" in report
    assert "remaining_unresolved" in report
    assert "remediation_actions" in report
    assert report["system_health"] in ("100% HEALTHY", "ATTENTION_REQUIRED")


def test_db_refresh_freshness_and_prune(tmp_path):
    """Verify stale 24h flags are aged out and expired >14d jobs are deactivated."""
    from datetime import datetime, timedelta, timezone
    from engine.storage.db import JobDatabase
    from engine.models import ProcessedJob, RoleCategory, WorkMode

    db = JobDatabase(tmp_path / "test_prune.db")
    now = datetime.now(timezone.utc)
    # Clear any seeded records for isolated test
    with db._get_conn() as conn:
        conn.execute("DELETE FROM jobs")

    fresh_job = ProcessedJob(
        id="j_fresh", external_id="1", company_id="c1", company_name="Co", ats_provider="greenhouse",
        title="Backend Engineer", job_url="https://example.com/1", role_category=RoleCategory.BACKEND,
        role_label="Backend", work_mode=WorkMode.REMOTE, experience_level="1-3 yrs",
        posted_at=now - timedelta(hours=2), is_fresh_24h=True, summary="Fresh role",
    )
    aged_job = ProcessedJob(
        id="j_aged", external_id="2", company_id="c1", company_name="Co", ats_provider="greenhouse",
        title="Frontend Engineer", job_url="https://example.com/2", role_category=RoleCategory.FRONTEND,
        role_label="Frontend", work_mode=WorkMode.REMOTE, experience_level="1-3 yrs",
        posted_at=now - timedelta(days=3), is_fresh_24h=True, summary="Aged role",
    )
    expired_job = ProcessedJob(
        id="j_expired", external_id="3", company_id="c1", company_name="Co", ats_provider="greenhouse",
        title="Staff Engineer", job_url="https://example.com/3", role_category=RoleCategory.BACKEND,
        role_label="Backend", work_mode=WorkMode.ONSITE, experience_level="5+ yrs",
        posted_at=now - timedelta(days=20), is_fresh_24h=True, summary="Expired role",
    )
    db.save_processed_jobs([fresh_job, aged_job, expired_job])

    res = db.refresh_freshness_and_prune(max_age_days=14)
    assert res["pruned_stale"] == 1

    active = db.get_filtered_jobs(limit=None)
    active_map = {j["id"]: j for j in active}
    assert set(active_map.keys()) == {"j_fresh", "j_aged"}
    assert active_map["j_fresh"]["is_fresh_24h"] == 1
    assert active_map["j_aged"]["is_fresh_24h"] == 0
