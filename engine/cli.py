import argparse
import asyncio
import json
from pathlib import Path
from engine.collector import JobCollector
from engine.models import Company
from engine.adapters.registry import get_adapter
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
        jobs = db.get_filtered_jobs(limit=2500)
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            # Compact JSON representation for faster edge loading over CDN
            json.dump(jobs, f, separators=(",", ":"))
        print(f"Exported {len(jobs)} active jobs to {out_path.resolve()}")


if __name__ == "__main__":
    main()
