import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
from engine.models import Company, ProcessedJob

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_DB_PATH = REPO_ROOT / "data" / "jobops.db"


class JobDatabase:
    def __init__(self, db_path: Path = DEFAULT_DB_PATH):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.init_db()
        self.seed_from_cache_if_empty()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
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
                    total_jobs_found INTEGER DEFAULT 0
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
                    status TEXT DEFAULT 'running'
                );
                """
            )

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
            except Exception:
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

    def get_filtered_jobs(
        self,
        role: Optional[str] = None,
        experience_level: Optional[str] = None,
        city: Optional[str] = None,
        work_mode: Optional[str] = None,
        fresh_only: bool = False,
        search_term: Optional[str] = None,
        limit: int = 100,
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

        query += " ORDER BY is_fresh_24h DESC, posted_at DESC NULLS LAST LIMIT ? OFFSET ?"
        params.extend([limit, offset])

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
            return {
                "total_engineering_jobs": total_jobs,
                "fresh_24h_jobs": fresh_24h,
                "active_companies": companies_count,
            }
