"""
JobOps Command Line Interface.
Run scans, test adapters, inspect database stats, and export catalogs.
"""
import asyncio
import json
import argparse
from pathlib import Path
from engine.models import Company
from engine.collector import JobCollector


def load_companies(path: str = "registry/companies.json"):
    p = Path(path)
    if not p.exists():
        print(f"File not found: {path}")
        return []
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
        return [Company(**item) for item in data]


async def run_scan(max_age_hours: float, concurrency: int):
    companies = load_companies()
    print(f"Loaded {len(companies)} companies. Starting JobOps scan (Freshness window: {max_age_hours}h)...")
    
    collector = JobCollector(max_age_hours=max_age_hours)
    results = await collector.run(companies, concurrency=concurrency)
    
    print("\n--- Scan Results ---")
    total_fetched = sum(r["fetched"] for r in results)
    total_fresh = sum(r["fresh"] for r in results)
    total_new = sum(r["new"] for r in results)
    total_eng = sum(r["engineering"] for r in results)
    
    for r in results:
        print(f"{r['company']}: {r['fetched']} fetched, {r['fresh']} fresh (<=24h), {r['new']} new, {r['engineering']} engineering")
        
    print(f"\nTotals: {total_fetched} fetched | {total_fresh} fresh | {total_new} new stored | {total_eng} engineering")
    print("Catalog saved to data/jobops.db and exported to data/catalog.json")


def main():
    parser = argparse.ArgumentParser(description="JobOps Ingestion Engine")
    subparsers = parser.add_subparsers(dest="command")

    scan_parser = subparsers.add_parser("scan", help="Run 24-hour job scan across registry")
    scan_parser.add_argument("--age", type=float, default=24.0, help="Freshness window in hours (default: 24.0)")
    scan_parser.add_argument("--concurrency", type=int, default=8, help="Concurrent workers (default: 8)")

    args = parser.parse_args()

    if args.command == "scan":
        asyncio.run(run_scan(args.age, args.concurrency))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
