from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models
from scraper import repository as repo
from scraper.application_sync import application_tracker_match, find_application_for_job
from scraper.company_scan import (
    scan_all_monitored_companies,
    scan_all_monitored_companies_by_title,
    scan_monitored_company,
)
from scraper.discovery import discover_from_name, discover_from_url, run_auto_discovery
from scraper.llm.gemini import GeminiError
from scraper.llm.policies import LlmPolicyError
from scraper.llm.usage_pg import assert_operation_allowed, BudgetExceededError
from scraper.preferences import POSTED_WITHIN_LABELS
from scraper.schemas import (
    Company,
    CompanyScanRequest,
    CompanyScanSearchRequest,
    CompanyScanResult,
    DiscoveryResult,
    ScanAllRecentResult,
)

router = APIRouter(prefix="/api/internal/jobs", tags=["jobs-ai"])


class DiscoverUrlRequest(BaseModel):
    url: str
    name: str = ""


class DiscoverNameRequest(BaseModel):
    name: str


class AutoDiscoverRequest(BaseModel):
    names: list[str] | None = None
    max_scan: int | None = None


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


def _user_id(header: str | None = Header(default=None, alias="X-User-Id")) -> int:
    if not header or not header.strip().isdigit():
        raise HTTPException(status_code=400, detail="X-User-Id header required")
    return int(header.strip())


def _require_user(db: Session, user_id: int) -> models.User:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utente non valido")
    return user


@router.post("/analyze-url", response_model=AnalyzeJobUrlResponse)
async def analyze_job_url(
    body: AnalyzeJobUrlRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(_user_id),
):
    from scraper.job_page import fetch_job_page
    from scraper.llm.job_analyze import analyze_job_url_with_ai

    user = _require_user(db, user_id)
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

    return AnalyzeJobUrlResponse(**result)


@router.post("/companies/{company_id}/scan", response_model=CompanyScanResult)
async def scan_company_careers(
    company_id: int,
    body: CompanyScanRequest | None = None,
    db: Session = Depends(get_db),
    _user_id: int = Depends(_user_id),
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
    db: Session = Depends(get_db),
    _user_id: int = Depends(_user_id),
):
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
    db: Session = Depends(get_db),
    _user_id: int = Depends(_user_id),
):
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
async def discover_company_url(
    body: DiscoverUrlRequest,
    db: Session = Depends(get_db),
    _user_id: int = Depends(_user_id),
):
    found = await discover_from_url(body.url, body.name)
    if not found:
        raise HTTPException(status_code=404, detail="Pagina careers non raggiungibile o non valida")
    company, _ = repo.upsert_company(db, found)
    return company


@router.post("/companies/discover-name", response_model=Company)
async def discover_company_name(
    body: DiscoverNameRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(_user_id),
):
    user = _require_user(db, user_id)
    found = await discover_from_name(body.name, db, user.id)
    if not found:
        raise HTTPException(status_code=404, detail="Azienda non trovata su Greenhouse/Lever/Workable/Ashby")
    company, _ = repo.upsert_company(db, found)
    return company


@router.post("/companies/auto-discover", response_model=DiscoveryResult)
async def auto_discover_companies(
    body: AutoDiscoverRequest | None = None,
    db: Session = Depends(get_db),
    user_id: int = Depends(_user_id),
):
    from billing.plans import plan_for_user

    user = _require_user(db, user_id)
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
