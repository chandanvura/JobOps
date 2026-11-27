import json
import logging
import sqlite3
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from engine.adapters.base import sanitize_text
from engine.storage.db import JobDatabase

from .definitions import PLAYBOOKS, Playbook

logger = logging.getLogger("jobops.playbooks")
REPO_ROOT = Path(__file__).resolve().parent.parent.parent


class PlaybookIssue:
    def __init__(self, playbook_id: str, symptom: str, details: dict[str, Any]):
        self.playbook_id = playbook_id
        self.symptom = symptom
        self.details = details

    def to_dict(self) -> dict[str, Any]:
        return {
            "playbook_id": self.playbook_id,
            "playbook_name": PLAYBOOKS.get(self.playbook_id, Playbook("", "", "", "", "", [])).name,
            "symptom": self.symptom,
            "details": self.details,
        }


class PlaybookResolver:
    def __init__(self, repo_root: Path = REPO_ROOT):
        self.repo_root = repo_root
        self.db_path = self.repo_root / "data" / "jobops.db"
        self.jobs_json_path = self.repo_root / "web" / "public" / "jobs.json"
        self.companies_json_path = self.repo_root / "web" / "public" / "companies.json"

    def list_playbooks(self) -> list[dict[str, Any]]:
        return [
            {
                "id": pb.id,
                "name": pb.name,
                "category": pb.category,
                "severity": pb.severity,
                "description": pb.description,
                "auto_resolvable": pb.auto_resolvable,
                "trigger_symptoms": pb.trigger_symptoms,
            }
            for pb in PLAYBOOKS.values()
        ]

    def diagnose(self) -> list[PlaybookIssue]:
        issues: list[PlaybookIssue] = []

        # Load jobs.json once for PB-001, PB-002, and PB-004 checks
        cached_jobs: list[dict[str, Any]] | None = None
        if self.jobs_json_path.exists():
            try:
                with open(self.jobs_json_path, "r", encoding="utf-8") as f:
                    cached_jobs = json.load(f)
            except (OSError, json.JSONDecodeError, ValueError) as e:
                logger.error(f"Error checking jobs.json: {e}")

        # Check PB-001: Raw HTML & Unclosed Tag Sanitization
        if cached_jobs is not None:
            bad_html_jobs = []
            for j in cached_jobs:
                summary = j.get("summary", "")
                title = j.get("title", "")
                if any(
                    marker in summary or marker in title
                    for marker in ["&lt;", "&gt;", "&amp;lt;", "<div", "<p", "<span", "&quot;", "&amp;"]
                ):
                    bad_html_jobs.append((j.get("id"), j.get("company_name"), title))
            if bad_html_jobs:
                issues.append(
                    PlaybookIssue(
                        playbook_id="PB-001",
                        symptom=f"Found {len(bad_html_jobs)} jobs with uncleaned HTML or unclosed tags in catalog.",
                        details={"count": len(bad_html_jobs), "sample": bad_html_jobs[:3]},
                    )
                )

        # Check PB-002: Location Normalization
        if cached_jobs is not None:
            bad_locations = []
            for j in cached_jobs:
                city = j.get("city", "")
                if city in ["Other-India", "null", "undefined", "unknown"]:
                    bad_locations.append((j.get("id"), j.get("company_name"), city))
            if bad_locations:
                issues.append(
                    PlaybookIssue(
                        playbook_id="PB-002",
                        symptom=f"Found {len(bad_locations)} jobs with un-normalized Indian locations.",
                        details={"count": len(bad_locations), "sample": bad_locations[:3]},
                    )
                )

        # Check PB-003: Critical Dependencies in Environment
        missing_pkgs = []
        for pkg, import_name in [("beautifulsoup4", "bs4"), ("httpx", "httpx"), ("selectolax", "selectolax")]:
            try:
                __import__(import_name)
            except ImportError:
                missing_pkgs.append(pkg)
        if missing_pkgs:
            issues.append(
                PlaybookIssue(
                    playbook_id="PB-003",
                    symptom=f"Missing required Python dependencies: {missing_pkgs}",
                    details={"missing_packages": missing_pkgs},
                )
            )

        # Check PB-004: Edge Cache & SQLite Desync
        if self.db_path.exists() and cached_jobs is not None:
            try:
                db = JobDatabase(self.db_path)
                db_stats = db.get_stats()
                db_job_count = db_stats.get("total_engineering_jobs", 0)
                json_count = len(cached_jobs)
                # Detect any count discrepancy between active DB jobs and exported JSON (missing or stale rows)
                if db_job_count != json_count:
                    issues.append(
                        PlaybookIssue(
                            playbook_id="PB-004",
                            symptom=f"Desync detected: SQLite has {db_job_count} active jobs while jobs.json has {json_count}.",
                            details={"db_count": db_job_count, "json_count": json_count},
                        )
                    )
            except (sqlite3.Error, OSError, ValueError, TypeError) as e:
                logger.error(f"Error checking cache desync: {e}")

        # Check PB-005: Chronically failing companies without an active circuit breaker cooldown
        if self.db_path.exists():
            try:
                db = JobDatabase(self.db_path)
                failing = [
                    c for c in db.get_failing_companies(min_failures=5)
                    if not c.get("circuit_open_until")
                ]
                if failing:
                    issues.append(
                        PlaybookIssue(
                            playbook_id="PB-005",
                            symptom=f"Found {len(failing)} persistently failing company endpoints without an active cooldown.",
                            details={"count": len(failing), "sample": [c["id"] for c in failing[:5]]},
                        )
                    )
            except (sqlite3.Error, OSError) as e:
                logger.error(f"Error checking failing company circuits: {e}")

        # Check PB-006: Web Build Integrity
        dist_index = self.repo_root / "web" / "dist" / "index.html"
        if not dist_index.exists():
            issues.append(
                PlaybookIssue(
                    playbook_id="PB-006",
                    symptom="Production build artifact web/dist/index.html is missing.",
                    details={"expected_path": str(dist_index)},
                )
            )

        return issues

    def resolve_pb001(self) -> dict[str, Any]:
        """Auto-Resolve PB-001: Sanitize HTML tags & entities."""
        cleaned_count = 0
        sanitize_str = lambda text: sanitize_text(text, strip_boilerplate=True)

        # Clean jobs.json
        if self.jobs_json_path.exists():
            with open(self.jobs_json_path, "r", encoding="utf-8") as f:
                jobs = json.load(f)
            for j in jobs:
                orig_s = j.get("summary", "")
                orig_t = j.get("title", "")
                s = sanitize_str(orig_s)
                t = sanitize_str(orig_t)
                if s != orig_s or t != orig_t:
                    j["summary"] = s[:320]
                    if t:
                        j["title"] = t
                    cleaned_count += 1
            with open(self.jobs_json_path, "w", encoding="utf-8") as f:
                json.dump(jobs, f, separators=(",", ":"))

        # Clean SQLite DB
        if self.db_path.exists():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT id, summary, title, company_name FROM jobs")
            rows = cursor.fetchall()
            for j_id, summary, title, company_name in rows:
                s = sanitize_str(summary or "")
                t = sanitize_str(title or "")
                if not s:
                    s = f"{t} at {company_name}"
                cursor.execute("UPDATE jobs SET summary = ?, title = ? WHERE id = ?", (s[:320], t, j_id))
            conn.commit()
            conn.close()

        return {"status": "resolved", "playbook_id": "PB-001", "records_sanitized": cleaned_count}

    def resolve_pb002(self) -> dict[str, Any]:
        """Auto-Resolve PB-002: Normalize locations to Indian tech hubs."""
        from engine.classifier.location import LocationNormalizer

        normalizer = LocationNormalizer()
        normalized_count = 0

        if self.jobs_json_path.exists():
            with open(self.jobs_json_path, "r", encoding="utf-8") as f:
                jobs = json.load(f)
            for j in jobs:
                if j.get("city") in ["Other-India", "null", "undefined", "unknown"]:
                    city, is_india, work_mode = normalizer.normalize(
                        j.get("location_raw", ""), j.get("title", ""), j.get("summary", "")
                    )
                    j["city"] = city or "India"
                    j["is_india"] = is_india
                    j["work_mode"] = work_mode
                    normalized_count += 1
            with open(self.jobs_json_path, "w", encoding="utf-8") as f:
                json.dump(jobs, f, separators=(",", ":"))

        if self.db_path.exists():
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, location_raw, summary, city FROM jobs WHERE city IN ('Other-India', 'null', 'undefined', 'unknown')")
            rows = cursor.fetchall()
            for j_id, title, location_raw, summary, _ in rows:
                city, is_india, work_mode = normalizer.normalize(location_raw or "", title or "", summary or "")
                cursor.execute(
                    "UPDATE jobs SET city = ?, is_india = ?, work_mode = ? WHERE id = ?",
                    (city or "India", 1 if is_india else 0, work_mode, j_id),
                )
            conn.commit()
            conn.close()

        return {"status": "resolved", "playbook_id": "PB-002", "locations_normalized": normalized_count}

    def resolve_pb003(self) -> dict[str, Any]:
        """Auto-Resolve PB-003: Check and ensure requirements.txt contains all core dependencies."""
        req_file = self.repo_root / "requirements.txt"
        required_deps = {
            "beautifulsoup4": "beautifulsoup4>=4.12.0",
            "httpx": "httpx>=0.28.0",
            "selectolax": "selectolax>=0.3.21",
            "pytest": "pytest>=8.0.0",
            "pydantic": "pydantic>=2.0.0",
        }
        added = []
        if req_file.exists():
            with open(req_file, "r", encoding="utf-8") as f:
                content = f.read().lower()
            for dep_name, dep_line in required_deps.items():
                if dep_name not in content:
                    with open(req_file, "a", encoding="utf-8") as f:
                        f.write(f"\n{dep_line}\n")
                    added.append(dep_name)

        return {"status": "resolved", "playbook_id": "PB-003", "added_dependencies": added}

    def resolve_pb004(self) -> dict[str, Any]:
        """Auto-Resolve PB-004: Re-export edge caches from SQLite DB with LKG guard."""
        if not self.db_path.exists():
            return {"status": "skipped", "reason": "SQLite DB does not exist"}

        db = JobDatabase(self.db_path)
        res = db.export_with_lkg_guard(self.jobs_json_path, limit=None, force=True)
        return {"status": "resolved", "playbook_id": "PB-004", "exported_jobs": res.get("exported_jobs", 0)}

    def resolve_pb005(self) -> dict[str, Any]:
        """Auto-Resolve PB-005: Isolate chronically failing ATS endpoints into exponential backoff."""
        if not self.db_path.exists():
            return {"status": "skipped", "reason": "SQLite DB does not exist"}

        db = JobDatabase(self.db_path)
        failing = [
            c for c in db.get_failing_companies(min_failures=5)
            if not c.get("circuit_open_until")
        ]
        for co in failing:
            db.record_company_outcome(co["id"], success=False, error=co.get("last_error") or "PB-005 circuit tripped")
        return {"status": "resolved", "playbook_id": "PB-005", "tripped_circuits": len(failing)}

    def resolve_pb008(self, sample: int = 100) -> dict[str, Any]:
        """Auto-Resolve PB-008: Probe oldest job URLs and deactivate confirmed 404/410 dead links."""
        if not self.db_path.exists():
            return {"status": "skipped", "reason": "SQLite DB does not exist"}

        import asyncio

        from engine.health import CompanyHealthChecker

        db = JobDatabase(self.db_path)
        checker = CompanyHealthChecker(timeout_seconds=8.0)
        outcome = asyncio.run(checker.reap_dead_jobs(db, sample=sample))
        return {"status": "resolved", "playbook_id": "PB-008", **outcome}

    def resolve_pb006(self) -> dict[str, Any]:
        """Auto-Resolve PB-006: Rebuild web distribution."""
        web_dir = self.repo_root / "web"
        if not web_dir.exists():
            return {"status": "failed", "reason": "web/ directory does not exist"}

        try:
            res = subprocess.run(
                ["npm", "run", "build"],
                cwd=str(web_dir),
                check=False,
                shell=True,
                capture_output=True,
                text=True,
                timeout=60,
            )
            if res.returncode == 0:
                return {"status": "resolved", "playbook_id": "PB-006", "output": "Build completed successfully"}
            else:
                return {"status": "failed", "playbook_id": "PB-006", "error": res.stderr[:300]}
        except (OSError, subprocess.SubprocessError) as e:
            return {"status": "failed", "playbook_id": "PB-006", "error": str(e)}

    def resolve_all(self) -> dict[str, Any]:
        """Diagnose and automatically resolve all known issues."""
        diagnosed_issues = self.diagnose()
        results: list[dict[str, Any]] = []

        for issue in diagnosed_issues:
            pb_id = issue.playbook_id
            if pb_id == "PB-001":
                res = self.resolve_pb001()
            elif pb_id == "PB-002":
                res = self.resolve_pb002()
            elif pb_id == "PB-003":
                res = self.resolve_pb003()
            elif pb_id == "PB-004":
                res = self.resolve_pb004()
            elif pb_id == "PB-005":
                res = self.resolve_pb005()
            elif pb_id == "PB-006":
                res = self.resolve_pb006()
            else:
                res = {"status": "manual_review", "playbook_id": pb_id}
            results.append(res)

        # Re-diagnose to confirm resolution
        remaining_issues = self.diagnose()
        return {
            "timestamp": datetime.now(UTC).isoformat(),
            "diagnosed_count": len(diagnosed_issues),
            "resolved_count": sum(1 for r in results if r.get("status") == "resolved"),
            "remaining_unresolved": len(remaining_issues),
            "remediation_actions": results,
            "system_health": "100% HEALTHY" if len(remaining_issues) == 0 else "ATTENTION_REQUIRED",
        }
