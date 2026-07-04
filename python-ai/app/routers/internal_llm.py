from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi import Depends

from database import get_db
from scraper.llm.config import GEMINI_MODEL
from scraper.llm.gemini import is_configured
from scraper.llm.usage_pg import get_llm_stats, init_llm_settings, set_monthly_budget, update_llm_controls

router = APIRouter(prefix="/api/internal/llm", tags=["llm"])


class BudgetUpdate(BaseModel):
    monthly_budget_usd: float


class LlmControlsUpdate(BaseModel):
    parse_prompt_enabled: bool | None = None
    discover_company_enabled: bool | None = None
    auto_discover_enabled: bool | None = None


@router.get("/stats")
def llm_stats(db: Session = Depends(get_db)):
    init_llm_settings(db)
    return get_llm_stats(db, is_configured(), GEMINI_MODEL)


@router.put("/budget")
def llm_budget(body: BudgetUpdate, db: Session = Depends(get_db)):
    budget = set_monthly_budget(db, body.monthly_budget_usd)
    stats = get_llm_stats(db, is_configured(), GEMINI_MODEL)
    stats["monthly_budget_usd"] = budget
    stats["month_remaining_usd"] = round(max(0.0, budget - stats["month_spend_usd"]), 6) if budget > 0 else None
    stats["budget_exceeded"] = budget > 0 and stats["month_spend_usd"] >= budget
    return stats


@router.put("/controls")
def llm_controls(body: LlmControlsUpdate, db: Session = Depends(get_db)):
    update_llm_controls(
        db,
        parse_prompt_enabled=body.parse_prompt_enabled,
        discover_company_enabled=body.discover_company_enabled,
        auto_discover_enabled=body.auto_discover_enabled,
    )
    return get_llm_stats(db, is_configured(), GEMINI_MODEL)
