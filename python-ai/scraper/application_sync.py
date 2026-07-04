import re
from urllib.parse import urlparse, parse_qs

from sqlalchemy.orm import Session

import models

from . import repository as repo
from .url_normalize import normalize_job_url, persist_job_url


def _company_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (value or "").strip().lower())


def _role_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (value or "").strip().lower())


def _roles_compatible(left: str, right: str) -> bool:
    a = _role_key(left)
    b = _role_key(right)
    if not a or not b:
        return False
    if a == b:
        return True
    shorter, longer = (a, b) if len(a) <= len(b) else (b, a)
    return len(shorter) >= 10 and shorter in longer


def _linkedin_job_id_from_url(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        return ""
    try:
        cleaned = raw.split("#", 1)[0].split("?", 1)[0]
        for match in re.finditer(r"/jobs/view/(\d+)/?", cleaned, re.I):
            return match.group(1)
        path = urlparse(cleaned).path.rstrip("/")
        segment = path.split("/")[-1] if path else ""
        id_match = re.search(r"-(\d{6,})$", segment)
        if id_match:
            return id_match.group(1)
    except Exception:
        pass
    return ""


def _linkedin_slug_role_company(url: str) -> tuple[str, str]:
    raw = (url or "").strip()
    try:
        parts = [part for part in urlparse(raw).path.split("/") if part]
        if "view" not in parts:
            return "", ""
        idx = parts.index("view")
        if idx + 1 >= len(parts):
            return "", ""
        slug = re.sub(r"-\d{6,}$", "", parts[idx + 1])
        if "-at-" not in slug:
            return "", ""
        role_part, company_part = slug.rsplit("-at-", 1)
        return role_part.replace("-", " ").strip(), company_part.replace("-", " ").strip()
    except Exception:
        return "", ""


def _linkedin_hosts_compatible(left_url: str, right_url: str) -> bool:
    try:
        left = urlparse(left_url).netloc.lower().removeprefix("www.")
        right = urlparse(right_url).netloc.lower().removeprefix("www.")
        if left == right:
            return True
        return left.endswith("linkedin.com") and right.endswith("linkedin.com")
    except Exception:
        return False


def _company_hints_from_url(page_url: str) -> list[str]:
    hints: list[str] = []
    try:
        parsed = urlparse(page_url)
        host = parsed.netloc.lower()
        parts = [part for part in parsed.path.split("/") if part]
        if "greenhouse.io" in host and "jobs" in parts:
            idx = parts.index("jobs")
            if idx >= 1:
                slug = parts[idx - 1]
                hints.extend([slug, slug.replace("-", " ")])
        if "lever.co" in host and parts:
            hints.extend([parts[0], parts[0].replace("-", " ")])
        if "linkedin.com" in host:
            _, company = _linkedin_slug_role_company(page_url)
            if company:
                hints.append(company)
    except Exception:
        return hints
    return [hint for hint in hints if len(hint) >= 3]


def _company_matches_hint(company_name: str, hint: str) -> bool:
    company = _company_key(company_name)
    target = _company_key(hint)
    if not company or not target:
        return False
    return company == target or target in company or company in target


def _list_tracker_applications(db: Session, user_id: int) -> list[models.Application]:
    return (
        db.query(models.Application)
        .filter(
            models.Application.user_id == user_id,
            models.Application.status != "draft",
        )
        .order_by(models.Application.updated_at.desc())
        .all()
    )


_GENERIC_PATH_TOKENS = frozenset({
    "jobs",
    "job",
    "view",
    "apply",
    "search",
    "collections",
    "company",
    "careers",
    "positions",
    "openings",
    "postings",
})


def _is_job_listing_page(url: str) -> bool:
    cleaned = (url or "").strip().lower().split("#", 1)[0].split("?", 1)[0].rstrip("/")
    if not cleaned:
        return True
    if re.search(r"linkedin\.com/jobs/?$", cleaned):
        return True
    if re.search(r"linkedin\.com/jobs/(search|collections)(/|$)", cleaned):
        return True
    if re.search(r"indeed\.com/(jobs|m/jobs)/?$", cleaned):
        return True
    if re.search(r"greenhouse\.io/[^/]+/?$", cleaned):
        return True
    return False


def _normalize_job_url(url: str) -> str:
    return normalize_job_url(url)


def _url_job_tokens(url: str) -> set[str]:
    tokens: set[str] = set()
    raw = (url or "").strip()
    if not raw:
        return tokens
    try:
        parsed = urlparse(raw)
        path = parsed.path.rstrip("/")
        if path:
            tokens.add(path)
            tail = path.split("/")[-1]
            if tail and tail.lower() not in _GENERIC_PATH_TOKENS:
                tail_id = re.search(r"-(\d{6,})$", tail)
                if tail_id:
                    tokens.add(tail_id.group(1))
                if tail.isdigit() and len(tail) >= 5:
                    tokens.add(tail)
                elif len(tail) >= 8:
                    tokens.add(tail)
        query = parse_qs(parsed.query)
        for key in ("gh_jid", "jobId", "job_id", "id"):
            for value in query.get(key, []):
                cleaned = (value or "").strip()
                if cleaned:
                    tokens.add(cleaned)
        for match in re.finditer(r"/jobs/view/(\d+)", raw, re.I):
            tokens.add(match.group(1))
        for match in re.finditer(r"/jobs/(\d+)", raw, re.I):
            tokens.add(match.group(1))
    except Exception:
        return tokens
    return {token for token in tokens if len(token) >= 4}


def page_url_matches_application(page_url: str, stored_url: str) -> bool:
    if not page_url or not stored_url:
        return False
    if _is_job_listing_page(page_url):
        return False
    page_lid = _linkedin_job_id_from_url(page_url)
    stored_lid = _linkedin_job_id_from_url(stored_url)
    if page_lid and stored_lid:
        if page_lid != stored_lid:
            return False
        if _linkedin_hosts_compatible(page_url, stored_url):
            return True
    if persist_job_url(page_url) == persist_job_url(stored_url):
        return True
    try:
        page = urlparse(page_url)
        stored = urlparse(stored_url)
        page_host = page.netloc.lower().removeprefix("www.")
        stored_host = stored.netloc.lower().removeprefix("www.")
        same_host = page_host == stored_host or (
            page_host.endswith("linkedin.com")
            and stored_host.endswith("linkedin.com")
        )
        if same_host:
            page_path = page.path.rstrip("/")
            stored_path = stored.path.rstrip("/")
            if page_path and stored_path and page_path == stored_path:
                return True
    except Exception:
        pass
    page_tokens = _url_job_tokens(page_url)
    stored_tokens = _url_job_tokens(stored_url)
    page_ids = {token for token in page_tokens if token.isdigit() and len(token) >= 5}
    stored_ids = {token for token in stored_tokens if token.isdigit() and len(token) >= 5}
    if page_ids and stored_ids and page_ids.intersection(stored_ids):
        return True
    shared_paths = {token for token in page_tokens if token.startswith("/") and len(token) > 12}
    stored_paths = {token for token in stored_tokens if token.startswith("/") and len(token) > 12}
    if shared_paths and stored_paths and shared_paths.intersection(stored_paths):
        return True
    return False


def find_application_by_job_url(
    db: Session,
    user_id: int,
    job_url: str,
) -> models.Application | None:
    normalized = persist_job_url(job_url)
    if not normalized:
        return None
    hit = (
        db.query(models.Application)
        .filter(
            models.Application.user_id == user_id,
            models.Application.job_url == normalized,
        )
        .order_by(models.Application.id.desc())
        .first()
    )
    if hit:
        return hit
    path = urlparse(normalized).path.rstrip("/")
    if not path:
        return None
    candidates = (
        db.query(models.Application)
        .filter(
            models.Application.user_id == user_id,
            models.Application.job_url.isnot(None),
            models.Application.job_url.ilike(f"%{path}%"),
        )
        .order_by(models.Application.id.desc())
        .limit(20)
        .all()
    )
    for app in candidates:
        if _normalize_job_url(app.job_url or "") == normalized:
            return app
    return None


def application_tracker_match(app: models.Application) -> dict:
    applied_at = app.last_applied_at or app.created_at
    applied_at_value = applied_at.isoformat() if applied_at else None
    offer_id = None
    notes = app.notes or ""
    for part in notes.split():
        if part.startswith("offer:"):
            candidate = part[6:].strip()
            if candidate:
                offer_id = candidate
                break
    return {
        "application_id": app.id,
        "company_name": app.company_name or "",
        "job_title": app.job_title or "",
        "status": app.status or "",
        "last_applied_at": applied_at_value,
        "application_source": app.application_source or "manual",
        "offer_id": offer_id,
    }


def find_application_for_job(
    db: Session,
    user_id: int,
    job_url: str,
    company: str = "",
    role: str = "",
) -> models.Application | None:
    apps = _list_tracker_applications(db, user_id)
    listing_page = _is_job_listing_page(job_url)

    existing = find_application_by_job_url(db, user_id, job_url)
    if existing:
        return existing

    if listing_page:
        return None

    for app in apps:
        stored_url = app.job_url or ""
        if stored_url and page_url_matches_application(job_url, stored_url):
            return app

    company_clean = (company or "").strip()
    role_clean = (role or "").strip()
    parsed_role, parsed_company = _linkedin_slug_role_company(job_url)
    if parsed_role and not role_clean:
        role_clean = parsed_role
    if parsed_company and not company_clean:
        company_clean = parsed_company
    if company_clean and role_clean:
        target = repo._company_role_key(company_clean, role_clean)
        for app in apps:
            if repo._company_role_key(app.company_name or "", app.job_title or "") == target:
                return app
        company_key = _company_key(company_clean)
        for app in apps:
            if _company_key(app.company_name or "") != company_key:
                continue
            if _roles_compatible(app.job_title or "", role_clean):
                return app

    hints = _company_hints_from_url(job_url)
    if hints and not listing_page and role_clean:
        matched = [
            app
            for app in apps
            if any(_company_matches_hint(app.company_name or "", hint) for hint in hints)
        ]
        role_matched = [app for app in matched if _roles_compatible(app.job_title or "", role_clean)]
        if role_matched:
            return role_matched[0]

    return None
