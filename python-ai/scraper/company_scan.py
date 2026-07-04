import asyncio
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone

from scraper.preferences import parse_posted_at, posted_cutoff, POSTED_WITHIN_LABELS
from scraper.schemas import CompanyScanResult, PostedWithin, RecentCareersOfferRow, ScannedOfferBrief
from scraper.scrapers import fetch_all_jobs

SCAN_ALL_CONCURRENCY = 10


def _job_in_window(posted_at: str | None, cutoff: datetime | None) -> bool | None:
    if cutoff is None:
        return True
    dt = parse_posted_at(posted_at)
    if dt is None:
        return None
    return dt >= cutoff


async def scan_monitored_company(
    company: dict,
    posted_within: PostedWithin = "7d",
) -> CompanyScanResult:
    jobs = await fetch_all_jobs([company])
    cutoff = posted_cutoff(posted_within)
    recent: list[ScannedOfferBrief] = []
    unknown_date = 0

    for job in jobs:
        in_window = _job_in_window(job.posted_at, cutoff)
        if in_window is True:
            recent.append(
                ScannedOfferBrief(
                    role=job.role,
                    posted_at=job.posted_at,
                    apply_url=job.apply_url,
                    location=job.location or None,
                    source=job.source,
                )
            )
        elif in_window is None:
            unknown_date += 1

    recent.sort(
        key=lambda o: parse_posted_at(o.posted_at) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )

    return CompanyScanResult(
        company_id=company.get("id"),
        company_name=company.get("name") or "",
        careers_url=company.get("careers_url") or "",
        ats=company.get("ats") or "",
        slug=company.get("slug") or "",
        posted_within=posted_within,
        posted_within_label=POSTED_WITHIN_LABELS.get(posted_within, posted_within),
        total_jobs=len(jobs),
        recent_count=len(recent),
        unknown_date_count=unknown_date,
        recent_offers=recent,
        scanned_at=datetime.now(timezone.utc),
    )


async def scan_all_monitored_companies(
    companies: list[dict],
    posted_within: PostedWithin = "24h",
    *,
    on_company_scanned: Callable[[int, int], Awaitable[None] | None] | None = None,
) -> tuple[list[RecentCareersOfferRow], int, int]:
    if not companies:
        return [], 0, 0

    sem = asyncio.Semaphore(SCAN_ALL_CONCURRENCY)
    companies_ok = 0
    companies_failed = 0
    rows: list[RecentCareersOfferRow] = []

    async def scan_one(company: dict) -> None:
        nonlocal companies_ok, companies_failed
        async with sem:
            try:
                result = await scan_monitored_company(company, posted_within)
            except Exception:
                companies_failed += 1
                return
            companies_ok += 1
            company_id = company.get("id")
            if on_company_scanned and company_id is not None:
                maybe = on_company_scanned(company_id, result.total_jobs)
                if asyncio.iscoroutine(maybe):
                    await maybe
            for offer in result.recent_offers:
                rows.append(
                    RecentCareersOfferRow(
                        company_id=company_id,
                        company_name=result.company_name,
                        role=offer.role,
                        posted_at=offer.posted_at,
                        apply_url=offer.apply_url,
                        location=offer.location,
                        source=offer.source,
                    )
                )

    await asyncio.gather(*[scan_one(company) for company in companies])
    rows.sort(
        key=lambda row: parse_posted_at(row.posted_at) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return rows, companies_ok, companies_failed


async def scan_all_monitored_companies_by_title(
    companies: list[dict],
    title_query: str,
    *,
    on_company_scanned: Callable[[int, int], Awaitable[None] | None] | None = None,
) -> tuple[list[RecentCareersOfferRow], int, int]:
    needle = title_query.strip().lower()
    if not needle:
        return [], 0, 0

    sem = asyncio.Semaphore(SCAN_ALL_CONCURRENCY)
    companies_ok = 0
    companies_failed = 0
    rows: list[RecentCareersOfferRow] = []

    async def scan_one(company: dict) -> None:
        nonlocal companies_ok, companies_failed
        async with sem:
            try:
                jobs = await fetch_all_jobs([company])
            except Exception:
                companies_failed += 1
                return
            companies_ok += 1
            company_id = company.get("id")
            if on_company_scanned and company_id is not None:
                maybe = on_company_scanned(company_id, len(jobs))
                if asyncio.iscoroutine(maybe):
                    await maybe
            company_name = company.get("name") or ""
            for job in jobs:
                role = job.role or ""
                if needle not in role.lower():
                    continue
                rows.append(
                    RecentCareersOfferRow(
                        company_id=company_id,
                        company_name=company_name,
                        role=role,
                        posted_at=job.posted_at,
                        apply_url=job.apply_url,
                        location=job.location or None,
                        source=job.source,
                    )
                )

    await asyncio.gather(*[scan_one(company) for company in companies])
    rows.sort(
        key=lambda row: parse_posted_at(row.posted_at) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return rows, companies_ok, companies_failed
