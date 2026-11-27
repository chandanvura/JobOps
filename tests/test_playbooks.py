import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from engine.models import ProcessedJob, RoleCategory, WorkMode
from engine.playbooks import PLAYBOOKS, PlaybookResolver
from engine.storage.db import JobDatabase


def _make_isolated_repo(tmp_path: Path) -> PlaybookResolver:
    """Create a hermetic synthetic repo structure in tmp_path so tests never mutate production files."""
    (tmp_path / "web" / "public").mkdir(parents=True, exist_ok=True)
    (tmp_path / "web" / "dist").mkdir(parents=True, exist_ok=True)
    (tmp_path / "web" / "dist" / "index.html").write_text("<html></html>", encoding="utf-8")
    (tmp_path / "data").mkdir(parents=True, exist_ok=True)
    (tmp_path / "requirements.txt").write_text(
        "beautifulsoup4>=4.12.0\nhttpx>=0.28.0\nselectolax>=0.3.21\npytest>=8.0.0\npydantic>=2.0.0\n",
        encoding="utf-8",
    )

    db = JobDatabase(tmp_path / "data" / "jobops.db")
    now = datetime.now(timezone.utc)
    sample_job = ProcessedJob(
        id="pb_test_1",
        external_id="ext_1",
        company_id="testco",
        company_name="TestCo",
        ats_provider="greenhouse",
        title="Backend Engineer",
        job_url="https://example.com/jobs/1",
        role_category=RoleCategory.BACKEND,
        role_label="Backend Engineering",
        location_raw="Bengaluru, India",
        city="Bengaluru",
        work_mode=WorkMode.HYBRID,
        experience_level="1-3 yrs",
        posted_at=now - timedelta(hours=3),
        is_fresh_24h=True,
        summary="Build scalable Python & Go services.",
    )
    db.save_processed_jobs([sample_job])
    jobs = db.get_filtered_jobs(limit=None)
    (tmp_path / "web" / "public" / "jobs.json").write_text(
        json.dumps(jobs, separators=(",", ":")), encoding="utf-8"
    )
    return PlaybookResolver(repo_root=tmp_path)


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
    """Test that on the production catalog, diagnose finds no HTML or location corruption."""
    resolver = PlaybookResolver()
    issues = resolver.diagnose()

    data_quality_issues = [i for i in issues if i.playbook_id in ("PB-001", "PB-002")]
    assert len(data_quality_issues) == 0, f"Catalog should not have uncleaned data: {data_quality_issues}"


def test_playbook_resolve_pb001_sanitizer(tmp_path):
    """Verify PB-001 sanitization cleans escaped HTML and unclosed tags in an isolated repo."""
    resolver = _make_isolated_repo(tmp_path)
    dirty = json.loads(resolver.jobs_json_path.read_text(encoding="utf-8"))
    dirty[0]["summary"] = "<div class='x'>Hello &amp;quot;World&amp;quot;</div>"
    resolver.jobs_json_path.write_text(json.dumps(dirty), encoding="utf-8")

    result = resolver.resolve_pb001()
    assert result["status"] == "resolved"
    assert result["playbook_id"] == "PB-001"
    assert result["records_sanitized"] == 1
    assert not any(i.playbook_id == "PB-001" for i in resolver.diagnose())


def test_playbook_resolve_pb002_location_normalizer(tmp_path):
    """Verify PB-002 normalizes Indian locations in an isolated repo."""
    resolver = _make_isolated_repo(tmp_path)
    bad = json.loads(resolver.jobs_json_path.read_text(encoding="utf-8"))
    bad[0]["city"] = "Other-India"
    bad[0]["location_raw"] = "Bengaluru, India"
    resolver.jobs_json_path.write_text(json.dumps(bad), encoding="utf-8")

    result = resolver.resolve_pb002()
    assert result["status"] == "resolved"
    assert result["playbook_id"] == "PB-002"
    assert result["locations_normalized"] == 1
    assert not any(i.playbook_id == "PB-002" for i in resolver.diagnose())


