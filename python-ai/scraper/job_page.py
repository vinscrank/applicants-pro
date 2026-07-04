import json
import re
from html import unescape
from urllib.parse import urlparse

import httpx

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)
FETCH_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml",
}
MAX_TEXT_CHARS = 12000


def detect_job_origin(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if "linkedin.com" in host:
        return "linkedin"
    if "greenhouse.io" in host:
        return "greenhouse"
    if "lever.co" in host:
        return "lever"
    if "workable.com" in host:
        return "workable"
    if "ashbyhq.com" in host or "jobs.ashbyhq.com" in host:
        return "ashby"
    if "indeed." in host:
        return "indeed"
    if "upwork.com" in host:
        return "upwork"
    if "stripe.com" in host:
        return "stripe"
    return "web"


def _meta_content(html: str, key: str) -> str:
    patterns = [
        rf'<meta\s+property="{re.escape(key)}"\s+content="([^"]*)"',
        rf'<meta\s+content="([^"]*)"\s+property="{re.escape(key)}"',
        rf'<meta\s+name="{re.escape(key)}"\s+content="([^"]*)"',
        rf'<meta\s+content="([^"]*)"\s+name="{re.escape(key)}"',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.I | re.S)
        if match:
            return unescape(match.group(1).strip())
    return ""


def _json_ld_job_posting(html: str) -> dict:
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
            kind = item.get("@type") or ""
            if kind == "JobPosting" or (isinstance(kind, list) and "JobPosting" in kind):
                return item
            graph = item.get("@graph")
            if isinstance(graph, list):
                for node in graph:
                    if isinstance(node, dict) and node.get("@type") == "JobPosting":
                        return node
    return {}


def _strip_html(html: str) -> str:
    text = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", html)
    text = re.sub(r"(?is)<br\s*/?>", "\n", text)
    text = re.sub(r"(?is)</p>", "\n", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _title_tag(html: str) -> str:
    match = re.search(r"(?is)<title[^>]*>(.*?)</title>", html)
    return _clean_text(match.group(1)) if match else ""


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(value or "")).strip()


def _parse_linkedin_title(og_title: str, title: str) -> tuple[str, str, str]:
    raw = og_title or title
    if not raw:
        return "", "", ""
    base = re.sub(r"\s*\|\s*LinkedIn\s*$", "", raw, flags=re.I).strip()
    hiring = re.match(r"^(.+?)\s+hiring\s+(.+?)\s+in\s+(.+)$", base, re.I)
    if hiring:
        return hiring.group(2).strip(), hiring.group(1).strip(), hiring.group(3).strip()
    parts = [p.strip() for p in base.split(" - ") if p.strip()]
    if len(parts) >= 3:
        return parts[0], parts[1], parts[-1]
    if len(parts) == 2:
        return parts[0], parts[1], ""
    return base, "", ""


def _location_from_json_ld(data: dict) -> str:
    location = data.get("jobLocation") or data.get("applicantLocationRequirements")
    if isinstance(location, list):
        location = location[0] if location else {}
    if isinstance(location, dict):
        address = location.get("address")
        if isinstance(address, dict):
            parts = [
                address.get("addressLocality"),
                address.get("addressRegion"),
                address.get("addressCountry"),
            ]
            return ", ".join(str(p).strip() for p in parts if p)
        name = location.get("name")
        if name:
            return str(name)
    if isinstance(location, str):
        return location
    return ""


def _normalize_location_phrase(value: str) -> str:
    cleaned = _clean_text(value)
    cleaned = re.split(r"\s+and\s+requires\b", cleaned, maxsplit=1, flags=re.I)[0].strip(" ,.")
    if cleaned.endswith(" HQ"):
        city = cleaned[:-3].strip()
        if city.lower() == "dublin":
            return "Dublin, Ireland"
        return cleaned
    return cleaned


def _location_from_html(html: str) -> str:
    patterns = [
        r"This role is based in\s+([^.<]+)",
        r"role is based in\s+([^.<]+)",
        r"located in\s+([^.<]+)",
        r'JobDetailCardProperty__title">Office locations</p>\s*<p>([^<]+)</p>',
        r"Office locations[^<]*</[^>]+>\s*<[^>]+>([^<]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.I | re.S)
        if match:
            value = _normalize_location_phrase(match.group(1))
            if value and len(value) < 120:
                return value
    return ""


def _company_from_url(url: str, html: str) -> str:
    host = urlparse(url).netloc.lower()
    if "stripe.com" in host:
        return "Stripe"
    og_site = _meta_content(html, "og:site_name")
    if og_site:
        return og_site
    return ""


def _role_from_html(html: str) -> str:
    match = re.search(r'data-page-title="([^"]+)"', html, re.I)
    if match:
        return _clean_text(match.group(1))
    match = re.search(r"<h1[^>]*>([^<]+)</h1>", html, re.I | re.S)
    if match:
        return _clean_text(match.group(1))
    return ""


def _html_fragment_to_text(fragment: str) -> str:
    text = fragment.encode("utf-8").decode("unicode_escape")
    text = unescape(text)
    text = re.sub(r"(?is)<br\s*/?>", "\n", text)
    text = re.sub(r"(?is)</p>", "\n", text)
    text = re.sub(r"(?is)</li>", "\n", text)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _embedded_next_job_posting(html: str) -> dict:
    idx = html.find("JobPosting")
    if idx < 0:
        return {}
    raw = html[idx : idx + 22000]
    title_match = re.search(r'\\"title\\":\\"([^\\"]+)\\"', raw)
    if not title_match:
        return {}
    description = ""
    for tail in ("datePosted", "hiringOrganization", "jobLocation", "validThrough", "employmentType"):
        desc_match = re.search(rf'\\"description\\":\\"(.*?)\\",\\"{tail}\\"', raw, re.S)
        if desc_match:
            description = _html_fragment_to_text(desc_match.group(1))
            break
    if not description:
        return {}
    location = ""
    loc_match = re.search(r'\\"addressLocality\\":\\"([^\\"]+)\\"', raw)
    if loc_match:
        location = _clean_text(loc_match.group(1))
    if not location:
        remote_match = re.search(r"Location:\s*Remote", description, re.I)
        if remote_match:
            location = "Remote"
    company = ""
    org_match = re.search(r'\\"hiringOrganization\\":\{\\"name\\":\\"([^\\"]+)\\"', raw)
    if org_match:
        company = _clean_text(org_match.group(1))
    posted_at = ""
    date_match = re.search(r'\\"datePosted\\":\\"([^\\"]+)\\"', raw)
    if date_match:
        posted_at = date_match.group(1)
    return {
        "title": _clean_text(title_match.group(1)),
        "description": description,
        "location": location,
        "company": company,
        "posted_at": posted_at,
    }


def _validate_public_url(url: str) -> str:
    cleaned = (url or "").strip()
    if not cleaned:
        raise ValueError("URL obbligatorio")
    parsed = urlparse(cleaned)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("URL non valido")
    host = parsed.hostname or ""
    if host in ("localhost", "127.0.0.1", "0.0.0.0") or host.endswith(".local"):
        raise ValueError("URL non consentito")
    return cleaned


async def fetch_job_page_html(url: str) -> tuple[str, str]:
    cleaned = _validate_public_url(url)
    async with httpx.AsyncClient(follow_redirects=True, timeout=30, headers=FETCH_HEADERS) as client:
        response = await client.get(cleaned)
        response.raise_for_status()
        final_url = str(response.url)
        return response.text, final_url


async def fetch_job_page(url: str) -> dict:
    cleaned = _validate_public_url(url)
    html, _final_url = await fetch_job_page_html(cleaned)

    origin = detect_job_origin(cleaned)
    og_title = _meta_content(html, "og:title")
    og_description = _meta_content(html, "og:description")
    description_meta = _meta_content(html, "description")
    title_tag = _title_tag(html)
    json_ld = _json_ld_job_posting(html)
    body_text = _strip_html(html)[:MAX_TEXT_CHARS]

    role = ""
    company = ""
    location = ""
    posted_at = ""

    if json_ld:
        role = _clean_text(str(json_ld.get("title") or json_ld.get("name") or ""))
        hiring = json_ld.get("hiringOrganization") or {}
        if isinstance(hiring, dict):
            company = _clean_text(str(hiring.get("name") or ""))
        location = _location_from_json_ld(json_ld)
        posted_at = _clean_text(str(json_ld.get("datePosted") or ""))

    if origin == "linkedin" and (not role or not company):
        r, c, l = _parse_linkedin_title(og_title, title_tag)
        role = role or r
        company = company or c
        location = location or l

    location = location or _location_from_html(html)
    company = company or _company_from_url(cleaned, html)
    role = role or _role_from_html(html) or _clean_text(og_title or title_tag)

    description = _clean_text(og_description or description_meta or json_ld.get("description") or "")
    embedded = _embedded_next_job_posting(html)
    if embedded.get("description") and len(embedded.get("description") or "") > len(description):
        description = embedded["description"]
        role = role or embedded.get("title") or ""
        location = location or embedded.get("location") or ""
        company = company or embedded.get("company") or ""
        posted_at = posted_at or embedded.get("posted_at") or ""
    if not description and body_text:
        description = body_text[:4000]
    if description and len(description) > len(body_text):
        body_text = description[:MAX_TEXT_CHARS]

    return {
        "url": cleaned,
        "origin": origin,
        "title_guess": role,
        "company_guess": company,
        "location_guess": location,
        "posted_at_guess": posted_at,
        "description": description,
        "page_text": body_text,
    }
