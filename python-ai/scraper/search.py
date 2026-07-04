import asyncio
import httpx
import hashlib
from datetime import datetime

from sqlalchemy.orm import Session

from scraper.schemas import SearchCommand, SearchResult, JobOffer, VerificationStatus, SearchPreferences
from scraper.preferences import (
    DEFAULT_SEARCH_PREFERENCES,
    merge_command_with_preferences,
    preferences_from_command,
    apply_offer_result_filters,
    command_for_portal_search,
)
from .filters import (
    classify_offer,
    detect_seniority,
)
from .scrapers import fetch_all_jobs, RawJob
from .portals import fetch_portal_jobs
from .prompt_relevance import sort_offers_by_prompt_relevance

def _stable_job_key(job: RawJob) -> tuple[str, str, str]:
    return (job.company.lower(), job.role.lower(), job.apply_url)


def _stable_offer_key(offer: JobOffer) -> tuple[str, str, str]:
    return (offer.company.lower(), offer.role.lower(), offer.id)

PORTAL_ORIGINS = frozenset({"linkedin"})

APPLY_CHECK_TIMEOUT = 5.0
APPLY_CHECK_CONCURRENCY = 25
MAX_APPLY_URL_CHECKS = 80


async def verify_apply_url(url: str, client: httpx.AsyncClient) -> bool:
    if not url:
        return False
    try:
        r = await client.head(url, timeout=APPLY_CHECK_TIMEOUT)
        if r.status_code in (200, 301, 302, 303, 307, 308):
            return True
        r = await client.get(url, timeout=APPLY_CHECK_TIMEOUT)
        if r.status_code != 200:
            return False
        body = r.text.lower()
        closed_signals = [
            "no longer accepting",
            "position has been filled",
            "job is no longer",
            "this job is closed",
            "application closed",
            "not currently hiring",
        ]
        return not any(s in body for s in closed_signals)
    except Exception:
        return False


from scraper.url_normalize import normalize_job_url


def _make_id(job: RawJob) -> str:
    apply_url = normalize_job_url(job.apply_url) or (job.apply_url or "")
    raw = f"{job.origin}:{job.company}:{job.role}:{apply_url}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


async def _apply_ai_prompt_match(
    db: Session | None,
    command: SearchCommand,
    offers: list[JobOffer],
    user_id: int | None,
) -> None:
    if not db or not offers:
        return
    prompt = (command.prompt_text or "").strip()
    if not prompt:
        return

    from .llm.gemini import is_configured
    from .llm.offer_match import classify_offers_for_prompt

    if not is_configured():
        return

    from .prompt_match import apply_prompt_match_score

    results = await classify_offers_for_prompt(db, command, offers, user_id)
    for offer in offers:
        info = results.get(offer.id)
        if not info:
            apply_prompt_match_score(offer, match=False, reason="Non classificato")
            continue
        reason = str(info.get("reason") or "").strip()
        apply_prompt_match_score(offer, match=bool(info.get("match")), reason=reason)


def offer_matches_prompt(offer: JobOffer, command: SearchCommand | None = None) -> bool:
    from .prompt_match import offer_matches_prompt as _matches
    from .title_match import offer_title_matches_keywords, title_keywords_for_command

    if command:
        keywords = title_keywords_for_command(command)
        if keywords and not offer_title_matches_keywords(offer.role, keywords):
            return False
    strict = bool((command.prompt_text or "").strip()) if command else False
    return _matches(offer, strict=strict)


async def _verify_apply_urls(
    preliminary: list[tuple],
    require_active_apply: bool,
) -> dict[str, bool]:
    if not require_active_apply or not preliminary:
        return {}

    urls: list[str] = []
    seen: set[str] = set()
    for job, status, _reason, _lang in preliminary:
        if getattr(job, "origin", "ats") in PORTAL_ORIGINS:
            continue
        url = (job.apply_url or "").strip()
        if not url or url in seen:
            continue
        seen.add(url)
        urls.append(url)
        if len(urls) >= MAX_APPLY_URL_CHECKS:
            break

    if not urls:
        return {}

    verified: dict[str, bool] = {}
    semaphore = asyncio.Semaphore(APPLY_CHECK_CONCURRENCY)

    async with httpx.AsyncClient(follow_redirects=True, timeout=APPLY_CHECK_TIMEOUT) as client:
        async def check(url: str) -> tuple[str, bool]:
            async with semaphore:
                ok = await verify_apply_url(url, client)
            return url, ok

        results = await asyncio.gather(*[check(u) for u in urls])
        verified = dict(results)

    return verified