def test_playbook_resolve_pb003_dependencies(tmp_path):
    """Verify PB-003 dependency checker verifies requirements.txt safely."""
    resolver = _make_isolated_repo(tmp_path)
    result = resolver.resolve_pb003()

    assert result["status"] == "resolved"
    assert result["playbook_id"] == "PB-003"
    assert result["added_dependencies"] == []


def test_playbook_resolve_pb004_cache_sync(tmp_path):
    """Verify PB-004 detects missing or stale cache rows and restores exact parity."""
    resolver = _make_isolated_repo(tmp_path)
    # Simulate stale extra job in JSON cache
    stale_cache = json.loads(resolver.jobs_json_path.read_text(encoding="utf-8"))
    stale_cache.append({**stale_cache[0], "id": "stale_ghost_job"})
    resolver.jobs_json_path.write_text(json.dumps(stale_cache), encoding="utf-8")

    assert any(i.playbook_id == "PB-004" for i in resolver.diagnose())

    result = resolver.resolve_pb004()
    assert result["status"] == "resolved"
    assert result["playbook_id"] == "PB-004"
    assert result["exported_jobs"] == 1
    assert not any(i.playbook_id == "PB-004" for i in resolver.diagnose())


def test_playbook_resolve_all_report(tmp_path):
    """Verify that resolve_all generates a valid zero-cost remediation report."""
    resolver = _make_isolated_repo(tmp_path)
    report = resolver.resolve_all()

    assert "timestamp" in report
    assert "diagnosed_count" in report
    assert "resolved_count" in report
    assert "remaining_unresolved" in report
    assert "remediation_actions" in report
    assert report["system_health"] == "100% HEALTHY"


def test_db_refresh_freshness_and_prune(tmp_path):
    """Verify stale 24h flags are aged out and expired >14d jobs are deactivated."""
    db = JobDatabase(tmp_path / "test_prune.db")
    now = datetime.now(timezone.utc)

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


def test_playbook_pb005_circuit_breaker_and_telemetry(tmp_path):
    """Verify PB-005 isolates repeatedly failing portals and ingestion_runs telemetry records runs."""
    from engine.models import Company

    db = JobDatabase(tmp_path / "pb005.db")
    co = Company(
        id="flaky_co", name="Flaky Co", ats_provider="custom", ats_identifier="flaky",
        careers_url="https://example.com/careers",
    )
    db.upsert_company(co)

    run_id = db.start_ingestion_run(companies_checked=1)
    for _ in range(5):
        db.record_company_outcome("flaky_co", success=False, error="HTTP 503 Timeout", failure_threshold=5)
    db.finish_ingestion_run(run_id, raw_jobs_found=0, new_jobs_saved=0, fresh_24h_jobs=0, duration_seconds=1.25)

    assert "flaky_co" in db.get_open_circuit_company_ids()
    telemetry = db.get_latest_telemetry()
    assert telemetry["last_run"]["id"] == run_id
    assert telemetry["catalog"]["tripped_circuits"] == 1

    # Recovering resets failure counter & closes circuit
    db.record_company_outcome("flaky_co", success=True, jobs_found=4)
    assert "flaky_co" not in db.get_open_circuit_company_ids()


def test_lkg_export_guard_aborts_catastrophic_drop(tmp_path):
    """Verify PB-007 LKG guard blocks >25% sudden catalog drops unless force=True."""
    out_file = tmp_path / "jobs.json"
    out_file.write_text(json.dumps([{"id": f"prev_{i}"} for i in range(600)]), encoding="utf-8")

    db = JobDatabase(tmp_path / "lkg.db")
    res = db.export_with_lkg_guard(out_file, limit=None, force=False)
    assert res["status"] == "aborted_lkg"
    assert res["prev_count"] == 600
    assert res["new_count"] == 0
    # Existing Last-Known-Good catalog must remain untouched
    assert len(json.loads(out_file.read_text(encoding="utf-8"))) == 600

