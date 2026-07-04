from sqlalchemy.orm import Session

from ..filters import ROLE_PENDING_AI
from .gemini import generate_json, is_configured, GeminiError

ROLE_AFFINITY_SCHEMA = {
    "type": "object",
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "match": {"type": "boolean"},
                    "reason": {"type": "string"},
                },
                "required": ["id", "match", "reason"],
            },
        },
    },
    "required": ["results"],
}

ROLE_AFFINITY_SYSTEM = """Sei un classificatore di pertinenza tra annunci di lavoro e la ricerca dell'utente.
Valuta ogni titolo SOLO rispetto a cio che l'utente ha scritto nel prompt o nei ruoli indicati.

match=true: titolo corrisponde al ruolo scritto nel prompt (sinonimi di seniority ok).
match=false: titolo con linguaggio, tecnologia o stack diverso da quello nel prompt.

Se la richiesta non specifica un settore o tipo di ruolo, non escludere per categoria professionale.
In dubbio su un vincolo NON presente nel prompt: non escludere.
reason: frase breve in italiano (max 8 parole). JSON only."""

BATCH_SIZE = 100
MAX_BATCHES = 5
AI_PENDING_REASONS = {ROLE_PENDING_AI}


async def _classify_batch(
    db: Session,
    context: str,
    roles_line: str,
    batch: list[str],
    user_id: int | None,
) -> dict[str, dict[str, str | bool]]:
    lines = "\n".join(f"{i}. {title}" for i, title in enumerate(batch))
    user_msg = (
        f"Richiesta utente: {context}{roles_line}\n\n"
        f"Classifica ogni titolo (id = indice):\n{lines}"
    )
    try:
        data, _, _ = await generate_json(
            db, "classify_roles", ROLE_AFFINITY_SYSTEM, user_msg, ROLE_AFFINITY_SCHEMA, user_id
        )
    except (GeminiError, Exception):
        return {}

    out: dict[str, dict[str, str | bool]] = {}
    for item in data.get("results") or []:
        idx = item.get("id")
        if not isinstance(idx, int) or idx < 0 or idx >= len(batch):
            continue
        title = batch[idx]
        out[title] = {
            "match": bool(item.get("match")),
            "reason": str(item.get("reason") or "").strip() or "Pertinente",
        }
    return out


async def classify_role_affinity(
    db: Session,
    prompt_text: str,
    target_roles: list[str],
    job_titles: list[str],
    user_id: int | None = None,
) -> dict[str, dict[str, str | bool]]:
    if not job_titles or not is_configured():
        return {}

    prompt = prompt_text.strip()
    targets = ", ".join(dict.fromkeys(r.strip() for r in target_roles if r.strip()))
    if not prompt and not targets:
        return {}

    unique_titles = list(dict.fromkeys(t.strip() for t in job_titles if t.strip()))
    if not unique_titles:
        return {}

    context = prompt or targets
    roles_line = f"\nRuoli: {targets}" if targets else ""
    capped = unique_titles[: BATCH_SIZE * MAX_BATCHES]
    batches = [
        capped[i : i + BATCH_SIZE]
        for i in range(0, len(capped), BATCH_SIZE)
    ][:MAX_BATCHES]

    out: dict[str, dict[str, str | bool]] = {}
    for batch in batches:
        part = await _classify_batch(db, context, roles_line, batch, user_id)
        out.update(part)
    return out


def should_ai_classify_reason(reason: str) -> bool:
    return reason in AI_PENDING_REASONS
