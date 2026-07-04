from fastapi import HTTPException
from sqlalchemy.orm import Session

from .config import GEMINI_API_KEY

REASON_MISSING_KEY = "missing_api_key"
REASON_MISSING_BUDGET = "missing_budget"
REASON_BUDGET_EXCEEDED = "budget_exceeded"
REASON_DAILY_BUDGET_EXCEEDED = "daily_budget_exceeded"
REASON_DAILY_CALLS_EXCEEDED = "daily_calls_exceeded"
REASON_READY = "ready"


def evaluate_llm_access(db: Session, user_id: int | None = None) -> dict:
    from .usage_pg import get_monthly_budget, get_month_spend, get_day_spend, get_day_calls
    from .config import LLM_DAILY_BUDGET_USD, LLM_MAX_DAILY_CALLS

    if user_id is not None:
        import models
        from billing.owner import is_owner

        user = db.get(models.User, user_id)
        if user and (is_owner(user) or user.plan_tier == "owner"):
            return {
                "ready": True,
                "reason": REASON_READY,
                "access_message": "",
            }

    configured = bool(GEMINI_API_KEY)
    budget = get_monthly_budget(db)
    month_spend = get_month_spend(db)
    day_spend = get_day_spend(db)
    day_calls = get_day_calls(db)
    budget_exceeded = budget > 0 and month_spend >= budget
    daily_budget_exceeded = LLM_DAILY_BUDGET_USD > 0 and day_spend >= LLM_DAILY_BUDGET_USD
    daily_calls_exceeded = LLM_MAX_DAILY_CALLS > 0 and day_calls >= LLM_MAX_DAILY_CALLS

    if not configured:
        return {
            "ready": False,
            "reason": REASON_MISSING_KEY,
            "access_message": "Configura GEMINI_API_KEY nel file .env e riavvia l'applicazione.",
        }
    if budget <= 0:
        return {
            "ready": False,
            "reason": REASON_MISSING_BUDGET,
            "access_message": "Imposta un budget mensile maggiore di zero per attivare Offerte Live.",
        }
    if budget_exceeded:
        return {
            "ready": False,
            "reason": REASON_BUDGET_EXCEEDED,
            "access_message": "Budget mensile Gemini esaurito. Aumenta il budget o attendi il prossimo mese.",
        }
    if daily_budget_exceeded:
        return {
            "ready": False,
            "reason": REASON_DAILY_BUDGET_EXCEEDED,
            "access_message": "Budget giornaliero Gemini esaurito. Attendi domani o aumenta LLM_DAILY_BUDGET_USD nel .env.",
        }
    if daily_calls_exceeded:
        return {
            "ready": False,
            "reason": REASON_DAILY_CALLS_EXCEEDED,
            "access_message": "Limite giornaliero chiamate Gemini raggiunto. Attendi domani o aumenta LLM_MAX_DAILY_CALLS nel .env.",
        }
    return {
        "ready": True,
        "reason": REASON_READY,
        "access_message": "",
    }


def ensure_llm_access(db: Session, user_id: int | None = None) -> None:
    access = evaluate_llm_access(db, user_id=user_id)
    if not access["ready"]:
        status = 402 if access["reason"] in (
            REASON_BUDGET_EXCEEDED,
            REASON_DAILY_BUDGET_EXCEEDED,
            REASON_DAILY_CALLS_EXCEEDED,
        ) else 403
        raise HTTPException(status_code=status, detail=access["access_message"])
    if user_id is not None:
        from .usage_pg import assert_user_ai_quota
        try:
            assert_user_ai_quota(db, user_id)
        except Exception as e:
            from .usage_pg import BudgetExceededError
            if isinstance(e, BudgetExceededError):
                raise HTTPException(status_code=402, detail=str(e)) from e
            raise
