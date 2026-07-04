import asyncio
import json
import os
import re
from html import unescape
from urllib.parse import quote_plus

import httpx

from scraper.schemas import SearchCommand
from scraper.scrapers import RawJob

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)
LINKEDIN_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept-Language": "en-US,en;q=0.9",
}
INDEED_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml",
}
MAX_LINKEDIN_PAGES = 4
LINKEDIN_PAGE_SIZE = 25
MAX_INDEED_JOBS = 60
MAX_UPWORK_JOBS = 50
INDEED_DOMAIN = os.getenv("INDEED_DOMAIN", "").strip()
APIFY_UPWORK_ACTOR = os.getenv("APIFY_UPWORK_ACTOR", "nahom.network~upwork-job-finder")


def _clean_text(value: str) -> str:
    text = unescape(re.sub(r"<[^>]+>", " ", value or ""))
    return re.sub(r"\s+", " ", text).strip()


def _search_keywords(command: SearchCommand) -> str:
    queries = _linkedin_role_queries(command)
    if queries:
        return queries[0]
    prompt = (command.prompt_text or "").strip()
    if not prompt:
        return ""
    parts = prompt.split()
    if len(parts) <= 10:
        return prompt
    return " ".join(parts[:10])


def _linkedin_role_queries(command: SearchCommand) -> list[str]:
    roles = [r.strip() for r in command.allowed_roles if r.strip()]
    if len(roles) >= 2:
        return roles[:3]
    if len(roles) == 1:
        return [roles[0]]
    from scraper.prompt_terms import prompt_search_terms

    terms = prompt_search_terms(command)
    if terms:
        return [" ".join(terms[:4])]
    return []


def _portal_location_areas(command: SearchCommand) -> list[str]:
    from scraper.location_match import location_rules_for_command

    areas: list[str] = []
    seen: set[str] = set()
    for rule in location_rules_for_command(command):
        for area in rule.areas:
            cleaned = area.strip()
            if not cleaned:
                continue
            key = cleaned.lower()
            if key in seen:
                continue
            seen.add(key)
            areas.append(cleaned)
    if areas:
        return areas
    return [loc.strip() for loc in command.locations if loc.strip()]


def _search_location(command: SearchCommand) -> str:
    areas = _portal_location_areas(command)
    if not areas:
        return ""
    for area in areas:
        if "," in area:
            return area
    ascii_areas = [a for a in areas if not any(ord(c) > 127 for c in a)]
    if len(ascii_areas) >= 2:
        ascii_areas.sort(key=len)
        return f"{ascii_areas[0]}, {ascii_areas[-1]}"
    if len(areas) >= 2:
        ordered = sorted(areas, key=len)
        return f"{ordered[0]}, {ordered[-1]}"
    return areas[0]


LINKEDIN_F_TPR = {
    "24h": "r86400",
    "7d": "r604800",
    "30d": "r2592000",
    "90d": "r7776000",
}

JSEARCH_DATE_POSTED = {
    "24h": "today",
    "7d": "week",
    "30d": "month",
    "90d": "month",
}


def _linkedin_time_filter(command: SearchCommand) -> str:
    days = getattr(command, "posted_within_days", None)
    if days is not None and days > 0:
        return f"r{days * 86400}"
    posted_within = getattr(command, "posted_within", "any") or "any"
    return LINKEDIN_F_TPR.get(posted_within, "")


def _jsearch_date_posted(command: SearchCommand) -> str:
    days = getattr(command, "posted_within_days", None)
    if days is not None and days > 0:
        if days <= 1:
            return "today"
        if days <= 7:
            return "week"
        return "month"
    posted_within = getattr(command, "posted_within", "any") or "any"
    return JSEARCH_DATE_POSTED.get(posted_within, "month")

