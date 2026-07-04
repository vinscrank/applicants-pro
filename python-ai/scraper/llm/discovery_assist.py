from sqlalchemy.orm import Session

from .gemini import generate_json, is_configured, GeminiError, DISCOVERY_SCHEMA
from .usage_pg import BudgetExceededError

DISCOVERY_SYSTEM = """Sei un esperto di ATS (Greenhouse, Lever, Workable, Ashby).
Dato il nome di un'azienda tech, suggerisci fino a 6 candidati plausibili con ats e slug URL.
Gli slug sono lowercase, senza spazi (es. stripe, mondaydotcom, 1password).
Restituisci SOLO JSON. Se non conosci l'azienda, proponi varianti slug plausibili del nome."""


async def suggest_company_slugs(db: Session, company_name: str, user_id: int | None = None) -> list[dict]:
    if not is_configured():
        return []
    try:
        data, _, _ = await generate_json(
            db,
            "discover_company",
            DISCOVERY_SYSTEM,
            f"Azienda: {company_name.strip()}",
            DISCOVERY_SCHEMA,
            user_id,
        )
        return data.get("candidates") or []
    except BudgetExceededError:
        raise
    except GeminiError:
        return []
    except Exception:
        return []