async def run_search(
    command: SearchCommand,
    companies: list[dict] | None = None,
    db: Session | None = None,
    user_id: int | None = None,
    preferences: SearchPreferences | None = None,
) -> SearchResult:
    from .llm.parser import normalize_search_command

    command = normalize_search_command(command)
    base_prefs = preferences or DEFAULT_SEARCH_PREFERENCES
    prefs = preferences_from_command(command, base_prefs)
    command = merge_command_with_preferences(command, prefs)
    portal_command = command_for_portal_search(command, prefs)
    ats_jobs, portal_jobs = await asyncio.gather(
        fetch_all_jobs(companies),
        fetch_portal_jobs(portal_command),
    )
    from .pool_narrowing import narrow_raw_jobs_for_prompt

    portal_jobs.sort(key=_stable_job_key)
    ats_jobs.sort(key=_stable_job_key)
    raw_jobs = narrow_raw_jobs_for_prompt(portal_jobs + ats_jobs, command)
    candidates = raw_jobs

    preliminary: list[tuple[RawJob, VerificationStatus, str, str | None]] = []
    for job in candidates:
        status, reason, language = classify_offer(
            job.role,
            job.description,
            job.location,
            job.company,
            True,
            command,
        )
        preliminary.append((job, status, reason, language))

    verified_urls = await _verify_apply_urls(preliminary, command.require_active_apply)

    offers: list[JobOffer] = []
    for job, pre_status, pre_reason, language in preliminary:
        apply_active = verified_urls.get(job.apply_url, True)
        job_origin = getattr(job, "origin", "ats") or "ats"
        status = VerificationStatus.VERIFIED
        reason = pre_reason
        if (
            command.require_active_apply
            and job_origin not in PORTAL_ORIGINS
            and job.apply_url in verified_urls
            and not apply_active
        ):
            reason = f"{pre_reason}. Apply possibilmente non attivo"

        seniority = detect_seniority(job.role)

        offers.append(JobOffer(
            id=_make_id(job),
            company=job.company,
            role=job.role,
            apply_url=job.apply_url,
            source=job.source,
            origin=job_origin if job_origin in ("linkedin", "ats", "website") else "ats",
            posted_at=job.posted_at,
            language_requirement=language,
            seniority=seniority,
            status=status,
            status_reason=reason,
            location=job.location,
            verified_at=datetime.utcnow(),
        ))

    from .offer_dedup import dedupe_cross_origin_offers

    offers = dedupe_cross_origin_offers(offers)

    offers = apply_offer_result_filters(offers, prefs, command)
    offer_pool = sorted(offers, key=_stable_offer_key)

    await _apply_ai_prompt_match(db, command, offer_pool, user_id)
    from .llm.gemini import is_configured
    from .prompt_match import apply_prompt_match_score

    if not is_configured():
        for offer in offer_pool:
            if not offer.web_dev_fit:
                apply_prompt_match_score(offer, match=None)
    offer_pool = [o for o in offer_pool if offer_matches_prompt(o, command)]
    if db and user_id:
        from vector.config import vector_ready
        from vector.embeddings import EmbeddingError
        from vector.rank import apply_profile_fit_scores

        if vector_ready():
            try:
                await apply_profile_fit_scores(db, user_id, offer_pool)
            except EmbeddingError:
                pass
    if prefs.sort_by == "relevance":
        offers = sort_offers_by_prompt_relevance(offer_pool, command)
    else:
        offers = list(offer_pool)

    verified = sum(1 for o in offers if o.status == VerificationStatus.VERIFIED)
    maybe = sum(1 for o in offers if o.status == VerificationStatus.MAYBE)
    rejected = sum(1 for o in offers if o.status == VerificationStatus.REJECTED)

    return SearchResult(
        command=command,
        preferences=prefs,
        searched_at=datetime.utcnow(),
        total_found=len(offer_pool),
        verified_count=verified,
        maybe_count=maybe,
        rejected_count=rejected,
        offers=offers,
        offer_pool=offer_pool,
    )
