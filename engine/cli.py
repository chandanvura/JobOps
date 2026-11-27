import argparse
import asyncio
import json
import sys
from pathlib import Path

from engine.adapters.registry import get_adapter
from engine.collector import JobCollector
from engine.models import Company
from engine.storage.db import JobDatabase


def main():
    parser = argparse.ArgumentParser(description="JobOps CLI - Engineering Job Intelligence Platform")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Command: run
    run_parser = subparsers.add_parser("run", help="Run ingestion pipeline")
    run_parser.add_argument("--all-time", action="store_true", help="Include jobs older than 24 hours")
    run_parser.add_argument("--concurrency", type=int, default=5, help="Concurrent workers")

    # Command: test-adapter
    test_parser = subparsers.add_parser("test-adapter", help="Test an ATS adapter for a single company")
    test_parser.add_argument("provider", help="ATS provider (greenhouse, lever, ashby, smartrecruiters, workday, recruitee, bamboohr)")
    test_parser.add_argument("identifier", help="ATS identifier/slug")
    test_parser.add_argument("--name", default="TestCompany", help="Company Name")

    # Command: stats
    subparsers.add_parser("stats", help="Display catalog statistics")

    # Command: export
    export_parser = subparsers.add_parser("export", help="Export active jobs to JSON file for frontend/API")
    export_parser.add_argument("--output", default="data/jobs.json", help="Output file path")
    export_parser.add_argument("--limit", type=int, default=0, help="Maximum number of active jobs to export (0 = unlimited)")
    export_parser.add_argument("--max-age-days", type=int, default=None, help="Deactivate jobs older than N days (defaults to JOBOPS_MAX_AGE_DAYS or 14)")
    export_parser.add_argument("--force", action="store_true", help="Bypass Last-Known-Good >25%% drop safety guard")

    # Command: reap
    reap_parser = subparsers.add_parser("reap", help="Probe oldest active job URLs and deactivate 404/410 dead listings")
    reap_parser.add_argument("--sample", type=int, default=120, help="Number of oldest active URLs to verify")
    reap_parser.add_argument("--concurrency", type=int, default=15, help="Concurrent HTTP probes")

    # Command: playbook
    playbook_parser = subparsers.add_parser("playbook", help="Manage and run autonomous zero-cost operational playbooks")
    playbook_sub = playbook_parser.add_subparsers(dest="action", required=True)

    # playbook list
    playbook_sub.add_parser("list", help="List all registered operational playbooks")

    # playbook diagnose
    playbook_sub.add_parser("diagnose", help="Diagnose current system and data health against known issues")

    # playbook resolve
    resolve_parser = playbook_sub.add_parser("resolve", help="Auto-resolve identified issues using playbooks")
    resolve_parser.add_argument("--id", help="Specific playbook ID to resolve (e.g. PB-001)")
    resolve_parser.add_argument("--auto", action="store_true", help="Auto-resolve all diagnosed issues")

    # Command: health
    health_parser = subparsers.add_parser("health", help="Execute real HTTP health checks on employer career portals")
    health_parser.add_argument("--concurrency", type=int, default=10, help="Concurrent HTTP workers")
    health_parser.add_argument("--limit", type=int, default=None, help="Limit number of companies to probe")
    health_parser.add_argument("--output", default="web/public/companies.json", help="Path to write updated companies JSON")
    health_parser.add_argument("--validate-only", action="store_true", help="Only validate dataset schema and exit")

    args = parser.parse_args()

    if args.command == "run":
        collector = JobCollector()
        results = asyncio.run(collector.run(strict_24h=not args.all_time, concurrency=args.concurrency))
        print("\n--- INGESTION SUMMARY ---")
        print(json.dumps(results, indent=2))

    elif args.command == "test-adapter":
        adapter = get_adapter(args.provider)
        if not adapter:
            print(f"Error: Unknown adapter '{args.provider}'")
            return

        company = Company(
            id="test-co",
            name=args.name,
            ats_provider=args.provider,
            ats_identifier=args.identifier,
        )

        async def run_test():
            import httpx
            async with httpx.AsyncClient(timeout=20.0) as client:
                jobs = await adapter.fetch_jobs(company, client)
                print(f"Found {len(jobs)} jobs for {args.name} via {args.provider}.")
                for j in jobs[:5]:
                    print(f" - [{j.external_id}] {j.title} | {j.location_raw} | {j.posted_at}")

        asyncio.run(run_test())

    elif args.command == "stats":
        db = JobDatabase()
        stats = db.get_stats()
        print("\n--- JOBOPS CATALOG STATS ---")
        print(json.dumps(stats, indent=2))

    elif args.command == "export":
        db = JobDatabase()
        export_limit = args.limit if args.limit and args.limit > 0 else None
        out_path = Path(args.output)
        res = db.export_with_lkg_guard(
            output_path=out_path,
            limit=export_limit,
            max_age_days=args.max_age_days,
            force=args.force,
        )
        if res["status"] == "aborted_lkg":
            print(f"ERROR: {res['reason']}", file=sys.stderr)
            sys.exit(1)
        print(f"Exported {res['exported_jobs']} active jobs to {out_path.resolve()} (telemetry updated)")

    elif args.command == "reap":
        from engine.health import CompanyHealthChecker
        db = JobDatabase()
        checker = CompanyHealthChecker(timeout_seconds=8.0)
        res = asyncio.run(checker.reap_dead_jobs(db, sample=args.sample, concurrency=args.concurrency))
        print(json.dumps({"command": "reap", **res}, indent=2))

    elif args.command == "playbook":
        from engine.playbooks.resolver import PlaybookResolver
        resolver = PlaybookResolver()

        if args.action == "list":
            playbooks = resolver.list_playbooks()
            print("\n=== JOBOPS OPERATIONAL PLAYBOOKS (100% FREE & AUTONOMOUS) ===")
            for pb in playbooks:
                print(f"[{pb['id']}] {pb['name']} ({pb['severity'].upper()}) - Auto-Resolvable: {pb['auto_resolvable']}")
                print(f"   Category: {pb['category']}")
                print(f"   Description: {pb['description']}")
                print("   Symptoms:")
                for sym in pb['trigger_symptoms']:
                    print(f"     * {sym}")
                print()

        elif args.action == "diagnose":
            issues = resolver.diagnose()
            print("\n=== PLAYBOOK SYSTEM HEALTH DIAGNOSIS ===")
            if not issues:
                print("All systems healthy. No known playbook symptoms detected! (100% HEALTHY)")
            else:
                print(f"Detected {len(issues)} actionable issue(s):")
                for iss in issues:
                    d = iss.to_dict()
                    print(f"- [{d['playbook_id']}] {d['playbook_name']}: {d['symptom']}")
                    print(f"  Details: {d['details']}")
                print("\nRun 'python -m engine.cli playbook resolve --auto' to execute zero-cost auto-remediation.")

        elif args.action == "resolve":
            print("\n=== EXECUTING AUTONOMOUS PLAYBOOK RESOLUTION ===")
            if args.id:
                pb_id = args.id.upper()
                if pb_id == "PB-001":
                    res = resolver.resolve_pb001()
                elif pb_id == "PB-002":
                    res = resolver.resolve_pb002()
                elif pb_id == "PB-003":
                    res = resolver.resolve_pb003()
                elif pb_id == "PB-004":
                    res = resolver.resolve_pb004()
                elif pb_id == "PB-005":
                    res = resolver.resolve_pb005()
                elif pb_id == "PB-006":
                    res = resolver.resolve_pb006()
                elif pb_id == "PB-008":
                    res = resolver.resolve_pb008()
                else:
                    print(f"Unknown or manual playbook ID: {pb_id}")
                    return
                print(json.dumps(res, indent=2))
            else:
                summary = resolver.resolve_all()
                print(json.dumps(summary, indent=2))
                if summary.get("system_health") == "100% HEALTHY":
                    print("\nAll diagnosed issues successfully healed! Zero operational downtime, $0.00 spent.")

    elif args.command == "health":
        from engine.health import CompanyHealthChecker, validate_companies_dataset
        with open("registry/companies.json", "r", encoding="utf-8") as f:
            companies = json.load(f)

        validation = validate_companies_dataset(companies)
        print("\n=== COMPANY DATASET VALIDATION REPORT ===")
        print(json.dumps(validation, indent=2))

        if args.validate_only:
            return

        target_count = args.limit if args.limit else len(companies)
        print(f"\nProbing real HTTP health for {target_count} company portals (concurrency={args.concurrency})...")
        checker = CompanyHealthChecker()
        updated = asyncio.run(checker.run_checks(companies, concurrency=args.concurrency, limit=args.limit))

        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(updated, f, indent=2)

        post_val = validate_companies_dataset(updated)
        print(f"\nSaved updated health telemetry to {out_path.resolve()}")
        print("Updated health status distribution:", post_val["status_distribution"])


if __name__ == "__main__":
    main()