def _parse_linkedin_cards(html: str) -> list[RawJob]:
    jobs: list[RawJob] = []
    seen_urls: set[str] = set()
    for match in re.finditer(r'data-entity-urn="urn:li:jobPosting:\d+"', html):
        chunk = html[match.start(): match.start() + 5000]
        link_match = re.search(r'base-card__full-link[^>]+href="([^"]+)"', chunk)
        title_match = re.search(r"base-search-card__title\">\s*(.*?)\s*</h3>", chunk, re.S)
        company_match = re.search(
            r'hidden-nested-link[^>]*>\s*(.*?)\s*</a>',
            chunk,
            re.S,
        )
        location_match = re.search(r"job-search-card__location\">\s*(.*?)\s*</span>", chunk, re.S)
        date_match = re.search(r'<time[^>]+datetime="([^"]+)"', chunk)
        if not link_match or not title_match:
            continue
        apply_url = unescape(link_match.group(1).replace("&amp;", "&"))
        if apply_url in seen_urls:
            continue
        seen_urls.add(apply_url)
        role = _clean_text(title_match.group(1))
        company = _clean_text(company_match.group(1)) if company_match else ""
        if not company:
            slug_match = re.search(r"/jobs/view/[^/?]+-at-([^/?]+)", apply_url)
            if slug_match:
                company = slug_match.group(1).replace("-", " ").title()
        if not company:
            company = "—"
        location = _clean_text(location_match.group(1)) if location_match else ""
        posted_at = date_match.group(1) if date_match else None
        if not role:
            continue
        jobs.append(
            RawJob(
                company=company,
                role=role,
                apply_url=apply_url,
                source="linkedin",
                origin="linkedin",
                description=f"{role} at {company}. {location}".strip(),
                location=location,
                posted_at=posted_at,
            )
        )
    return jobs


async def _fetch_linkedin_query(
    keywords: str,
    location: str,
    time_filter: str,
    client: httpx.AsyncClient,
    seen_urls: set[str],
) -> list[RawJob]:
    batch: list[RawJob] = []
    for page in range(MAX_LINKEDIN_PAGES):
        start = page * LINKEDIN_PAGE_SIZE
        query = f"keywords={quote_plus(keywords)}&start={start}"
        if location:
            query = f"keywords={quote_plus(keywords)}&location={quote_plus(location)}&start={start}"
        if time_filter:
            query += f"&f_TPR={time_filter}"
        url = f"https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?{query}"
        try:
            response = await client.get(url, headers=LINKEDIN_HEADERS, timeout=25)
            if response.status_code != 200 or not response.text.strip():
                break
            page_jobs = _parse_linkedin_cards(response.text)
            if not page_jobs:
                break
            for job in page_jobs:
                if job.apply_url in seen_urls:
                    continue
                seen_urls.add(job.apply_url)
                batch.append(job)
            if len(page_jobs) < 10:
                break
        except Exception:
            break
        await asyncio.sleep(0.35)
    return batch


async def fetch_linkedin_jobs(
    command: SearchCommand,
    client: httpx.AsyncClient,
) -> list[RawJob]:
    queries = _linkedin_role_queries(command)
    if not queries:
        return []
    location = _search_location(command)
    time_filter = _linkedin_time_filter(command)
    all_jobs: list[RawJob] = []
    seen_urls: set[str] = set()

    for keywords in queries:
        all_jobs.extend(
            await _fetch_linkedin_query(keywords, location, time_filter, client, seen_urls)
        )

    all_jobs.sort(key=lambda job: (job.company.lower(), job.role.lower(), job.apply_url))
    return all_jobs


def _parse_indeed_mosaic(html: str) -> list[RawJob]:
    jobs: list[RawJob] = []
    seen_keys: set[str] = set()
    patterns = [
        re.compile(
            r'"jobkey"\s*:\s*"(?P<key>[a-f0-9]+)".*?'
            r'"title"\s*:\s*"(?P<title>(?:\\.|[^"\\])*)".*?'
            r'"company"\s*:\s*"(?P<company>(?:\\.|[^"\\])*)".*?'
            r'"formattedLocation"\s*:\s*"(?P<location>(?:\\.|[^"\\])*)"',
            re.S,
        ),
        re.compile(
            r'"jobKey"\s*:\s*"(?P<key>[a-f0-9]+)".*?'
            r'"jobTitle"\s*:\s*"(?P<title>(?:\\.|[^"\\])*)".*?'
            r'"companyName"\s*:\s*"(?P<company>(?:\\.|[^"\\])*)".*?'
            r'"formattedLocation"\s*:\s*"(?P<location>(?:\\.|[^"\\])*)"',
            re.S,
        ),
    ]
    for pattern in patterns:
        for match in pattern.finditer(html):
            key = match.group("key")
            if key in seen_keys:
                continue
            seen_keys.add(key)
            title = json.loads(f'"{match.group("title")}"')
            company = json.loads(f'"{match.group("company")}"')
            location = json.loads(f'"{match.group("location")}"')
            apply_url = f"https://{INDEED_DOMAIN}.indeed.com/viewjob?jk={key}"
            jobs.append(
                RawJob(
                    company=company,
                    role=title,
                    apply_url=apply_url,
                    source="indeed",
                    origin="indeed",
                    description=f"{title} at {company}. {location}".strip(),
                    location=location,
                    posted_at=None,
                    job_id=key,
                )
            )
    return jobs


