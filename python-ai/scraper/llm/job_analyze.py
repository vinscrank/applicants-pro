import hashlib
import time

from sqlalchemy.orm import Session

from .gemini import generate_json, is_configured, GeminiError

_ANALYZE_CACHE: dict[str, tuple[float, dict]] = {}
_ANALYZE_CACHE_TTL = 600


def _analyze_cache_key(page_url: str) -> str:
    from scraper.url_normalize import normalize_job_url

    return hashlib.sha256(normalize_job_url(page_url).encode()).hexdigest()


def _analyze_cache_get(key: str) -> dict | None:
    row = _ANALYZE_CACHE.get(key)
    if not row:
        return None
    expires_at, payload = row
    if time.time() > expires_at:
        _ANALYZE_CACHE.pop(key, None)
        return None
    return dict(payload)


def _analyze_cache_set(key: str, payload: dict) -> None:
    _ANALYZE_CACHE[key] = (time.time() + _ANALYZE_CACHE_TTL, dict(payload))

JOB_ANALYZE_SCHEMA = {
    "type": "object",
    "properties": {
        "role": {"type": "string"},
        "company": {"type": "string"},
        "location": {"type": "string"},
        "posted_at": {"type": "string"},
        "origin_label": {"type": "string"},
        "application_method": {
            "type": "string",
            "enum": ["linkedin", "company_website", "indeed", "job_board", "other"],
        },
        "remote_type": {
            "type": "string",
            "enum": ["remote", "hybrid", "onsite", "unknown"],
        },
        "summary": {"type": "string"},
        "review": {"type": "string"},
        "highlights": {"type": "array", "items": {"type": "string"}},
        "concerns": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "role",
        "company",
        "location",
        "posted_at",
        "origin_label",
        "application_method",
        "remote_type",
        "summary",
        "review",
        "highlights",
        "concerns",
    ],
}

JOB_ANALYZE_SYSTEM = """Sei un assistente che analizza un singolo annuncio di lavoro a partire da URL e testo estratto dalla pagina.
Estrai i dati utili e scrivi una breve review in italiano, chiara e concreta (max 4 frasi nella review).

Regole:
- role: titolo del ruolo reale, senza suffissi del sito (es. rimuovi "| LinkedIn").
- company: nome azienda.
- location: citta/area o Remote/Hybrid se deducibile.
- posted_at: data pubblicazione in formato ISO YYYY-MM-DD se presente, altrimenti stringa vuota.
- origin_label: nome leggibile della fonte (LinkedIn, Greenhouse, Lever, Workable, Ashby, Stripe, Indeed, Sito web, ecc.).
- application_method: linkedin | company_website | indeed | job_board | other.
- remote_type: remote | hybrid | onsite | unknown.
- summary: 1-2 frasi sul contenuto dell'annuncio.
- review: valutazione rapida di pertinenza e punti da controllare prima di candidarsi.
- highlights: 2-4 bullet utili (stack, seniority, benefit, ecc.).
- concerns: 0-3 punti di attenzione (requisiti mancanti, info assenti, red flag soft).
Usa solo informazioni presenti o deducibili con alta confidenza. JSON only."""


async def analyze_job_url_with_ai(
    db: Session,
    page: dict,
    user_id: int | None = None,
) -> dict:
    if not is_configured():
        raise GeminiError("GEMINI_API_KEY non configurata")

    cache_key = _analyze_cache_key(str(page.get("url") or ""))
    cached = _analyze_cache_get(cache_key)
    if cached:
        return cached

    user_msg = (
        f"URL: {page.get('url')}\n"
        f"Origine rilevata: {page.get('origin')}\n"
        f"Titolo grezzo: {page.get('title_guess')}\n"
        f"Azienda grezza: {page.get('company_guess')}\n"
        f"Location grezza: {page.get('location_guess')}\n"
        f"Data grezza: {page.get('posted_at_guess')}\n\n"
        f"Descrizione estratta:\n{(page.get('description') or '')[:6000]}\n\n"
        f"Testo pagina (estratto):\n{(page.get('page_text') or '')[:4000]}"
    )
    data, _, _ = await generate_json(
        db,
        "analyze_job_url",
        JOB_ANALYZE_SYSTEM,
        user_msg,
        JOB_ANALYZE_SCHEMA,
        user_id,
    )
    result = {
        "url": page.get("url") or "",
        "origin": page.get("origin") or "web",
        "role": str(data.get("role") or page.get("title_guess") or "").strip(),
        "company": str(data.get("company") or page.get("company_guess") or "").strip(),
        "location": str(data.get("location") or page.get("location_guess") or "").strip(),
        "posted_at": str(data.get("posted_at") or page.get("posted_at_guess") or "").strip(),
        "origin_label": str(data.get("origin_label") or page.get("origin") or "Web").strip(),
        "application_method": str(data.get("application_method") or "other").strip(),
        "remote_type": str(data.get("remote_type") or "unknown").strip(),
        "summary": str(data.get("summary") or "").strip(),
        "review": str(data.get("review") or "").strip(),
        "highlights": [str(x).strip() for x in (data.get("highlights") or []) if str(x).strip()],
        "concerns": [str(x).strip() for x in (data.get("concerns") or []) if str(x).strip()],
    }
    _analyze_cache_set(cache_key, result)
    return result
