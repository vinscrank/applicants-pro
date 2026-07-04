import json
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models
from auth.deps import get_current_user
from billing.deps import require_offerte_plan
from scraper import repository as repo
from scraper.discovery import discover_from_url, discover_from_name, run_auto_discovery
from scraper.prompt_parser import DEFAULT_COMMAND, DEFAULT_PROMPT
from scraper.schemas import (
    SearchCommand,
    SearchResult,
    SearchSummary,
    JobOffer,
    VerificationStatus,
    SearchPreferences,
    Company,
    CompanyCreateRequest,
    CompanyUpdateRequest,
    DiscoveryResult,
    CompanyScanRequest,
    CompanyScanSearchRequest,
    CompanyScanResult,
    ScanAllRecentResult,
)
from scraper.preferences import merge_command_with_preferences
from scraper.search import run_search
from scraper.company_scan import scan_all_monitored_companies, scan_all_monitored_companies_by_title, scan_monitored_company
from scraper.llm.parser import parse_prompt_llm
from scraper.llm.usage_pg import BudgetExceededError, get_llm_stats, set_monthly_budget, init_llm_settings, update_llm_controls, assert_operation_allowed
from scraper.llm.config import GEMINI_MODEL
from scraper.llm.gemini import is_configured, GeminiError
from scraper.llm.access import ensure_llm_access
from scraper.llm.policies import LlmPolicyError
from scraper.application_sync import (
    application_tracker_match,
    find_application_by_job_url,
    find_application_for_job,
    sync_analyzed_url_to_application,
    sync_offer_to_application,
)

router = APIRouter(prefix="/api/offerte", tags=["offerte"])


def require_offerte_access(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_offerte_plan),
) -> Session:
    ensure_llm_access(db, user.id)
    return db


def require_offerte_user(user: models.User = Depends(require_offerte_plan)) -> models.User:
    return user


class ParseRequest(BaseModel):
    prompt_text: str
    command: SearchCommand | None = None


class ParseResponse(BaseModel):
    command: SearchCommand
    used_llm: bool = False


class BudgetUpdate(BaseModel):
    monthly_budget_usd: float


class LlmControlsUpdate(BaseModel):
    parse_prompt_enabled: bool | None = None
    discover_company_enabled: bool | None = None
    auto_discover_enabled: bool | None = None


class DiscoverUrlRequest(BaseModel):
    url: str
    name: str = ""


class DiscoverNameRequest(BaseModel):
    name: str


class AutoDiscoverRequest(BaseModel):
    names: list[str] | None = None
    max_scan: int | None = None


class AppliedUpdate(BaseModel):
    applied: bool


class DismissedUpdate(BaseModel):
    dismissed: bool
    apply_url: str | None = None
    company: str | None = None
    role: str | None = None


class TrackApplicationRequest(BaseModel):
    company: str
    role: str
    apply_url: str
    location: str | None = None
    source: str = ""
    finalize: bool = False


class ApplicationTrackerMatch(BaseModel):
    application_id: int
    company_name: str
    job_title: str
    status: str
    last_applied_at: str | None = None
    application_source: str


class LiveOfferMatch(BaseModel):
    offer_id: str
    company: str
    role: str
    apply_url: str
    applied: bool = False
    dismissed: bool = False


class TrackApplicationResponse(BaseModel):
    offer_id: str
    applied: bool
    application_id: int
    created: bool
    already_applied: bool = False
    tracker_match: ApplicationTrackerMatch | None = None


class AnalyzeJobUrlRequest(BaseModel):
    url: str


class AnalyzeJobUrlResponse(BaseModel):
    url: str
    origin: str
    role: str
    company: str
    location: str
    posted_at: str
    origin_label: str
    application_method: str
    remote_type: str
    summary: str
    review: str
    highlights: list[str]
    concerns: list[str]
    profile_fit_score: int = 0
    profile_fit_label: str = ""
    profile_fit_available: bool = False
    tracker_match: ApplicationTrackerMatch | None = None
    live_offer_matches: list[LiveOfferMatch] = []
    user_dismissed: bool = False


