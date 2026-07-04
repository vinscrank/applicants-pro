import hashlib
import json
import re
from html import unescape
from urllib.parse import urljoin, urlparse

import httpx

from scraper.job_page import FETCH_HEADERS, _clean_text, _location_from_json_ld, _meta_content
from scraper.scrapers import RawJob

CAREERS_URL_HINTS = (
    "career",
    "jobs",
    "job-",
    "join-us",
    "join_us",
    "work-with-us",
    "workwithus",
    "vacanc",
    "hiring",
    "opportunit",
)

JOB_PATH_RE = re.compile(
    r"/(?:jobs?|careers?|positions?|openings?|vacanc(?:y|ies)|roles?|opportunities?)(?:/[^/?#]+)+",
    re.I,
)

SKIP_LINK_TEXT = frozenset(
    {
        "apply",
        "apply now",
        "view all",
        "see all",
        "back",
        "home",
        "privacy",
        "cookies",
        "sign in",
        "log in",
        "linkedin",
        "twitter",
        "facebook",
        "instagram",
        "learn more",
        "read more",
    }
)

DEPARTMENT_ONLY = frozenset(
    {
        "marketing",
        "engineering",
        "sales",
        "product",
        "design",
        "operations",
        "finance",
        "legal",
        "people",
        "support",
        "security",
        "data",
        "technology",
        "research",
        "business",
        "corporate",
        "internships",
        "early careers",
    }
)


def careers_url_slug(url: str) -> str:
    parsed = urlparse(url.strip())
    host = (parsed.netloc or "").lower().removeprefix("www.")
    host_slug = re.sub(r"[^a-z0-9]+", "-", host).strip("-") or "site"
    path = (parsed.path or "/").strip("/").lower()
    if path:
        path_bit = hashlib.md5(path.encode()).hexdigest()[:10]
        return f"{host_slug}-{path_bit}"
    return host_slug


def looks_like_careers_url(url: str) -> bool:
    lowered = (url or "").lower()
    return any(hint in lowered for hint in CAREERS_URL_HINTS)


def _json_ld_job_postings(html: str) -> list[dict]:
    postings: list[dict] = []
    seen: set[str] = set()

    def add_item(item: dict) -> None:
        if not isinstance(item, dict):
            return
        kind = item.get("@type") or ""
        kinds = kind if isinstance(kind, list) else [kind]
        if "JobPosting" not in kinds:
            return
        title = _clean_text(str(item.get("title") or item.get("name") or ""))
        url = _clean_text(str(item.get("url") or ""))
        key = f"{title}|{url}"
        if title and key not in seen:
            seen.add(key)
            postings.append(item)

    for block in re.findall(
        r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',
        html,
        re.I | re.S,
    ):
        raw = block.strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            add_item(item)
            graph = item.get("@graph")
            if isinstance(graph, list):
                for node in graph:
                    add_item(node)
    return postings


def _strip_link_text(value: str) -> str:
    text = re.sub(r"(?is)<[^>]+>", " ", value or "")
    return _clean_text(unescape(text))


def _looks_like_job_href(href: str) -> bool:
    if not href or href.startswith("#") or href.startswith("mailto:") or href.startswith("javascript:"):
        return False
    parsed = urlparse(href)
    path = (parsed.path or "").lower()
    if JOB_PATH_RE.search(path):
        return True
    query = (parsed.query or "").lower()
    return any(token in query for token in ("jobid=", "gh_jid=", "job_id=", "posting=", "req="))


def _looks_like_job_title(title: str) -> bool:
    if not title:
        return False
    lowered = title.lower()
    if lowered in SKIP_LINK_TEXT or lowered in DEPARTMENT_ONLY:
        return False
    if len(title) < 8 or len(title) > 140:
        return False
    if any(token in lowered for token in ("cookie", "privacy policy", "terms of", "©")):
        return False
    role_hints = (
        "engineer",
        "developer",
        "designer",
        "manager",
        "analyst",
        "architect",
        "lead",
        "director",
        "intern",
        "graduate",
        "consultant",
        "specialist",
        "scientist",
        "support",
        "sales",
        "marketing",
        "product",
        "data",
        "devops",
        "qa",
        "tester",
        "administrator",
        "coordinator",
        "associate",
        "head of",
        "officer",
    )
    return any(hint in lowered for hint in role_hints) or bool(re.search(r"\b(senior|staff|principal|junior)\b", lowered, re.I))


