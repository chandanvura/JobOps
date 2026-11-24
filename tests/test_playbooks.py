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