async def fetch_indeed_jobs(
    command: SearchCommand,
    client: httpx.AsyncClient,
) -> list[RawJob]:
    rapidapi_key = os.getenv("RAPIDAPI_KEY", "").strip()
    if rapidapi_key:
        return await _fetch_indeed_via_jsearch(command, client, rapidapi_key)
    if not INDEED_DOMAIN:
        return []
    return await _fetch_indeed_html(command, client)


async def _fetch_indeed_html(
    command: SearchCommand,
    client: httpx.AsyncClient,
) -> list[RawJob]:
    keywords = _search_keywords(command)
    location = _search_location(command)
    if not keywords:
        return []
    url = (
        f"https://{INDEED_DOMAIN}.indeed.com/jobs"
        f"?q={quote_plus(keywords)}&l={quote_plus(location)}&fromage=30&sort=date"
    )
    try:
        response = await client.get(url, headers=INDEED_HEADERS, timeout=25)
        if response.status_code != 200:
            return []
        jobs = _parse_indeed_mosaic(response.text)
        return jobs[:MAX_INDEED_JOBS]
    except Exception:
        return []


async def _fetch_indeed_via_jsearch(
    command: SearchCommand,
    client: httpx.AsyncClient,
    api_key: str,
) -> list[RawJob]:
    keywords = _search_keywords(command)
    location = _search_location(command)
    if not keywords:
        return []
    query = keywords if not location else f"{keywords} in {location}"
    jobs: list[RawJob] = []
    seen_urls: set[str] = set()
    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }
    jsearch_country = os.getenv("JSEARCH_COUNTRY", "").strip()
    for page in range(1, 3):
        url = (
            "https://jsearch.p.rapidapi.com/search"
            f"?query={quote_plus(query)}&page={page}&num_pages=1&date_posted={_jsearch_date_posted(command)}"
        )
        if jsearch_country:
            url += f"&country={quote_plus(jsearch_country)}"
        try:
            response = await client.get(url, headers=headers, timeout=25)
            if response.status_code != 200:
                break
            payload = response.json()
            for item in payload.get("data", []):
                apply_url = (
                    item.get("job_apply_link")
                    or item.get("job_google_link")
                    or item.get("job_link")
                    or ""
                ).strip()
                if not apply_url or apply_url in seen_urls:
                    continue
                publisher = (item.get("job_publisher") or "").lower()
                if "linkedin" in publisher or "linkedin.com" in apply_url.lower():
                    continue
                if "indeed" not in publisher and "indeed.com" not in apply_url.lower():
                    continue
                seen_urls.add(apply_url)
                company = (item.get("employer_name") or "—").strip()
                role = (item.get("job_title") or "").strip()
                if not role:
                    continue
                location_parts = [
                    item.get("job_city") or "",
                    item.get("job_state") or "",
                    item.get("job_country") or "",
                ]
                loc = ", ".join(p for p in location_parts if p).strip(", ")
                jobs.append(
                    RawJob(
                        company=company,
                        role=role,
                        apply_url=apply_url,
                        source="indeed",
                        origin="indeed",
                        description=(item.get("job_description") or f"{role} at {company}")[:2000],
                        location=loc,
                        posted_at=item.get("job_posted_at_datetime_utc"),
                        job_id=str(item.get("job_id") or ""),
                    )
                )
            if not payload.get("data"):
                break
        except Exception:
            break
        await asyncio.sleep(0.25)
    return jobs[:MAX_INDEED_JOBS]


def _pick_item_field(item: dict, *keys: str) -> str:
    for key in keys:
        value = item.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


