from datetime import datetime, timezone

from sqlalchemy.orm import Session

import scraper_orm
from .config import (
    GEMINI_INPUT_COST_PER_TOKEN,
    GEMINI_OUTPUT_COST_PER_TOKEN,
    LLM_BUDGET_CEILING_USD,
    LLM_DAILY_BUDGET_USD,
    LLM_MAX_DAILY_CALLS,
    LLM_MONTHLY_BUDGET_USD,
)
from .policies import LlmPolicyError


class BudgetExceededError(Exception):
    pass


def init_llm_settings(db: Session) -> None:
    row = db.get(scraper_orm.LlmSettingsRow, 1)
    if not row:
        db.add(
            scraper_orm.LlmSettingsRow(
                id=1,
                monthly_budget_usd=min(LLM_MONTHLY_BUDGET_USD, LLM_BUDGET_CEILING_USD),
                parse_prompt_enabled=True,
                discover_company_enabled=True,
                auto_discover_enabled=False,
            )
        )
        db.commit()


def get_llm_settings_row(db: Session) -> scraper_orm.LlmSettingsRow:
    init_llm_settings(db)
    row = db.get(scraper_orm.LlmSettingsRow, 1)
    if not row:
        raise RuntimeError("LLM settings non inizializzate")
    return row


def get_monthly_budget(db: Session) -> float:
    return float(get_llm_settings_row(db).monthly_budget_usd)


def set_monthly_budget(db: Session, budget_usd: float) -> float:
    budget = min(max(0.0, budget_usd), LLM_BUDGET_CEILING_USD)
    row = get_llm_settings_row(db)
    row.monthly_budget_usd = budget
    db.commit()
    return budget


def update_llm_controls(
    db: Session,
    parse_prompt_enabled: bool | None = None,
    discover_company_enabled: bool | None = None,
    auto_discover_enabled: bool | None = None,
) -> scraper_orm.LlmSettingsRow:
    row = get_llm_settings_row(db)
    if parse_prompt_enabled is not None:
        row.parse_prompt_enabled = parse_prompt_enabled
    if discover_company_enabled is not None:
        row.discover_company_enabled = discover_company_enabled
    if auto_discover_enabled is not None:
        row.auto_discover_enabled = auto_discover_enabled
    db.commit()
    return row


def _month_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _today_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def get_month_spend(db: Session) -> float:
    total = (
        db.query(scraper_orm.LlmUsageRow)
        .filter(scraper_orm.LlmUsageRow.created_at >= _month_start())
        .with_entities(scraper_orm.LlmUsageRow.cost_usd)
        .all()
    )
    return sum(float(r[0]) for r in total)


def get_day_spend(db: Session) -> float:
    total = (
        db.query(scraper_orm.LlmUsageRow)
        .filter(scraper_orm.LlmUsageRow.created_at >= _today_start())
        .with_entities(scraper_orm.LlmUsageRow.cost_usd)
        .all()
    )
    return sum(float(r[0]) for r in total)


def get_day_calls(db: Session) -> int:
    return (
        db.query(scraper_orm.LlmUsageRow)
        .filter(scraper_orm.LlmUsageRow.created_at >= _today_start())
        .count()
    )


def assert_operation_allowed(db: Session, operation: str) -> None:
    row = get_llm_settings_row(db)
    if operation == "parse_prompt" and not row.parse_prompt_enabled:
        raise LlmPolicyError("Analisi prompt disabilitata")
    if operation == "classify_roles" and not row.parse_prompt_enabled:
        raise LlmPolicyError("Analisi prompt disabilitata")
    if operation == "classify_offers" and not row.parse_prompt_enabled:
        raise LlmPolicyError("Analisi prompt disabilitata")
    if operation == "analyze_job_url" and not row.parse_prompt_enabled:
        raise LlmPolicyError("Analisi prompt disabilitata")
    if operation == "profile_page_fit" and not row.parse_prompt_enabled:
        raise LlmPolicyError("Analisi prompt disabilitata")
    if operation in ("rag_assistant", "embed_text", "embed_batch", "embed_job", "embed_offer", "embed_job_fit", "embed_rag_query", "embed_similar_query", "embed_offer_batch", "embed_profile", "embed_application", "embed_chunk") and not row.parse_prompt_enabled:
        raise LlmPolicyError("Analisi prompt disabilitata")
    if operation == "discover_company" and not row.discover_company_enabled:
        raise LlmPolicyError("Discovery aziende con AI disabilitato")
    if operation == "auto_discover" and not row.auto_discover_enabled:
        raise LlmPolicyError("Scoperta automatica disabilitata")


