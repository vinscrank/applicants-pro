import json
import httpx
from sqlalchemy.orm import Session

from .config import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_PARSE_MODEL, GEMINI_API_URL
from .usage_pg import assert_budget_available, assert_operation_allowed, log_usage, BudgetExceededError

SEARCH_COMMAND_SCHEMA = {
    "type": "object",
    "properties": {
        "prompt_text": {"type": "string"},
        "locations": {"type": "array", "items": {"type": "string"}},
        "require_location": {"type": "boolean"},
        "posted_within": {
            "type": "string",
            "enum": ["any", "24h", "7d", "30d", "90d"],
        },
        "posted_within_days": {"type": "integer", "nullable": True},
        "location_rules": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "areas": {"type": "array", "items": {"type": "string"}},
                    "work_mode": {
                        "type": "string",
                        "enum": ["any", "onsite", "hybrid", "remote"],
                    },
                },
                "required": ["areas", "work_mode"],
            },
        },
        "remote_only_areas": {"type": "array", "items": {"type": "string"}},
        "allowed_roles": {"type": "array", "items": {"type": "string"}},
        "require_role_match": {"type": "boolean"},
        "exclude_patterns": {"type": "array", "items": {"type": "string"}},
        "title_keywords": {"type": "array", "items": {"type": "string"}},
        "require_active_apply": {"type": "boolean"},
        "exclude_pure_sales": {"type": "boolean"},
        "exclude_call_center": {"type": "boolean"},
    },
    "required": [
        "prompt_text", "locations", "require_location", "posted_within",
        "allowed_roles", "require_role_match", "exclude_patterns",
        "require_active_apply", "exclude_pure_sales", "exclude_call_center",
    ],
}

DISCOVERY_SCHEMA = {
    "type": "object",
    "properties": {
        "candidates": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ats": {"type": "string", "enum": ["greenhouse", "lever", "workable", "ashby"]},
                    "slug": {"type": "string"},
                    "careers_url": {"type": "string"},
                },
                "required": ["ats", "slug"],
            },
        },
    },
    "required": ["candidates"],
}


class GeminiError(Exception):
    pass


def is_configured() -> bool:
    return bool(GEMINI_API_KEY)


def _parse_json_from_text(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        cleaned = cleaned[start : end + 1]
    return json.loads(cleaned)


async def generate_json(
    db: Session,
    operation: str,
    system: str,
    user: str,
    schema: dict,
    user_id: int | None = None,
    model: str | None = None,
    temperature: float = 0.2,
    max_output_tokens: int | None = None,
    timeout: float = 45,
) -> tuple[dict, int, int]:
    if not GEMINI_API_KEY:
        raise GeminiError("GEMINI_API_KEY non configurata")
    assert_operation_allowed(db, operation)
    assert_budget_available(db, user_id=user_id)
    if user_id is not None:
        from .usage_pg import assert_user_ai_quota
        assert_user_ai_quota(db, user_id)

    generation_config: dict = {
        "responseMimeType": "application/json",
        "responseSchema": schema,
        "temperature": temperature,
    }
    if max_output_tokens is not None:
        generation_config["maxOutputTokens"] = max_output_tokens

    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": generation_config,
    }
    return await _post_gemini_json(
        db, operation, payload, model, user_id, timeout
    )


async def generate_json_with_google_search(
    db: Session,
    operation: str,
    system: str,
    user: str,
    schema: dict,
    user_id: int | None = None,
    model: str | None = None,
    temperature: float = 0.2,
    max_output_tokens: int | None = None,
    timeout: float = 60,
) -> tuple[dict, int, int]:
    if not GEMINI_API_KEY:
        raise GeminiError("GEMINI_API_KEY non configurata")
    assert_operation_allowed(db, operation)
    assert_budget_available(db, user_id=user_id)
    if user_id is not None:
        from .usage_pg import assert_user_ai_quota
        assert_user_ai_quota(db, user_id)

    schema_hint = (
        "\n\nRispondi SOLO con JSON valido (nessun markdown) con questa struttura:\n"
        f"{json.dumps(schema, ensure_ascii=False)}"
    )
    generation_config: dict = {"temperature": temperature}
    if max_output_tokens is not None:
        generation_config["maxOutputTokens"] = max_output_tokens

    payload = {
        "systemInstruction": {"parts": [{"text": system + schema_hint}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "tools": [{"google_search": {}}],
        "generationConfig": generation_config,
    }
    return await _post_gemini_json(
        db, operation, payload, model, user_id, timeout
    )


async def _post_gemini_json(
    db: Session,
    operation: str,
    payload: dict,
    model: str | None,
    user_id: int | None,
    timeout: float,
) -> tuple[dict, int, int]:
    model_name = (model or GEMINI_MODEL).strip() or GEMINI_MODEL
    url = GEMINI_API_URL.format(model=model_name)
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(url, params={"key": GEMINI_API_KEY}, json=payload)
        if r.status_code != 200:
            raise GeminiError(f"Gemini API error {r.status_code}: {r.text[:300]}")
        data = r.json()

    usage = data.get("usageMetadata") or {}
    input_tokens = int(usage.get("promptTokenCount") or 0)
    output_tokens = int(usage.get("candidatesTokenCount") or 0)
    log_usage(db, "gemini", model_name, operation, input_tokens, output_tokens, user_id)

    candidates = data.get("candidates") or []
    if not candidates:
        raise GeminiError("Risposta Gemini vuota")
    parts = candidates[0].get("content", {}).get("parts") or []
    text = "".join(str(part.get("text") or "") for part in parts if part.get("text"))
    if not text:
        raise GeminiError("JSON Gemini mancante")
    try:
        return _parse_json_from_text(text), input_tokens, output_tokens
    except json.JSONDecodeError as e:
        raise GeminiError(f"JSON non valido: {e}") from e