def _jobs_from_links(html: str, base_url: str, company_name: str) -> list[RawJob]:
    jobs: list[RawJob] = []
    seen_urls: set[str] = set()
    for match in re.finditer(r'(?is)<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html):
        href = (match.group(1) or "").strip()
        if not _looks_like_job_href(href):
            continue
        apply_url = urljoin(base_url, href)
        if apply_url in seen_urls:
            continue
        title = _strip_link_text(match.group(2))
        if not _looks_like_job_title(title):
            continue
        seen_urls.add(apply_url)
        jobs.append(
            RawJob(
                company=company_name,
                role=title,
                apply_url=apply_url,
                source="website",
                description="",
                location="",
                job_id=hashlib.md5(apply_url.encode()).hexdigest()[:12],
                origin="website",
            )
        )
    return jobs


def _jobs_from_json_ld(postings: list[dict], base_url: str, company_name: str) -> list[RawJob]:
    jobs: list[RawJob] = []
    seen: set[str] = set()
    for item in postings:
        role = _clean_text(str(item.get("title") or item.get("name") or ""))
        if not role:
            continue
        apply_url = _clean_text(str(item.get("url") or "")) or base_url
        apply_url = urljoin(base_url, apply_url)
        key = f"{role}|{apply_url}"
        if key in seen:
            continue
        seen.add(key)
        hiring = item.get("hiringOrganization") or {}
        company = company_name
        if isinstance(hiring, dict):
            company = _clean_text(str(hiring.get("name") or "")) or company_name
        description = _clean_text(str(item.get("description") or ""))[:4000]
        jobs.append(
            RawJob(
                company=company,
                role=role,
                apply_url=apply_url,
                source="website",
                description=description,
                location=_location_from_json_ld(item),
                posted_at=_clean_text(str(item.get("datePosted") or "")) or None,
                job_id=hashlib.md5(apply_url.encode()).hexdigest()[:12],
                origin="website",
            )
        )
    return jobs


def parse_careers_html(html: str, careers_url: str, company_name: str) -> list[RawJob]:
    postings = _json_ld_job_postings(html)
    jobs = _jobs_from_json_ld(postings, careers_url, company_name)
    if jobs:
        return jobs
    return _jobs_from_links(html, careers_url, company_name)


async def scrape_careers_page(
    careers_url: str,
    company_name: str,
    client: httpx.AsyncClient,
) -> list[RawJob]:
    url = (careers_url or "").strip()
    if not url:
        return []
    try:
        response = await client.get(url, headers=FETCH_HEADERS, timeout=25)
        if response.status_code != 200:
            return []
        html = response.text
    except Exception:
        return []
    return parse_careers_html(html, str(response.url), company_name)


async def probe_careers_website(url: str, display_name: str = "") -> dict | None:
    cleaned = (url or "").strip()
    if not cleaned:
        return None
    parsed = urlparse(cleaned)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None
    async with httpx.AsyncClient(follow_redirects=True, timeout=25) as client:
        try:
            response = await client.get(cleaned, headers=FETCH_HEADERS)
        except Exception:
            return None
        if response.status_code >= 400:
            return None
        html = response.text
        final_url = str(response.url)
        name = display_name.strip()
        if not name:
            site_name = _meta_content(html, "og:site_name")
            if site_name:
                name = site_name
            else:
                host = urlparse(final_url).netloc.lower().removeprefix("www.")
                name = host.split(".")[0].replace("-", " ").title()
        jobs = parse_careers_html(html, final_url, name)
    if not jobs and not looks_like_careers_url(final_url):
        title_match = re.search(r"(?is)<title[^>]*>(.*?)</title>", html)
        title = _clean_text(title_match.group(1)) if title_match else ""
        if not any(hint in title.lower() for hint in CAREERS_URL_HINTS):
            return None
    return {
        "name": name,
        "ats": "website",
        "slug": careers_url_slug(final_url),
        "careers_url": final_url,
        "job_count": len(jobs),
        "source": "website",
    }