def assert_budget_available(db: Session, estimated_cost: float = 0.0001, user_id: int | None = None) -> None:
    if user_id is not None:
        import models
        from billing.owner import is_owner

        user = db.get(models.User, user_id)
        if user and is_owner(user):
            return

    budget = get_monthly_budget(db)
    if budget > 0 and get_month_spend(db) + estimated_cost > budget:
        raise BudgetExceededError("Budget mensile Gemini esaurito")
    if LLM_DAILY_BUDGET_USD > 0 and get_day_spend(db) + estimated_cost > LLM_DAILY_BUDGET_USD:
        raise BudgetExceededError("Budget giornaliero Gemini esaurito")
    if LLM_MAX_DAILY_CALLS > 0 and get_day_calls(db) >= LLM_MAX_DAILY_CALLS:
        raise BudgetExceededError("Limite giornaliero chiamate Gemini raggiunto")


def estimate_cost(input_tokens: int, output_tokens: int) -> float:
    return (
        input_tokens * GEMINI_INPUT_COST_PER_TOKEN
        + output_tokens * GEMINI_OUTPUT_COST_PER_TOKEN
    )


def get_user_month_calls(db: Session, user_id: int) -> int:
    return (
        db.query(scraper_orm.LlmUsageRow)
        .filter(
            scraper_orm.LlmUsageRow.user_id == user_id,
            scraper_orm.LlmUsageRow.created_at >= _month_start(),
        )
        .count()
    )


def assert_user_ai_quota(db: Session, user_id: int) -> None:
    import models
    from billing.plans import plan_for_user
    from billing.owner import is_owner

    user = db.get(models.User, user_id)
    if not user:
        return
    if is_owner(user) or user.plan_tier == "owner":
        return
    plan = plan_for_user(user)
    if plan.ai_calls_month <= 0:
        raise BudgetExceededError("Piano attuale senza analisi AI. Passa a Pro.")
    used = get_user_month_calls(db, user_id)
    if used >= plan.ai_calls_month:
        raise BudgetExceededError("Limite mensile analisi AI del tuo piano raggiunto. Passa a Business.")


def log_usage(
    db: Session,
    provider: str,
    model: str,
    operation: str,
    input_tokens: int,
    output_tokens: int,
    user_id: int | None = None,
) -> float:
    cost = estimate_cost(input_tokens, output_tokens)
    db.add(
        scraper_orm.LlmUsageRow(
            provider=provider,
            model=model,
            operation=operation,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost,
            user_id=user_id,
            created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()
    return cost


def get_llm_stats(db: Session, configured: bool, model: str) -> dict:
    row = get_llm_settings_row(db)
    month_start = _month_start()
    today_start = _today_start()
    budget = float(row.monthly_budget_usd)

    month_rows = (
        db.query(scraper_orm.LlmUsageRow)
        .filter(scraper_orm.LlmUsageRow.created_at >= month_start)
        .all()
    )
    today_rows = [
        r for r in month_rows
        if (r.created_at.replace(tzinfo=timezone.utc) if r.created_at.tzinfo is None else r.created_at) >= today_start
    ]
    month_cost = sum(float(r.cost_usd) for r in month_rows)
    today_cost = sum(float(r.cost_usd) for r in today_rows)

    by_op: dict[str, dict] = {}
    for r in month_rows:
        entry = by_op.setdefault(r.operation, {"calls": 0, "cost": 0.0})
        entry["calls"] += 1
        entry["cost"] += float(r.cost_usd)

    recent = (
        db.query(scraper_orm.LlmUsageRow)
        .order_by(scraper_orm.LlmUsageRow.id.desc())
        .limit(8)
        .all()
    )

    from .access import evaluate_llm_access

    access = evaluate_llm_access(db)

    return {
        "configured": configured,
        "ready": access["ready"],
        "reason": access["reason"],
        "access_message": access["access_message"],
        "provider": "gemini",
        "model": model,
        "monthly_budget_usd": budget,
        "month_spend_usd": round(month_cost, 6),
        "month_remaining_usd": round(max(0.0, budget - month_cost), 6) if budget > 0 else None,
        "today_spend_usd": round(today_cost, 6),
        "today_remaining_usd": round(max(0.0, LLM_DAILY_BUDGET_USD - today_cost), 6)
        if LLM_DAILY_BUDGET_USD > 0
        else None,
        "month_calls": len(month_rows),
        "today_calls": len(today_rows),
        "budget_exceeded": budget > 0 and month_cost >= budget,
        "budget_ceiling_usd": LLM_BUDGET_CEILING_USD,
        "daily_budget_usd": LLM_DAILY_BUDGET_USD,
        "max_daily_calls": LLM_MAX_DAILY_CALLS,
        "parse_prompt_enabled": row.parse_prompt_enabled,
        "discover_company_enabled": row.discover_company_enabled,
        "auto_discover_enabled": row.auto_discover_enabled,
        "by_operation": [
            {"operation": op, "calls": v["calls"], "cost_usd": round(v["cost"], 6)}
            for op, v in sorted(by_op.items(), key=lambda x: -x[1]["cost"])
        ],
        "recent": [
            {
                "operation": r.operation,
                "input_tokens": r.input_tokens,
                "output_tokens": r.output_tokens,
                "cost_usd": round(float(r.cost_usd), 6),
                "created_at": r.created_at.isoformat(),
            }
            for r in recent
        ],
    }