async def _fetch_upwork_via_apify(
    command: SearchCommand,
    client: httpx.AsyncClient,
    token: str,
) -> list[RawJob]:
    query = _search_keywords(command)
    url = f"https://api.apify.com/v2/acts/{APIFY_UPWORK_ACTOR}/run-sync-get-dataset-items"
    try:
        response = await client.post(
            url,
            params={"token": token, "timeout": 120},
            json={"query": query, "page": 1},
            timeout=130,
        )
        if response.status_code != 200:
            return []
        payload = response.json()
        items = payload if isinstance(payload, list) else payload.get("data", [])
        jobs: list[RawJob] = []
        seen_urls: set[str] = set()
        for item in items:
            if not isinstance(item, dict):
                continue
            apply_url = _pick_item_field(item, "url", "jobUrl", "job_url", "link", "jobLink")
            if apply_url and not apply_url.startswith("http"):
                apply_url = f"https://www.upwork.com{apply_url}"
            if not apply_url or "upwork.com" not in apply_url.lower() or apply_url in seen_urls:
                continue
            role = _pick_item_field(item, "title", "jobTitle", "job_title", "name")
            if not role:
                continue
            seen_urls.add(apply_url)
            company = _pick_item_field(item, "clientName", "client_name", "company", "employerName") or "Cliente Upwork"
            location = _pick_item_field(item, "location", "clientLocation", "country")
            description = _pick_item_field(item, "description", "snippet", "jobDescription") or f"{role} · {company}"
            jobs.append(
                RawJob(
                    company=company,
                    role=role,
                    apply_url=apply_url,
                    source="upwork",
                    origin="upwork",
                    description=description[:2000],
                    location=location,
                    posted_at=_pick_item_field(item, "publishedOn", "published_at", "createdAt") or None,
                    job_id=_pick_item_field(item, "id", "jobId", "ciphertext"),
                )
            )
        return jobs[:MAX_UPWORK_JOBS]
    except Exception:
        return []


async def _fetch_upwork_via_jsearch(
    command: SearchCommand,
    client: httpx.AsyncClient,
    api_key: str,
) -> list[RawJob]:
    keywords = _search_keywords(command)
    location = _search_location(command)
    query = f"{keywords} upwork {location}"
    jobs: list[RawJob] = []
    seen_urls: set[str] = set()
    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }
    for page in range(1, 3):
        url = (
            "https://jsearch.p.rapidapi.com/search"
            f"?query={quote_plus(query)}&page={page}&num_pages=1&date_posted={_jsearch_date_posted(command)}"
        )
        try:
            response = await client.get(url, headers=headers, timeout=25)
            if response.status_code != 200:
                break
            payload = response.json()
            for item in payload.get("data", []):
                apply_url = (
                    item.get("job_apply_link")
                    or item.get("job_google_link")
                    or item.get("job_link")
                    or ""
                ).strip()
                publisher = (item.get("job_publisher") or "").lower()
                if not apply_url or apply_url in seen_urls:
                    continue
                if "upwork.com" not in apply_url.lower() and "upwork" not in publisher:
                    continue
                seen_urls.add(apply_url)
                role = (item.get("job_title") or "").strip()
                if not role:
                    continue
                company = (item.get("employer_name") or "Cliente Upwork").strip()
                location_parts = [
                    item.get("job_city") or "",
                    item.get("job_state") or "",
                    item.get("job_country") or "",
                ]
                loc = ", ".join(p for p in location_parts if p).strip(", ")
                jobs.append(
                    RawJob(
                        company=company,
                        role=role,
                        apply_url=apply_url,
                        source="upwork",
                        origin="upwork",
                        description=(item.get("job_description") or f"{role} at {company}")[:2000],
                        location=loc,
                        posted_at=item.get("job_posted_at_datetime_utc"),
                        job_id=str(item.get("job_id") or ""),
                    )
                )
            if not payload.get("data"):
                break
        except Exception:
            break
        await asyncio.sleep(0.25)
    return jobs[:MAX_UPWORK_JOBS]


async def fetch_upwork_jobs(
    command: SearchCommand,
    client: httpx.AsyncClient,
) -> list[RawJob]:
    apify_token = os.getenv("APIFY_TOKEN", "").strip()
    rapidapi_key = os.getenv("RAPIDAPI_KEY", "").strip()
    if apify_token:
        jobs = await _fetch_upwork_via_apify(command, client, apify_token)
        if jobs:
            return jobs
    if rapidapi_key:
        return await _fetch_upwork_via_jsearch(command, client, rapidapi_key)
    return []


async def fetch_portal_jobs(command: SearchCommand) -> list[RawJob]:
    async with httpx.AsyncClient(follow_redirects=True) as client:
        return await fetch_linkedin_jobs(command, client)
