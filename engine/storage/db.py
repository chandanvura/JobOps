"""
Lightweight SQLite state store for jobs, companies, and discovery runs.
Supports zero-cost operation and export to JSON for static edge deployment.
"""
import sqlite3
import json
from pathlib import Path
from typing import List, Optional
from datetime import datetime
from engine.models import ProcessedJob, Company


class JobStorage:
    def __init__(self, db_path: str = "data/jobops.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                external_id TEXT NOT NULL,
                company_id TEXT NOT NULL,
                company_name TEXT NOT NULL,
                ats_provider TEXT NOT NULL,
                title TEXT NOT NULL,
                job_url TEXT NOT NULL,
                is_engineering INTEGER NOT NULL,
                role_category TEXT NOT NULL,
                location_raw TEXT,
                normalized_city TEXT NOT NULL,
                work_mode TEXT NOT NULL,
                is_india INTEGER NOT NULL,
                min_years REAL,
                max_years REAL,
                seniority_level TEXT,
                skills TEXT,
                posted_at TEXT NOT NULL,
                age_hours REAL,
                summary TEXT,
                first_seen_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1
            );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_filter ON jobs(is_engineering, is_india, normalized_city, role_category);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs(posted_at DESC);")
            conn.commit()

    def save_job(self, job: ProcessedJob):
        with self._get_conn() as conn:
            conn.execute("""
            INSERT INTO jobs (
                id, external_id, company_id, company_name, ats_provider,
                title, job_url, is_engineering, role_category,
                location_raw, normalized_city, work_mode, is_india,
                min_years, max_years, seniority_level, skills,
                posted_at, age_hours, summary, first_seen_at, last_seen_at, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                last_seen_at = excluded.last_seen_at,
                is_active = 1;
            """, (
                job.id, job.external_id, job.company_id, job.company_name, job.ats_provider,
                job.title, job.job_url, 1 if job.is_engineering else 0, job.role_category.value,
                job.location_raw, job.normalized_city, job.work_mode.value, 1 if job.is_india else 0,
                job.min_years, job.max_years, job.seniority_level, json.dumps(job.skills),
                job.posted_at.isoformat(), job.age_hours, job.summary,
                job.first_seen_at.isoformat(), job.last_seen_at.isoformat(), 1
            ))
            conn.commit()

    def get_active_jobs(self, limit: int = 100) -> List[dict]:
        with self._get_conn() as conn:
            cur = conn.cursor()
            cur.execute("""
            SELECT * FROM jobs 
            WHERE is_engineering = 1 AND is_active = 1
            ORDER BY posted_at DESC 
            LIMIT ?;
            """, (limit,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]

    def export_catalog_json(self, output_path: str = "data/catalog.json"):
        """Exports the active catalog to a static JSON file for zero-cost edge distribution."""
        jobs = self.get_active_jobs(limit=5000)
        p = Path(output_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump({
                "generated_at": datetime.utcnow().isoformat(),
                "total_jobs": len(jobs),
                "jobs": jobs
            }, f, indent=2)
