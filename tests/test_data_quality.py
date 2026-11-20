import json
from pathlib import Path
from engine.adapters.registry import get_adapter
from engine.models import Company


def test_no_raw_html_entities_in_jobs_catalog():
    jobs_path = Path(__file__).resolve().parent.parent / "web" / "public" / "jobs.json"
    assert jobs_path.exists(), "web/public/jobs.json must exist"

    with open(jobs_path, "r", encoding="utf-8") as f:
        jobs = json.load(f)

    assert len(jobs) > 0, "jobs.json must contain active jobs"

    bad_entities = []
    for j in jobs:
        summary = j.get("summary", "")
        if any(marker in summary for marker in ["&lt;", "&gt;", "&amp;lt;", "<div", "<p", "<span", "&quot;"]):
            bad_entities.append((j.get("id"), j.get("company_name"), summary[:60]))

    assert len(bad_entities) == 0, f"Found {len(bad_entities)} jobs with uncleaned HTML: {bad_entities[:3]}"


def test_no_other_india_or_null_locations():
    jobs_path = Path(__file__).resolve().parent.parent / "web" / "public" / "jobs.json"
    with open(jobs_path, "r", encoding="utf-8") as f:
        jobs = json.load(f)

    bad_locations = []
    for j in jobs:
        city = j.get("city", "")
        if city in ["Other-India", "null", "undefined", "unknown"]:
            bad_locations.append((j.get("id"), j.get("company_name"), city))

    assert len(bad_locations) == 0, f"Found {len(bad_locations)} jobs with un-normalized locations: {bad_locations[:3]}"


def test_all_registered_companies_have_adapters():
    companies_path = Path(__file__).resolve().parent.parent / "registry" / "companies.json"
    assert companies_path.exists()

    with open(companies_path, "r", encoding="utf-8") as f:
        companies_data = json.load(f)

    for item in companies_data:
        co = Company(**item)
        adapter = get_adapter(co.ats_provider)
        assert adapter is not None, f"No adapter found for {co.name} ({co.ats_provider})"
