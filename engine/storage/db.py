import json
import logging
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
from engine.models import Company, ProcessedJob

logger = logging.getLogger("jobops.db")

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_PATH = REPO_ROOT / "data" / "jobops.db"
DEFAULT_MAX_AGE_DAYS = int(os.environ.get("JOBOPS_MAX_AGE_DAYS", "14"))


class JobDatabase:
    def __init__(self, db_path: Path = DEFAULT_DB_PATH, auto_seed: Optional[bool] = None):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init_db()
        should_seed = (
            auto_seed
            if auto_seed is not None
            else self.db_path.resolve() == DEFAULT_DB_PATH.resolve()
        )
        if should_seed:
            self.seed_from_cache_if_empty()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=5.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA busy_timeout=5000")
        return conn

    def init_db(self) -> None:
        with self._get_conn() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS companies (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    ats_provider TEXT NOT NULL,
                    ats_identifier TEXT NOT NULL,
                    careers_url TEXT,
                    priority INTEGER DEFAULT 1,
                    enabled INTEGER DEFAULT 1,
                    last_checked_at TEXT,
                    last_success_at TEXT,
                    total_jobs_found INTEGER DEFAULT 0,
                    consecutive_failures INTEGER DEFAULT 0,
                    last_error TEXT,
                    circuit_open_until TEXT
                );

                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    external_id TEXT NOT NULL,
                    company_id TEXT NOT NULL,
                    company_name TEXT NOT NULL,
                    ats_provider TEXT NOT NULL,
                    title TEXT NOT NULL,
                    job_url TEXT NOT NULL,
                    is_engineering INTEGER DEFAULT 1,
                    role_category TEXT NOT NULL,
                    role_label TEXT NOT NULL,
                    location_raw TEXT,
                    city TEXT,
                    work_mode TEXT NOT NULL,
                    is_india INTEGER DEFAULT 1,
                    min_years REAL,
                    max_years REAL,
                    experience_level TEXT NOT NULL,
                    skills TEXT,
                    posted_at TEXT,
                    age_hours REAL,
                    is_fresh_24h INTEGER DEFAULT 0,
                    first_seen_at TEXT NOT NULL,
                    last_seen_at TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    summary TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_jobs_fresh ON jobs(is_active, is_fresh_24h, is_india);
                CREATE INDEX IF NOT EXISTS idx_jobs_role ON jobs(role_category, is_active);
                CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city, is_active);
                CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs(posted_at DESC);

                CREATE TABLE IF NOT EXISTS ingestion_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    started_at TEXT NOT NULL,
                    finished_at TEXT,
                    companies_checked INTEGER DEFAULT 0,
                    raw_jobs_found INTEGER DEFAULT 0,
                    new_jobs_saved INTEGER DEFAULT 0,
                    fresh_24h_jobs INTEGER DEFAULT 0,
                    duration_seconds REAL,
                    status TEXT DEFAULT 'running',
                    observability_json TEXT
                );
                """
            )
            existing_cols = {
                row[1] for row in conn.execute("PRAGMA table_info(companies)").fetchall()
            }
            for col_name, col_def in (
                ("consecutive_failures", "INTEGER DEFAULT 0"),
                ("last_error", "TEXT"),
                ("circuit_open_until", "TEXT"),
            ):
                if col_name not in existing_cols:
                    conn.execute(f"ALTER TABLE companies ADD COLUMN {col_name} {col_def}")
            run_cols = {
                row[1] for row in conn.execute("PRAGMA table_info(ingestion_runs)").fetchall()
            }
            if "observability_json" not in run_cols:
                conn.execute("ALTER TABLE ingestion_runs ADD COLUMN observability_json TEXT")

    def seed_from_cache_if_empty(self) -> int:
        """Seed the SQLite database from web/public/jobs.json or data/jobs.json if database has 0 jobs."""
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM jobs")
            count = cursor.fetchone()[0]
            if count > 0:
                return 0

            candidates = [
                REPO_ROOT / "web" / "public" / "jobs.json",
                REPO_ROOT / "data" / "jobs.json",
            ]
            target_file = None
            for cand in candidates:
                if cand.exists() and cand.stat().st_size > 100:
                    target_file = cand
                    break

            if not target_file:
                return 0

            try:
                with open(target_file, "r", encoding="utf-8") as f:
                    jobs = json.load(f)
                if not jobs or not isinstance(jobs, list):
                    return 0

                now_iso = datetime.now(timezone.utc).isoformat()
                rows = [
                    (
                        j.get("id"),
                        j.get("external_id") or j.get("id"),
                        j.get("company_id") or "unknown",
                        j.get("company_name") or "Unknown",
                        j.get("ats_provider") or "custom",
                        j.get("title") or "Engineering Role",
                        j.get("job_url") or "",
                        1 if j.get("is_engineering", True) else 0,
                        j.get("role_category") or "software_general",
                        j.get("role_label") or "Software Engineering",
                        j.get("location_raw") or "",
                        j.get("city") or "India",
                        j.get("work_mode") or "onsite",
                        1 if j.get("is_india", True) else 0,
                        j.get("min_years"),
                        j.get("max_years"),
                        j.get("experience_level") or "Any Experience",
                        json.dumps(j.get("skills", [])) if isinstance(j.get("skills"), list) else (j.get("skills") or "[]"),
                        j.get("posted_at"),
                        j.get("age_hours", 0.0),
                        1 if j.get("is_fresh_24h") else 0,
                        j.get("first_seen_at") or j.get("posted_at") or now_iso,
                        j.get("last_seen_at") or j.get("posted_at") or now_iso,
                        1 if j.get("is_active", True) else 0,
                        j.get("summary") or f"{j.get('title')} at {j.get('company_name')}",
                    )
                    for j in jobs
                ]

                conn.executemany(
                    """
                    INSERT OR IGNORE INTO jobs (
                        id, external_id, company_id, company_name, ats_provider,
                        title, job_url, is_engineering, role_category, role_label,
                        location_raw, city, work_mode, is_india,
                        min_years, max_years, experience_level, skills,
                        posted_at, age_hours, is_fresh_24h,
                        first_seen_at, last_seen_at, is_active, summary
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    rows,
                )
                return len(rows)
            except Exception as e:
                logger.warning(f"Failed seeding database from cache {target_file}: {e}")
                return 0

    def get_seen_job_ids(self) -> Set[str]:
        with self._get_conn() as conn:
            cursor = conn.execute("SELECT id FROM jobs")
            return {row["id"] for row in cursor.fetchall()}

    def upsert_company(self, company: Company) -> None:
        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO companies (id, name, ats_provider, ats_identifier, careers_url, priority, enabled)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    ats_provider = excluded.ats_provider,
                    ats_identifier = excluded.ats_identifier,
                    careers_url = excluded.careers_url,
                    priority = excluded.priority,
                    enabled = excluded.enabled
                """,
                (company.id, company.name, company.ats_provider, company.ats_identifier, company.careers_url, company.priority, 1 if company.enabled else 0),
            )

    def save_processed_jobs(self, jobs: List[ProcessedJob]) -> int:
        if not jobs:
            return 0
        new_count = 0
        now_str = datetime.now(timezone.utc).isoformat()

        with self._get_conn() as conn:
            for job in jobs:
                cursor = conn.execute("SELECT id FROM jobs WHERE id = ?", (job.id,))
                exists = cursor.fetchone() is not None

                if exists:
                    conn.execute(
                        "UPDATE jobs SET last_seen_at = ?, is_active = 1 WHERE id = ?",
                        (now_str, job.id),
                    )
                else:
                    new_count += 1
                    conn.execute(
                        """
                        INSERT INTO jobs (
                            id, external_id, company_id, company_name, ats_provider,
                            title, job_url, is_engineering, role_category, role_label,
                            location_raw, city, work_mode, is_india,
                            min_years, max_years, experience_level, skills,
                            posted_at, age_hours, is_fresh_24h,
                            first_seen_at, last_seen_at, is_active, summary
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            job.id,
                            job.external_id,
                            job.company_id,
                            job.company_name,
                            job.ats_provider,
                            job.title,
                            job.job_url,
                            1 if job.is_engineering else 0,
                            job.role_category.value,
                            job.role_label,
                            job.location_raw,
                            job.city,
                            job.work_mode.value,
                            1 if job.is_india else 0,
                            job.min_years,
                            job.max_years,
                            job.experience_level,
                            json.dumps(job.skills),
                            job.posted_at.isoformat() if job.posted_at else None,
                            job.age_hours,
                            1 if job.is_fresh_24h else 0,
                            job.first_seen_at.isoformat(),
                            job.last_seen_at.isoformat(),
                            1,
                            job.summary,
                        ),
                    )
        return new_count

    def refresh_freshness_and_prune(self, max_age_days: int = DEFAULT_MAX_AGE_DAYS) -> Dict[str, int]:
        """Recompute age_hours & is_fresh_24h for active jobs and deactivate stale listings."""
        from engine.dedup.freshness import parse_datetime, evaluate_freshness

        updated_fresh = 0
        pruned_count = 0

        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT id, posted_at, first_seen_at, is_fresh_24h FROM jobs WHERE is_active = 1"
            ).fetchall()

            updates = []
            prune_ids = []
            for row in rows:
                dt = parse_datetime(row["posted_at"]) or parse_datetime(row["first_seen_at"])
                if not dt:
                    continue
                is_fresh, age_hours = evaluate_freshness(dt, max_hours=24.0)
                age_val = age_hours if age_hours is not None else 0.0

                if max_age_days > 0 and age_val > max_age_days * 24.0:
                    prune_ids.append((row["id"],))
                    pruned_count += 1
                else:
                    fresh_int = 1 if is_fresh else 0
                    if fresh_int != row["is_fresh_24h"]:
                        updated_fresh += 1
                    updates.append((age_val, fresh_int, row["id"]))

            if updates:
                conn.executemany(
                    "UPDATE jobs SET age_hours = ?, is_fresh_24h = ? WHERE id = ?",
                    updates,
                )
            if prune_ids:
                conn.executemany(
                    "UPDATE jobs SET is_active = 0, is_fresh_24h = 0 WHERE id = ?",
                    prune_ids,
                )

        return {"updated_freshness": updated_fresh, "pruned_stale": pruned_count}

    def get_filtered_jobs(
        self,
        role: Optional[str] = None,
        experience_level: Optional[str] = None,
        city: Optional[str] = None,
        work_mode: Optional[str] = None,
        fresh_only: bool = False,
        search_term: Optional[str] = None,
        limit: Optional[int] = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        query = "SELECT * FROM jobs WHERE is_active = 1 AND is_engineering = 1"
        params: List[Any] = []

        if fresh_only:
            query += " AND is_fresh_24h = 1"

        if role and role != "All":
            query += " AND role_category = ?"
            params.append(role)

        if experience_level and experience_level != "All":
            query += " AND experience_level = ?"
            params.append(experience_level)

        if city and city != "All":
            query += " AND city = ?"
            params.append(city)

        if work_mode and work_mode != "All":
            query += " AND work_mode = ?"
            params.append(work_mode)

        if search_term:
            term = f"%{search_term.lower()}%"
            query += " AND (LOWER(title) LIKE ? OR LOWER(company_name) LIKE ? OR LOWER(skills) LIKE ?)"
            params.extend([term, term, term])

        query += " ORDER BY is_fresh_24h DESC, posted_at DESC NULLS LAST"
        if limit is not None and limit > 0:
            query += " LIMIT ? OFFSET ?"
            params.extend([limit, offset])
        elif offset > 0:
            query += " LIMIT -1 OFFSET ?"
            params.append(offset)

        with self._get_conn() as conn:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            results = []
            for r in rows:
                d = dict(r)
                d["skills"] = json.loads(d["skills"]) if d.get("skills") else []
                results.append(d)
            return results

    def get_stats(self) -> Dict[str, Any]:
        with self._get_conn() as conn:
            total_jobs = conn.execute("SELECT COUNT(*) FROM jobs WHERE is_active = 1 AND is_engineering = 1").fetchone()[0]
            fresh_24h = conn.execute("SELECT COUNT(*) FROM jobs WHERE is_active = 1 AND is_fresh_24h = 1 AND is_engineering = 1").fetchone()[0]
            companies_count = conn.execute("SELECT COUNT(*) FROM companies WHERE enabled = 1").fetchone()[0]
            now_iso = datetime.now(timezone.utc).isoformat()
            tripped_circuits = conn.execute(
                "SELECT COUNT(*) FROM companies WHERE circuit_open_until IS NOT NULL AND circuit_open_until > ?",
                (now_iso,),
            ).fetchone()[0]
            return {
                "total_engineering_jobs": total_jobs,
                "fresh_24h_jobs": fresh_24h,
                "active_companies": companies_count,
                "tripped_circuits": tripped_circuits,
            }

    def record_company_outcome(
        self,
        company_id: str,
        success: bool,
        jobs_found: int = 0,
        error: Optional[str] = None,
        failure_threshold: int = 5,
    ) -> None:
        """Track per-company scrape outcomes and trip exponential backoff circuit breakers on repeat failures."""
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        with self._get_conn() as conn:
            if success:
                conn.execute(
                    """
                    UPDATE companies
                    SET last_checked_at = ?, last_success_at = ?, total_jobs_found = ?,
                        consecutive_failures = 0, last_error = NULL, circuit_open_until = NULL
                    WHERE id = ?
                    """,
                    (now_iso, now_iso, jobs_found, company_id),
                )
            else:
                row = conn.execute(
                    "SELECT consecutive_failures FROM companies WHERE id = ?", (company_id,)
                ).fetchone()
                failures = (row["consecutive_failures"] or 0) + 1 if row else 1
                circuit_until = None
                if failures >= failure_threshold:
                    backoff_hours = min(168, 6 * (2 ** (failures - failure_threshold)))
                    circuit_until = (now + timedelta(hours=backoff_hours)).isoformat()
                conn.execute(
                    """
                    UPDATE companies
                    SET last_checked_at = ?, consecutive_failures = ?, last_error = ?, circuit_open_until = ?
                    WHERE id = ?
                    """,
                    (now_iso, failures, (error or "unknown error")[:300], circuit_until, company_id),
                )

    def get_open_circuit_company_ids(self) -> Set[str]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT id FROM companies WHERE circuit_open_until IS NOT NULL AND circuit_open_until > ?",
                (now_iso,),
            ).fetchall()
            return {r["id"] for r in rows}

    def get_failing_companies(self, min_failures: int = 3) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT id, name, ats_provider, careers_url, consecutive_failures, last_error, circuit_open_until
                FROM companies
                WHERE enabled = 1 AND consecutive_failures >= ?
                ORDER BY consecutive_failures DESC
                """,
                (min_failures,),
            ).fetchall()
            return [dict(r) for r in rows]

    def reset_company_circuit(self, company_id: str) -> None:
        with self._get_conn() as conn:
            conn.execute(
                "UPDATE companies SET consecutive_failures = 0, last_error = NULL, circuit_open_until = NULL WHERE id = ?",
                (company_id,),
            )

    def start_ingestion_run(self, companies_checked: int) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._get_conn() as conn:
            cursor = conn.execute(
                "INSERT INTO ingestion_runs (started_at, companies_checked, status) VALUES (?, ?, 'running')",
                (now_iso, companies_checked),
            )
            return int(cursor.lastrowid)

    def finish_ingestion_run(
        self,
        run_id: int,
        raw_jobs_found: int,
        new_jobs_saved: int,
        fresh_24h_jobs: int,
        duration_seconds: float,
        status: str = "completed",
        observability: Optional[Dict[str, Any]] = None,
    ) -> None:
        now_iso = datetime.now(timezone.utc).isoformat()
        obs_str = json.dumps(observability) if observability is not None else None
        with self._get_conn() as conn:
            conn.execute(
                """
                UPDATE ingestion_runs
                SET finished_at = ?, raw_jobs_found = ?, new_jobs_saved = ?,
                    fresh_24h_jobs = ?, duration_seconds = ?, status = ?, observability_json = ?
                WHERE id = ?
                """,
                (now_iso, raw_jobs_found, new_jobs_saved, fresh_24h_jobs, round(duration_seconds, 2), status, obs_str, run_id),
            )

    def get_latest_telemetry(self) -> Dict[str, Any]:
        stats = self.get_stats()
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM ingestion_runs ORDER BY id DESC LIMIT 1"
            ).fetchone()
            last_run = dict(row) if row else None
        observability = None
        if last_run:
            raw_obs = last_run.pop("observability_json", None)
            if raw_obs:
                try:
                    observability = json.loads(raw_obs)
                except Exception as e:
                    logger.warning(f"Failed parsing ingestion run observability JSON: {e}")
                    observability = None
        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "catalog": stats,
            "last_run": last_run,
            "observability": observability,
        }

    def get_oldest_active_jobs(self, limit: int = 120) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT id, company_name, title, job_url, last_seen_at
                FROM jobs
                WHERE is_active = 1 AND is_engineering = 1 AND job_url != ''
                ORDER BY last_seen_at ASC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
            return [dict(r) for r in rows]

    def deactivate_jobs(self, job_ids: List[str]) -> int:
        if not job_ids:
            return 0
        with self._get_conn() as conn:
            conn.executemany(
                "UPDATE jobs SET is_active = 0, is_fresh_24h = 0 WHERE id = ?",
                [(jid,) for jid in job_ids],
            )
        return len(job_ids)

    def export_with_lkg_guard(
        self,
        output_path: Path,
        limit: Optional[int] = None,
        max_age_days: Optional[int] = None,
        max_drop_ratio: float = 0.25,
        force: bool = False,
        telemetry_path: Optional[Path] = None,
    ) -> Dict[str, Any]:
        """Export active jobs while refusing catastrophic catalog drops (Last-Known-Good protection)."""
        out = Path(output_path)
        prev_count = 0
        if out.exists():
            try:
                with open(out, "r", encoding="utf-8") as f:
                    prev_data = json.load(f)
                if isinstance(prev_data, list):
                    prev_count = len(prev_data)
            except Exception as e:
                logger.warning(f"Could not read previous catalog {out} for LKG check: {e}")
                prev_count = 0

        maintenance = self.refresh_freshness_and_prune(
            max_age_days=max_age_days if max_age_days is not None else DEFAULT_MAX_AGE_DAYS
        )
        jobs = self.get_filtered_jobs(limit=limit)
        new_count = len(jobs)

        if not force and prev_count >= 500 and new_count < int(prev_count * (1.0 - max_drop_ratio)):
            return {
                "status": "aborted_lkg",
                "prev_count": prev_count,
                "new_count": new_count,
                "maintenance": maintenance,
                "reason": f"Export aborted by LKG guard: active jobs dropped from {prev_count} to {new_count} (> {int(max_drop_ratio * 100)}% drop).",
            }

        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            json.dump(jobs, f, separators=(",", ":"))

        t_path = telemetry_path or (out.parent / "telemetry.json")
        with open(t_path, "w", encoding="utf-8") as f:
            json.dump(self.get_latest_telemetry(), f, separators=(",", ":"))

        with self._get_conn() as conn:
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")

        return {
            "status": "exported",
            "exported_jobs": new_count,
            "prev_count": prev_count,
            "maintenance": maintenance,
            "telemetry_path": str(t_path),
        }
