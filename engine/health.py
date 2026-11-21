import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger("jobops.health")
REPO_ROOT = Path(__file__).resolve().parent.parent
COMPANIES_PATH = REPO_ROOT / "registry" / "companies.json"
WEB_COMPANIES_PATH = REPO_ROOT / "web" / "public" / "companies.json"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36 JobOps-HealthProber/1.0"
)


class CompanyHealthChecker:
    def __init__(self, timeout_seconds: float = 10.0):
        self.timeout_seconds = timeout_seconds

    async def probe_url(self, client: httpx.AsyncClient, url: str) -> Dict[str, Any]:
        """Probes a single URL with real HTTP GET/HEAD and captures telemetry."""
        if not url or not url.startswith(("http://", "https://")):
            return {
                "health_status": "unreachable",
                "status_code": None,
                "response_time_ms": None,
                "error": "Invalid or missing URL scheme",
                "last_checked_at": datetime.now(timezone.utc).isoformat(),
            }

        start_time = time.perf_counter()
        try:
            # We first try a polite HEAD request, falling back to GET if 405/403
            try:
                response = await client.head(url, follow_redirects=True)
                if response.status_code in (405, 403, 400):
                    response = await client.get(url, follow_redirects=True)
            except Exception:
                response = await client.get(url, follow_redirects=True)

            latency_ms = round((time.perf_counter() - start_time) * 1000)
            status_code = response.status_code

            # Classify based on true HTTP status and latency
            if 200 <= status_code < 300:
                if latency_ms >= 5000:
                    health_status = "degraded"
                else:
                    health_status = "healthy"
                error = None
            elif status_code == 429:
                health_status = "degraded"
                error = "HTTP 429 Rate Limited"
            elif status_code == 403:
                # Often Cloudflare / Akamai bot management on careers portal
                health_status = "unknown"
                error = "HTTP 403 Access Restricted / WAF Challenge"
            elif status_code in (404, 410):
                health_status = "unreachable"
                error = f"HTTP {status_code} Not Found"
            elif status_code >= 500:
                health_status = "unreachable"
                error = f"HTTP {status_code} Server Error"
            else:
                health_status = "unknown"
                error = f"HTTP {status_code}"

            return {
                "health_status": health_status,
                "status_code": status_code,
                "response_time_ms": latency_ms,
                "error": error,
                "last_checked_at": datetime.now(timezone.utc).isoformat(),
            }

        except httpx.TimeoutException:
            latency_ms = round((time.perf_counter() - start_time) * 1000)
            return {
                "health_status": "unreachable",
                "status_code": None,
                "response_time_ms": latency_ms,
                "error": f"Connection timed out (> {self.timeout_seconds}s)",
                "last_checked_at": datetime.now(timezone.utc).isoformat(),
            }
        except httpx.ConnectError as ce:
            latency_ms = round((time.perf_counter() - start_time) * 1000)
            return {
                "health_status": "unreachable",
                "status_code": None,
                "response_time_ms": latency_ms,
                "error": f"DNS / Connection failed: {str(ce)[:80]}",
                "last_checked_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            latency_ms = round((time.perf_counter() - start_time) * 1000)
            return {
                "health_status": "unknown",
                "status_code": None,
                "response_time_ms": latency_ms,
                "error": f"Probe error: {str(e)[:80]}",
                "last_checked_at": datetime.now(timezone.utc).isoformat(),
            }

    async def check_company(
        self, client: httpx.AsyncClient, company_record: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Probes a company's career URL and returns updated record."""
        target_url = company_record.get("careers_url") or ""
        probe_result = await self.probe_url(client, target_url)

        updated = dict(company_record)
        updated["health_status"] = probe_result["health_status"]
        updated["response_time_ms"] = probe_result["response_time_ms"]
        updated["status_code"] = probe_result["status_code"]
        updated["last_checked_at"] = probe_result["last_checked_at"]
        if probe_result.get("error"):
            updated["health_error"] = probe_result["error"]
        else:
            updated.pop("health_error", None)

        return updated

    async def run_checks(
        self,
        companies: List[Dict[str, Any]],
        concurrency: int = 10,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Runs health checks across companies with controlled concurrency."""
        to_check = companies[:limit] if limit else companies
        semaphore = asyncio.Semaphore(concurrency)
        results: List[Dict[str, Any]] = []

        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds, headers=headers) as client:
            async def worker(item: Dict[str, Any]):
                async with semaphore:
                    # Small jitter delay to prevent bursting
                    await asyncio.sleep(0.05)
                    return await self.check_company(client, item)

            tasks = [worker(c) for c in to_check]
            results = await asyncio.gather(*tasks)

        # If limit was applied, keep remaining companies with honest status
        if limit and limit < len(companies):
            checked_ids = {r["id"] for r in results}
            for comp in companies:
                if comp["id"] not in checked_ids:
                    unprobed = dict(comp)
                    # Unchecked companies are marked 'unknown' honestly rather than fabricated 'healthy'
                    if unprobed.get("health_status") == "healthy" and not unprobed.get("status_code"):
                        unprobed["health_status"] = "unknown"
                        unprobed["response_time_ms"] = None
                    results.append(unprobed)

        return results


def validate_companies_dataset(companies: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Validates the schema, uniqueness, and integrity of the companies dataset."""
    total = len(companies)
    seen_ids = set()
    duplicate_ids = []
    invalid_urls = []
    missing_fields = []
    status_counts: Dict[str, int] = {}

    required_keys = {"id", "name", "ats_provider", "careers_url"}

    for c in companies:
        c_id = c.get("id")
        if not c_id or c_id in seen_ids:
            duplicate_ids.append(c_id or "missing_id")
        else:
            seen_ids.add(c_id)

        missing = [k for k in required_keys if not c.get(k)]
        if missing:
            missing_fields.append({"id": c_id, "missing": missing})

        url = c.get("careers_url", "")
        if not url.startswith(("http://", "https://")):
            invalid_urls.append({"id": c_id, "url": url})

        status = c.get("health_status", "unknown")
        status_counts[status] = status_counts.get(status, 0) + 1

    return {
        "total_records": total,
        "unique_ids_count": len(seen_ids),
        "duplicate_ids": duplicate_ids,
        "invalid_urls_count": len(invalid_urls),
        "invalid_urls_sample": invalid_urls[:5],
        "missing_fields_count": len(missing_fields),
        "status_distribution": status_counts,
        "is_valid": len(duplicate_ids) == 0 and len(invalid_urls) == 0 and len(missing_fields) == 0,
    }
