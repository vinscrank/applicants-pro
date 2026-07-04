from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from scraper import repository as repo
from scraper.llm.access import ensure_llm_access
from scraper.llm.gemini import GeminiError
from scraper.llm.parser import parse_prompt_llm, normalize_search_command
from scraper.llm.policies import LlmPolicyError
from scraper.llm.usage_pg import BudgetExceededError
from scraper.preferences import merge_command_with_preferences, command_has_posted_constraint, job_passes_posted_constraint
from scraper.prompt_parser import DEFAULT_COMMAND
from scraper.schemas import SearchCommand, SearchPreferences, SearchResult
from scraper.search import run_search

router = APIRouter(prefix="/api/internal/search", tags=["search"])


class ParseRequest(BaseModel):
    prompt_text: str
    command: SearchCommand | None = None


class ParseResponse(BaseModel):
    command: SearchCommand
    used_llm: bool = False


class RunRequest(BaseModel):
    command: SearchCommand | None = None
    preferences: SearchPreferences | None = None


def _user_id(header: str | None = Header(default=None, alias="X-User-Id")) -> int:
    if not header or not header.strip().isdigit():
        raise HTTPException(status_code=400, detail="X-User-Id header required")
    return int(header.strip())


def _recount_result(result: SearchResult) -> None:
    from scraper.schemas import VerificationStatus

    result.total_found = len(result.offers)
    result.verified_count = sum(1 for o in result.offers if o.status == VerificationStatus.VERIFIED)
    result.maybe_count = sum(1 for o in result.offers if o.status == VerificationStatus.MAYBE)
    result.rejected_count = sum(1 for o in result.offers if o.status == VerificationStatus.REJECTED)


@router.post("/parse", response_model=ParseResponse)
async def parse_search(
    body: ParseRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(_user_id),
):
    ensure_llm_access(db, user_id)
    try:
        cmd, used_llm = await parse_prompt_llm(db, body.prompt_text, body.command, user_id)
        prefs = repo.get_user_search_preferences(db, user_id)
        cmd = merge_command_with_preferences(cmd, prefs)
    except GeminiError:
        cmd = normalize_search_command(SearchCommand(prompt_text=body.prompt_text))
        prefs = repo.get_user_search_preferences(db, user_id)
        cmd = merge_command_with_preferences(cmd, prefs)
        return ParseResponse(command=cmd, used_llm=False)
    except BudgetExceededError as e:
        raise HTTPException(status_code=402, detail=str(e)) from e
    except LlmPolicyError as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    return ParseResponse(command=cmd, used_llm=used_llm)


@router.post("/run", response_model=SearchResult)
async def run_job_search(
    body: RunRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(_user_id),
):
    ensure_llm_access(db, user_id)
    command = body.command or DEFAULT_COMMAND
    prefs = body.preferences or repo.get_user_search_preferences(db, user_id)
    cmd = merge_command_with_preferences(command, prefs)
    companies = repo.get_companies_for_scrape(db)
    result = await run_search(cmd, companies, db=db, user_id=user_id, preferences=prefs)
    base_pool = result.offer_pool or result.offers
    if base_pool:
        pool = repo.enrich_offers_applied(db, base_pool, user_id)
        pool = repo.supplement_pool_with_tracker_applications(db, pool, user_id, result.command)
        visible = [
            offer
            for offer in pool
            if (offer.historical or repo._offer_visible_for_command(offer, result.command))
            and (
                not command_has_posted_constraint(result.command)
                or job_passes_posted_constraint(offer.posted_at, result.command)
            )
        ]
        result.offer_pool = visible
        result.offers = visible
    _recount_result(result)
    result.preferences = prefs
    return result
