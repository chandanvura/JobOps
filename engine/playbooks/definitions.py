from dataclasses import dataclass, field
from typing import Callable, List, Optional, Dict, Any


@dataclass
class Playbook:
    id: str
    name: str
    category: str  # "data_quality", "runtime", "caching", "reliability", "build"
    severity: str  # "critical", "high", "medium", "low"
    description: str
    trigger_symptoms: List[str]
    auto_resolvable: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


PLAYBOOKS: Dict[str, Playbook] = {
    "PB-001": Playbook(
        id="PB-001",
        name="Raw HTML Entities & Unclosed Tag Sanitization",
        category="data_quality",
        severity="high",
        description="Detects double-encoded HTML entities (&lt;, &amp;lt;) or truncated unclosed tags (<span..., <div...) in job summaries and cleans them recursively.",
        trigger_symptoms=[
            "Raw HTML entities found in jobs catalog (&lt;, &gt;, &quot;)",
            "Unclosed HTML tag fragments in job summary (<div style=..., <span data-...)",
            "test_no_raw_html_entities_in_jobs_catalog failure in pytest",
        ],
        auto_resolvable=True,
    ),
    "PB-002": Playbook(
        id="PB-002",
        name="Indian Location & Tech Hub Normalization",
        category="data_quality",
        severity="medium",
        description="Identifies jobs with un-normalized locations ('Other-India', 'null', 'undefined', 'unknown') and maps them to standard Indian Tech Hubs or remote arrangements.",
        trigger_symptoms=[
            "Jobs assigned with city in ['Other-India', 'null', 'undefined', 'unknown']",
            "test_no_other_india_or_null_locations failure in pytest",
            "Jobs missing work_mode assignment",
        ],
        auto_resolvable=True,
    ),
    "PB-003": Playbook(
        id="PB-003",
        name="Python Runtime Dependency Synchronization",
        category="runtime",
        severity="critical",
        description="Detects ModuleNotFoundError or missing dependencies in the Python execution environment (e.g., beautifulsoup4, httpx, selectolax) and syncs requirements.txt.",
        trigger_symptoms=[
            "ModuleNotFoundError in collector or adapters (e.g., No module named 'bs4')",
            "ImportError during pytest collection",
            "Missing packages between virtualenv and requirements.txt",
        ],
        auto_resolvable=True,
    ),
    "PB-004": Playbook(
        id="PB-004",
        name="Static Edge Cache & SQLite Database Desynchronization",
        category="caching",
        severity="high",
        description="Detects discrepancies between active records in SQLite (data/jobops.db) and static edge JSON distribution caches (web/public/jobs.json).",
        trigger_symptoms=[
            "Record count mismatch between SQLite database and web/public/jobs.json",
            "web/public/jobs.json older than latest completed ingestion run",
            "Missing web/public/jobs.json or web/public/companies.json file",
        ],
        auto_resolvable=True,
    ),
    "PB-005": Playbook(
        id="PB-005",
        name="Dead / Rate-Limited ATS Endpoint Circuit Breaker",
        category="reliability",
        severity="medium",
        description="Identifies ATS endpoints that consistently return HTTP 404, 410, or 429 errors, isolates them, and marks them inactive to protect pipeline throughput.",
        trigger_symptoms=[
            "Consecutive HTTP 404/410/500 errors on company careers API endpoint",
            "Adapter timeouts exceeding 20 seconds repeatedly",
            "Excessive scraper failures dragging down overall ingestion run",
        ],
        auto_resolvable=True,
    ),
    "PB-006": Playbook(
        id="PB-006",
        name="Web Application Build & Type Safety Verification",
        category="build",
        severity="high",
        description="Detects TypeScript compilation errors, Vite bundling defects, or missing dist/ assets and triggers an atomic rebuild.",
        trigger_symptoms=[
            "TypeScript compiler errors (tsc failed with exit code 1)",
            "Missing web/dist/index.html or assets bundle",
            "Stale or corrupted Vite production build",
        ],
        auto_resolvable=True,
    ),
    "PB-007": Playbook(
        id="PB-007",
        name="Last-Known-Good (LKG) Catalog Regression Guard",
        category="reliability",
        severity="critical",
        description="Prevents catastrophic catalog drops (>25%) caused by upstream outages from overwriting web/public/jobs.json.",
        trigger_symptoms=[
            "Active exported job count drops >25% compared to previous jobs.json",
            "Upstream DNS or ATS network outage during scheduled cron",
        ],
        auto_resolvable=True,
    ),
    "PB-008": Playbook(
        id="PB-008",
        name="Dead-Link & Ghost-Job Reaper",
        category="data_quality",
        severity="medium",
        description="Samples oldest active job URLs and deactivates confirmed HTTP 404/410 closed requisitions before candidates click Apply.",
        trigger_symptoms=[
            "Job URL returns HTTP 404 or 410 Gone",
            "Closed requisition still marked is_active = 1",
        ],
        auto_resolvable=True,
    ),
}
