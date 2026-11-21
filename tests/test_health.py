import pytest
from engine.health import CompanyHealthChecker, validate_companies_dataset


def test_validate_companies_dataset_valid():
    sample = [
        {
            "id": "google",
            "name": "Google",
            "ats_provider": "google_careers",
            "careers_url": "https://www.google.com/about/careers",
            "health_status": "healthy",
        },
        {
            "id": "meta",
            "name": "Meta",
            "ats_provider": "custom",
            "careers_url": "https://www.metacareers.com",
            "health_status": "unknown",
        },
    ]
    res = validate_companies_dataset(sample)
    assert res["is_valid"] is True
    assert res["total_records"] == 2
    assert res["unique_ids_count"] == 2
    assert len(res["duplicate_ids"]) == 0
    assert res["invalid_urls_count"] == 0
    assert res["status_distribution"]["healthy"] == 1
    assert res["status_distribution"]["unknown"] == 1


def test_validate_companies_dataset_detects_duplicates_and_invalid_urls():
    sample = [
        {
            "id": "dup_id",
            "name": "Company A",
            "ats_provider": "greenhouse",
            "careers_url": "https://example.com/careers",
        },
        {
            "id": "dup_id",
            "name": "Company B",
            "ats_provider": "lever",
            "careers_url": "ftp://invalid-url.com",
        },
        {
            "id": "missing_fields_id",
            # missing name, ats_provider, careers_url
        },
    ]
    res = validate_companies_dataset(sample)
    assert res["is_valid"] is False
    assert "dup_id" in res["duplicate_ids"]
    assert res["invalid_urls_count"] == 2  # one ftp and one missing
    assert res["missing_fields_count"] >= 1


@pytest.mark.asyncio
async def test_health_checker_invalid_url():
    checker = CompanyHealthChecker()
    import httpx
    async with httpx.AsyncClient() as client:
        res = await checker.probe_url(client, "not_a_valid_url")
        assert res["health_status"] == "unreachable"
        assert res["status_code"] is None
        assert "Invalid or missing URL scheme" in res["error"]


@pytest.mark.asyncio
async def test_health_checker_check_company_structure():
    checker = CompanyHealthChecker()
    company = {
        "id": "test_co",
        "name": "Test Co",
        "ats_provider": "greenhouse",
        "careers_url": "invalid_url_scheme",
    }
    import httpx
    async with httpx.AsyncClient() as client:
        updated = await checker.check_company(client, company)
        assert updated["id"] == "test_co"
        assert updated["health_status"] == "unreachable"
        assert "last_checked_at" in updated