class TrackAnalyzedUrlRequest(BaseModel):
    url: str
    company: str
    role: str
    location: str = ""
    application_method: str = "other"
    remote_type: str = "unknown"
    notes: str = ""
    allow_duplicate: bool = False
    application_source: str = "manual"


class TrackAnalyzedUrlResponse(BaseModel):
    application_id: int
    created: bool
    already_applied: bool
    tracker_match: ApplicationTrackerMatch | None = None
    live_offer_matches: list[LiveOfferMatch] = []


class SearchRequest(BaseModel):
    command: SearchCommand | None = None
    preferences_override: SearchPreferences | None = None
    persist: bool = True


@router.get("/search/default")
async def default_command(db: Session = Depends(require_offerte_access)):
    return {
        "command_text": DEFAULT_PROMPT,
        "command": DEFAULT_COMMAND.model_dump(),
    }


@router.post("/search/parse", response_model=ParseResponse)
async def parse_search_prompt(
    body: ParseRequest,
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    try:
        cmd, used_llm = await parse_prompt_llm(db, body.prompt_text, body.command, user.id)
        prefs = repo.get_user_search_preferences(db, user.id)
        cmd = merge_command_with_preferences(cmd, prefs)
    except BudgetExceededError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except LlmPolicyError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except GeminiError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return ParseResponse(command=cmd, used_llm=used_llm)


@router.put("/llm/controls")
async def update_llm_controls_route(body: LlmControlsUpdate, db: Session = Depends(get_db)):
    update_llm_controls(
        db,
        parse_prompt_enabled=body.parse_prompt_enabled,
        discover_company_enabled=body.discover_company_enabled,
        auto_discover_enabled=body.auto_discover_enabled,
    )
    return get_llm_stats(db, is_configured(), GEMINI_MODEL)


@router.get("/llm/stats")
async def llm_stats(db: Session = Depends(get_db)):
    return get_llm_stats(db, is_configured(), GEMINI_MODEL)


@router.put("/llm/budget")
async def update_llm_budget(body: BudgetUpdate, db: Session = Depends(get_db)):
    budget = set_monthly_budget(db, body.monthly_budget_usd)
    stats = get_llm_stats(db, is_configured(), GEMINI_MODEL)
    stats["monthly_budget_usd"] = budget
    stats["month_remaining_usd"] = round(max(0.0, budget - stats["month_spend_usd"]), 6) if budget > 0 else None
    stats["budget_exceeded"] = budget > 0 and stats["month_spend_usd"] >= budget
    return stats


@router.get("/preferences", response_model=SearchPreferences)
async def get_search_preferences(
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    return repo.get_user_search_preferences(db, user.id)


@router.put("/preferences", response_model=SearchPreferences)
async def update_search_preferences(
    body: SearchPreferences,
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    return repo.save_user_search_preferences(db, user.id, body)


def _recount_result(result: SearchResult) -> None:
    from scraper.schemas import VerificationStatus

    result.total_found = len(result.offers)
    result.verified_count = sum(1 for o in result.offers if o.status == VerificationStatus.VERIFIED)
    result.maybe_count = sum(1 for o in result.offers if o.status == VerificationStatus.MAYBE)
    result.rejected_count = sum(1 for o in result.offers if o.status == VerificationStatus.REJECTED)


@router.post("/search", response_model=SearchResult)
async def search_offers(
    body: SearchRequest | None = None,
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    req = body or SearchRequest()
    command = req.command or DEFAULT_COMMAND
    if req.preferences_override is not None:
        prefs = req.preferences_override
    else:
        prefs = repo.get_user_search_preferences(db, user.id)
    cmd = merge_command_with_preferences(command, prefs)
    companies = repo.get_companies_for_scrape(db)
    result = await run_search(cmd, companies, db=db, user_id=user.id, preferences=prefs)
    base_pool = result.offer_pool or result.offers
    if base_pool:
        pool = repo.enrich_offers_applied(db, base_pool, user.id)
        pool = repo.supplement_pool_with_tracker_applications(db, pool, user.id, result.command)
        result.offer_pool = pool
        result.offers = [
            offer
            for offer in pool
            if offer.historical or repo._offer_visible_for_command(offer, result.command)
        ]
    _recount_result(result)
    result.preferences = prefs
    if req.persist:
        search_id = repo.save_search(db, result, user.id)
        result.id = search_id
    return result


@router.get("/searches/latest", response_model=SearchResult | None)
async def latest_search(
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    return repo.get_latest_search(db, user.id)


@router.get("/searches", response_model=list[SearchSummary])
async def search_history(
    limit: int = 50,
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    rows = repo.list_searches(db, user.id, limit)
    summaries = []
    for r in rows:
        prompt = ""
        locations: list[str] = []
        allowed_roles: list[str] = []
        try:
            cmd_data = json.loads(r.get("command_json", "{}"))
            prompt = (cmd_data.get("prompt_text") or "")[:120]
            locations = cmd_data.get("locations") or []
            allowed_roles = cmd_data.get("allowed_roles") or []
        except Exception:
            pass
        summaries.append(SearchSummary(
            id=r["id"],
            searched_at=datetime.fromisoformat(r["searched_at"]),
            total_found=r["total_found"],
            verified_count=r["verified_count"],
            maybe_count=r["maybe_count"],
            rejected_count=r["rejected_count"],
            prompt_text=prompt,
            locations=locations,
            allowed_roles=allowed_roles,
        ))
    return summaries


@router.get("/searches/{search_id}", response_model=SearchResult)
async def get_search_by_id(
    search_id: int,
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    result = repo.get_search(db, search_id, user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Ricerca non trovata")
    return result


@router.put("/offers/{offer_id}/applied")
async def update_offer_applied(
    offer_id: str,
    body: AppliedUpdate,
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    repo.set_offer_applied(db, user.id, offer_id, body.applied)
    return {"offer_id": offer_id, "applied": body.applied}


@router.put("/offers/{offer_id}/dismissed")
async def update_offer_dismissed(
    offer_id: str,
    body: DismissedUpdate,
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    repo.set_offer_dismissed(
        db,
        user.id,
        offer_id,
        body.dismissed,
        body.apply_url,
        body.company,
        body.role,
    )
    return {"offer_id": offer_id, "dismissed": body.dismissed}


@router.post("/offers/{offer_id}/track", response_model=TrackApplicationResponse)
async def track_offer_application(
    offer_id: str,
    body: TrackApplicationRequest,
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    company = body.company.strip()
    role = body.role.strip()
    if not company or not role:
        raise HTTPException(status_code=400, detail="Azienda e ruolo obbligatori")
    try:
        application, created = sync_offer_to_application(
            db,
            user.id,
            offer_id,
            company,
            role,
            body.apply_url,
            body.location,
            body.source,
            finalize=body.finalize,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return TrackApplicationResponse(
        offer_id=offer_id,
        applied=True,
        application_id=application.id,
        created=created,
        already_applied=not created,
        tracker_match=application_tracker_match(application) if not created else None,
    )


@router.post("/analyze-url", response_model=AnalyzeJobUrlResponse)
async def analyze_job_url(
    body: AnalyzeJobUrlRequest,
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    from scraper.job_page import fetch_job_page
    from scraper.llm.job_analyze import analyze_job_url_with_ai

    try:
        page = await fetch_job_page(body.url)
        result = await analyze_job_url_with_ai(db, page, user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except BudgetExceededError as e:
        raise HTTPException(status_code=402, detail=str(e)) from e
    except LlmPolicyError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except GeminiError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail="Impossibile aprire l'URL dell'annuncio") from e

    existing = find_application_for_job(
        db,
        user.id,
        result.get("url") or body.url,
        result.get("company") or "",
        result.get("role") or "",
    )
    if existing:
        result["tracker_match"] = application_tracker_match(existing)
    else:
        result["tracker_match"] = None

    live_matches = repo.find_matching_live_offers(
        db,
        user.id,
        result.get("url") or body.url,
        result.get("company") or "",
        result.get("role") or "",
    )
    result["live_offer_matches"] = live_matches
    result["user_dismissed"] = repo.job_url_is_dismissed(
        db,
        user.id,
        result.get("url") or body.url,
        result.get("company") or "",
        result.get("role") or "",
    ) or bool(live_matches and all(match.get("dismissed") for match in live_matches))

    from apply.page_fit_context import prepare_page_fit_from_job_page
    from apply.profile_fit_llm import compute_profile_fit_ai
    from apply.profile_match import apply_closed_job_notice
    from auth.crud import get_or_create_profile
    from vector.config import vector_ready
    from vector.indexer import index_job_page
    from vector.text import profile_to_dict

    profile_row = get_or_create_profile(db, user.id)
    profile = profile_to_dict(user, profile_row)
    fit_inputs = prepare_page_fit_from_job_page(page, result)
    page_url = fit_inputs["page_url"] or result.get("url") or body.url
    try:
        fit = await compute_profile_fit_ai(
            db,
            user.id,
            profile,
            fit_inputs["context_text"],
            page_url=fit_inputs["page_url"],
            job_title=fit_inputs["job_title"],
            company=fit_inputs["company"],
            location=fit_inputs["location"],
        )
        fit = apply_closed_job_notice(fit, fit_inputs["context_text"])
        result.update(
            {
                "profile_fit_score": int(fit.get("profile_fit_score") or 0),
                "profile_fit_label": str(fit.get("profile_fit_label") or ""),
                "profile_fit_available": bool(fit.get("profile_fit_available")),
            }
        )
    except Exception:
        pass

    if vector_ready():
        try:
            await index_job_page(
                db,
                user.id,
                url=page_url,
                role=result.get("role") or "",
                company=result.get("company") or "",
                location=result.get("location") or "",
                summary=result.get("summary") or "",
                page_text=page.get("page_text") or "",
                description=page.get("description") or "",
            )
        except Exception:
            pass

    return AnalyzeJobUrlResponse(**result)


@router.get("/page-embed", response_class=HTMLResponse)
async def embed_job_page(
    url: str = Query(..., min_length=8, max_length=2000),
    _db: Session = Depends(require_offerte_access),
    _user: models.User = Depends(require_offerte_user),
):
    from scraper.job_page import fetch_job_page_html, prepare_page_embed_html

    try:
        html, final_url = await fetch_job_page_html(url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail="Impossibile aprire l'URL dell'annuncio") from e

    embedded = prepare_page_embed_html(html, final_url)
    return HTMLResponse(
        content=embedded,
        headers={
            "Cache-Control": "private, max-age=300",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.post("/analyze-url/track", response_model=TrackAnalyzedUrlResponse)
async def track_analyzed_job_url(
    body: TrackAnalyzedUrlRequest,
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    company = body.company.strip()
    role = body.role.strip()
    if not company or not role:
        raise HTTPException(status_code=400, detail="Azienda e ruolo obbligatori")
    try:
        application, created, live_matches = sync_analyzed_url_to_application(
            db,
            user.id,
            body.url.strip(),
            company,
            role,
            body.location,
            body.notes,
            body.application_method,
            body.remote_type,
            allow_duplicate=body.allow_duplicate,
            application_source=body.application_source,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    match = application_tracker_match(application)
    return TrackAnalyzedUrlResponse(
        application_id=application.id,
        created=created,
        already_applied=not created,
        tracker_match=match if not created else None,
        live_offer_matches=live_matches,
    )


@router.get("/companies", response_model=list[Company])
async def get_companies(
    include_inactive: bool = Query(False),
    db: Session = Depends(require_offerte_access),
):
    return repo.list_companies(db, active_only=not include_inactive)


@router.get("/companies/{company_id}", response_model=Company)
async def get_company(
    company_id: int,
    db: Session = Depends(require_offerte_access),
):
    company = repo.get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Azienda non trovata")
    return company


@router.post("/companies", response_model=Company)
async def create_company(
    body: CompanyCreateRequest,
    db: Session = Depends(require_offerte_access),
):
    try:
        return repo.create_company(
            db,
            {
                "name": body.name,
                "ats": body.ats,
                "slug": body.slug,
                "careers_url": body.careers_url,
                "active": body.active,
                "priority": body.priority,
                "source": "manual",
            },
        )
    except ValueError as e:
        code = str(e)
        if code == "name_required":
            raise HTTPException(status_code=400, detail="Nome obbligatorio")
        if code == "slug_required":
            raise HTTPException(status_code=400, detail="Slug obbligatorio")
        if code == "ats_slug_conflict":
            raise HTTPException(status_code=409, detail="Esiste già un'azienda con lo stesso ATS e slug")
        raise HTTPException(status_code=400, detail="Dati non validi")


@router.put("/companies/{company_id}", response_model=Company)
async def update_company(
    company_id: int,
    body: CompanyUpdateRequest,
    db: Session = Depends(require_offerte_access),
):
    try:
        updated = repo.update_company(
            db,
            company_id,
            body.model_dump(exclude_unset=True),
        )
    except ValueError as e:
        code = str(e)
        if code == "name_required":
            raise HTTPException(status_code=400, detail="Nome obbligatorio")
        if code == "slug_required":
            raise HTTPException(status_code=400, detail="Slug obbligatorio")
        if code == "ats_slug_conflict":
            raise HTTPException(status_code=409, detail="Esiste già un'azienda con lo stesso ATS e slug")
        raise HTTPException(status_code=400, detail="Dati non validi")
    if not updated:
        raise HTTPException(status_code=404, detail="Azienda non trovata")
    return updated


@router.delete("/companies/{company_id}")
async def delete_company(
    company_id: int,
    db: Session = Depends(require_offerte_access),
):
    if not repo.deactivate_company(db, company_id):
        raise HTTPException(status_code=404, detail="Azienda non trovata")
    return {"ok": True, "company_id": company_id}


@router.post("/companies/{company_id}/scan", response_model=CompanyScanResult)
async def scan_company_careers(
    company_id: int,
    body: CompanyScanRequest | None = None,
    db: Session = Depends(require_offerte_access),
):
    company = repo.get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Azienda non trovata")
    req = body or CompanyScanRequest()
    if req.posted_within not in ("24h", "7d", "30d", "90d", "any"):
        raise HTTPException(status_code=400, detail="Periodo non valido")
    payload = {
        "id": company.id,
        "name": company.name,
        "ats": company.ats,
        "slug": company.slug,
        "careers_url": company.careers_url,
    }
    result = await scan_monitored_company(payload, req.posted_within)
    repo.update_company_job_count(db, company_id, result.total_jobs)
    return result


@router.post("/companies/scan-all-recent", response_model=ScanAllRecentResult)
async def scan_all_companies_recent(
    body: CompanyScanRequest | None = None,
    db: Session = Depends(require_offerte_access),
):
    from scraper.preferences import POSTED_WITHIN_LABELS

    req = body or CompanyScanRequest(posted_within="24h")
    if req.posted_within not in ("24h", "7d", "30d", "90d"):
        raise HTTPException(status_code=400, detail="Periodo non valido")
    companies = repo.list_companies(db, active_only=True)
    payloads = [
        {
            "id": company.id,
            "name": company.name,
            "ats": company.ats,
            "slug": company.slug,
            "careers_url": company.careers_url or "",
        }
        for company in companies
    ]

    async def on_scanned(company_id: int, job_count: int) -> None:
        repo.update_company_job_count(db, company_id, job_count)

    offers, companies_ok, companies_failed = await scan_all_monitored_companies(
        payloads,
        req.posted_within,
        on_company_scanned=on_scanned,
    )
    scanned_at = datetime.now(timezone.utc)
    return ScanAllRecentResult(
        posted_within=req.posted_within,
        posted_within_label=POSTED_WITHIN_LABELS.get(req.posted_within, req.posted_within),
        companies_scanned=companies_ok,
        companies_failed=companies_failed,
        offer_count=len(offers),
        offers=offers,
        scanned_at=scanned_at,
    )


@router.post("/companies/scan-all-search", response_model=ScanAllRecentResult)
async def scan_all_companies_search(
    body: CompanyScanSearchRequest,
    db: Session = Depends(require_offerte_access),
):
    from scraper.preferences import POSTED_WITHIN_LABELS

    keyword = body.title_query.strip()
    if len(keyword) < 2:
        raise HTTPException(status_code=400, detail="Inserisci almeno 2 caratteri")
    companies = repo.list_companies(db, active_only=True)
    payloads = [
        {
            "id": company.id,
            "name": company.name,
            "ats": company.ats,
            "slug": company.slug,
            "careers_url": company.careers_url or "",
        }
        for company in companies
    ]

    async def on_scanned(company_id: int, job_count: int) -> None:
        repo.update_company_job_count(db, company_id, job_count)

    offers, companies_ok, companies_failed = await scan_all_monitored_companies_by_title(
        payloads,
        keyword,
        on_company_scanned=on_scanned,
    )
    scanned_at = datetime.now(timezone.utc)
    return ScanAllRecentResult(
        posted_within="any",
        posted_within_label=POSTED_WITHIN_LABELS.get("any", "any"),
        title_query=keyword,
        companies_scanned=companies_ok,
        companies_failed=companies_failed,
        offer_count=len(offers),
        offers=offers,
        scanned_at=scanned_at,
    )


@router.post("/companies/discover-url", response_model=Company)
async def discover_company_url(body: DiscoverUrlRequest, db: Session = Depends(require_offerte_access)):
    found = await discover_from_url(body.url, body.name)
    if not found:
        raise HTTPException(status_code=404, detail="Pagina careers non raggiungibile o non valida")
    company, _ = repo.upsert_company(db, found)
    return company


@router.post("/companies/discover-name", response_model=Company)
async def discover_company_name(
    body: DiscoverNameRequest,
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    found = await discover_from_name(body.name, db, user.id)
    if not found:
        raise HTTPException(status_code=404, detail="Azienda non trovata su Greenhouse/Lever/Workable/Ashby")
    company, _ = repo.upsert_company(db, found)
    return company


@router.post("/companies/auto-discover", response_model=DiscoveryResult)
async def auto_discover_companies(
    body: AutoDiscoverRequest | None = None,
    db: Session = Depends(require_offerte_access),
    user: models.User = Depends(require_offerte_user),
):
    from billing.plans import plan_for_user

    if not plan_for_user(user).auto_discover:
        raise HTTPException(status_code=403, detail="Auto-discover disponibile solo con piano Business")
    try:
        assert_operation_allowed(db, "auto_discover")
    except LlmPolicyError as e:
        raise HTTPException(status_code=403, detail=str(e))
    result = await run_auto_discovery(
        body.names if body else None,
        db,
        max_scan=body.max_scan if body else None,
        user_id=user.id,
    )
    added, skipped = repo.bulk_upsert_companies(db, result["discovered"])
    return DiscoveryResult(
        scanned=result["scanned"],
        discovered=[Company(**{**d, "discovered_at": None}) for d in result["discovered"]],
        added=added,
        skipped=skipped,
        failed_count=result["failed_count"],
    )


def init_offerte_data(db: Session) -> None:
    init_llm_settings(db)
    repo.seed_monitored_companies(db)
