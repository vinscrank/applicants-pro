import asyncio
import os
import time
from dataclasses import dataclass
from typing import Optional
import httpx

ATS_JOBS_CACHE_TTL_SEC = max(0, int(os.getenv("ATS_JOBS_CACHE_TTL_SEC", "300")))
_COMPANY_JOBS_CACHE: dict[str, tuple[float, list["RawJob"]]] = {}


@dataclass
class RawJob:
    company: str
    role: str
    apply_url: str
    source: str
    description: str
    location: str
    posted_at: Optional[str] = None
    job_id: str = ""
    origin: str = "ats"


def _normalize_date(value) -> Optional[str]:
    if value is None:
        return None
    return str(value)


COMPANIES = [
    {"name": "Stripe", "ats": "greenhouse", "slug": "stripe"},
    {"name": "MongoDB", "ats": "greenhouse", "slug": "mongodb"},
    {"name": "Datadog", "ats": "greenhouse", "slug": "datadog"},
    {"name": "HubSpot", "ats": "greenhouse", "slug": "hubspot"},
    {"name": "Klaviyo", "ats": "greenhouse", "slug": "klaviyo"},
    {"name": "Vanta", "ats": "greenhouse", "slug": "vanta"},
    {"name": "Intercom", "ats": "greenhouse", "slug": "intercom"},
    {"name": "Udemy", "ats": "greenhouse", "slug": "udemy"},
    {"name": "Deliveroo", "ats": "greenhouse", "slug": "deliveroo"},
    {"name": "Keeper Security", "ats": "greenhouse", "slug": "keepersecurity"},
    {"name": "Trustpilot", "ats": "greenhouse", "slug": "trustpilot"},
    {"name": "LearnUpon", "ats": "greenhouse", "slug": "learnupon"},
    {"name": "Circit", "ats": "greenhouse", "slug": "circit"},
    {"name": "Scorebuddy", "ats": "greenhouse", "slug": "scorebuddy"},
    {"name": "Salesforce", "ats": "greenhouse", "slug": "salesforce"},
    {"name": "Zoom", "ats": "greenhouse", "slug": "zoom"},
    {"name": "IBM", "ats": "greenhouse", "slug": "ibm"},
    {"name": "TSMG", "ats": "lever", "slug": "tsmg"},
    {"name": "Alimentiv", "ats": "lever", "slug": "alimentiv"},
    {"name": "Datalex", "ats": "workable", "slug": "datalex"},
    {"name": "EXADS", "ats": "workable", "slug": "exads"},
    {"name": "GLG", "ats": "greenhouse", "slug": "glg"},
]


async def fetch_greenhouse(slug: str, company_name: str, client: httpx.AsyncClient) -> list[RawJob]:
    url = f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
    try:
        r = await client.get(url, timeout=20)
        if r.status_code != 200:
            return []
        data = r.json()
        jobs = []
        for j in data.get("jobs", []):
            loc = j.get("location", {}).get("name", "") if isinstance(j.get("location"), dict) else str(j.get("location", ""))
            jobs.append(RawJob(
                company=company_name,
                role=j.get("title", ""),
                apply_url=j.get("absolute_url", ""),
                source="greenhouse",
                description=j.get("content", "") or "",
                location=loc,
                posted_at=_normalize_date(j.get("updated_at") or j.get("first_published")),
                job_id=str(j.get("id", "")),
            ))
        return jobs
    except Exception:
        return []


async def fetch_lever(slug: str, company_name: str, client: httpx.AsyncClient) -> list[RawJob]:
    url = f"https://api.lever.co/v0/postings/{slug}?mode=json"
    try:
        r = await client.get(url, timeout=20)
        if r.status_code != 200:
            return []
        jobs = []
        for j in r.json():
            loc = j.get("categories", {}).get("location", "")
            jobs.append(RawJob(
                company=company_name,
                role=j.get("text", ""),
                apply_url=j.get("hostedUrl", j.get("applyUrl", "")),
                source="lever",
                description=j.get("descriptionPlain", "") or j.get("description", "") or "",
                location=loc,
                posted_at=_normalize_date(j.get("createdAt")),
                job_id=j.get("id", ""),
            ))
        return jobs
    except Exception:
        return []


