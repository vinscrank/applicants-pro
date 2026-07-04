import hashlib
import re
from urllib.parse import urlparse

from scraper.application_sync import page_url_matches_application


def job_ref_tokens(url: str) -> set[str]:
    tokens: set[str] = set()
    raw = (url or "").strip()
    if not raw:
        return tokens
    for match in re.finditer(r"\bJR\d+\b", raw, re.I):
        tokens.add(match.group(0).upper())
    for match in re.finditer(r"[?&](?:gh_jid|jobId|job_id)=([^&]+)", raw, re.I):
        value = (match.group(1) or "").strip()
        if value:
            tokens.add(value)
    return tokens


def url_slug_tokens(url: str) -> set[str]:
    tokens: set[str] = set()
    try:
        path = urlparse((url or "").strip()).path.lower()
    except Exception:
        return tokens
    for segment in path.split("/"):
        segment = segment.strip()
        if len(segment) < 12 or "-" not in segment:
            continue
        cleaned = re.sub(r"-at-[^-]+(?:-\d+)?$", "", segment)
        cleaned = re.sub(r"-\d{6,}$", "", cleaned)
        if len(cleaned) >= 12:
            tokens.add(cleaned)
    return tokens


def cross_url_same_job(left_url: str, right_url: str) -> bool:
    left = (left_url or "").strip()
    right = (right_url or "").strip()
    if not left or not right:
        return False
    if page_url_matches_application(left, right):
        return True
    left_refs = job_ref_tokens(left)
    right_refs = job_ref_tokens(right)
    if left_refs and right_refs and left_refs.intersection(right_refs):
        return True
    left_slugs = url_slug_tokens(left)
    right_slugs = url_slug_tokens(right)
    for left_slug in left_slugs:
        for right_slug in right_slugs:
            if left_slug == right_slug:
                return True
            if len(left_slug) >= 16 and len(right_slug) >= 16 and (
                left_slug in right_slug or right_slug in left_slug
            ):
                return True
    return False


def tracker_offer_id_for_application(application_id: int, notes: str | None = None) -> str:
    marker = None
    for part in (notes or "").split():
        if part.startswith("offer:"):
            marker = part[6:].strip()
            break
    if marker:
        return marker
    digest = hashlib.md5(f"tracker:{application_id}".encode()).hexdigest()
    return digest[:12]