async def fetch_workable(slug: str, company_name: str, client: httpx.AsyncClient) -> list[RawJob]:
    url = f"https://apply.workable.com/api/v1/accounts/{slug}/jobs"
    try:
        r = await client.get(url, timeout=20)
        if r.status_code != 200:
            return []
        data = r.json()
        jobs = []
        for j in data.get("jobs", data if isinstance(data, list) else []):
            if not isinstance(j, dict):
                continue
            loc = j.get("location", {}).get("country", "") if isinstance(j.get("location"), dict) else str(j.get("location", ""))
            city = ""
            if isinstance(j.get("location"), dict):
                city = j["location"].get("city", "")
            full_loc = f"{city}, {loc}".strip(", ")
            shortcode = j.get("shortcode", "")
            jobs.append(RawJob(
                company=company_name,
                role=j.get("title", ""),
                apply_url=f"https://apply.workable.com/{slug}/j/{shortcode}/" if shortcode else j.get("url", ""),
                source="workable",
                description=j.get("description", "") or "",
                location=full_loc,
                posted_at=_normalize_date(j.get("published")),
                job_id=shortcode,
            ))
        return jobs
    except Exception:
        return []


async def fetch_ashby(slug: str, company_name: str, client: httpx.AsyncClient) -> list[RawJob]:
    url = f"https://api.ashbyhq.com/posting-api/job-board/{slug}"
    try:
        r = await client.get(url, timeout=20)
        if r.status_code != 200:
            return []
        data = r.json()
        jobs = []
        for j in data.get("jobs", []):
            loc = j.get("location", "")
            jobs.append(RawJob(
                company=company_name,
                role=j.get("title", ""),
                apply_url=j.get("jobUrl", ""),
                source="ashby",
                description=j.get("descriptionPlain", "") or "",
                location=loc,
                posted_at=_normalize_date(j.get("publishedAt")),
                job_id=j.get("id", ""),
            ))
        return jobs
    except Exception:
        return []


async def fetch_website(careers_url: str, company_name: str, client: httpx.AsyncClient) -> list[RawJob]:
    from .careers_page import scrape_careers_page

    return await scrape_careers_page(careers_url, company_name, client)


FETCHERS = {
    "greenhouse": fetch_greenhouse,
    "lever": fetch_lever,
    "workable": fetch_workable,
    "ashby": fetch_ashby,
    "website": fetch_website,
}


async def _fetch_company_jobs(co: dict, client: httpx.AsyncClient) -> list[RawJob]:
    ats = co.get("ats") or ""
    slug = co.get("slug") or ""
    careers_url = (co.get("careers_url") or "").strip()
    cache_key = f"{ats}:{slug}:{careers_url}"
    if ATS_JOBS_CACHE_TTL_SEC > 0:
        cached = _COMPANY_JOBS_CACHE.get(cache_key)
        if cached and time.monotonic() - cached[0] < ATS_JOBS_CACHE_TTL_SEC:
            return cached[1]

    fetcher = FETCHERS.get(ats)
    if not fetcher:
        return []
    if ats == "website":
        if not careers_url:
            return []
        jobs = await fetcher(careers_url, co["name"], client)
    else:
        jobs = await fetcher(slug, co["name"], client)

    if ATS_JOBS_CACHE_TTL_SEC > 0:
        _COMPANY_JOBS_CACHE[cache_key] = (time.monotonic(), jobs)
    return jobs


async def fetch_all_jobs(companies: list[dict] | None = None) -> list[RawJob]:
    if not companies:
        companies = COMPANIES
    ordered = sorted(companies, key=lambda co: (co.get("name") or "").lower())
    limits = httpx.Limits(max_connections=80, max_keepalive_connections=40)
    timeout = float(os.getenv("ATS_FETCH_TIMEOUT_SEC", "12"))
    async with httpx.AsyncClient(follow_redirects=True, timeout=timeout, limits=limits) as client:
        tasks = [_fetch_company_jobs(co, client) for co in ordered]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    all_jobs: list[RawJob] = []
    for result in results:
        if isinstance(result, list):
            all_jobs.extend(result)
    all_jobs.sort(key=lambda job: (job.company.lower(), job.role.lower(), job.apply_url))
    return all_jobs
