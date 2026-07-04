import hashlib
from datetime import datetime

from sqlalchemy.orm import Session

from ..filters import detect_seniority
from ..schemas import JobOffer, SearchCommand, VerificationStatus
from scraper.url_normalize import normalize_job_url
from .config import GEMINI_PARSE_MODEL
from .gemini import GeminiError, generate_json, generate_json_with_google_search, is_configured

MAX_GEMINI_OFFERS = 25

JOB_DISCOVER_SCHEMA = {
    "type": "object",
    "properties": {
        "offers": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "company": {"type": "string"},
                    "role": {"type": "string"},
                    "apply_url": {"type": "string"},
                    "source": {"type": "string"},
                    "location": {"type": "string"},
                    "posted_at": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["company", "role", "apply_url", "reason"],
            },
        }
    },
    "required": ["offers"],
}

DISCOVER_SYSTEM = """Sei un assistente di ricerca lavoro. Usa Google Search per trovare annunci REALI e attualmente online.
Interpreta la richiesta in modo flessibile, come farebbe ChatGPT: capisci l'intento senza regole rigide.
Restituisci SOLO JSON valido con le offerte piu utili (max 25).
Non inventare URL: ogni apply_url deve essere un link reale trovato sul web (pagina annuncio o candidatura).
Preferisci annunci recenti e pertinenti al prompt. reason: frase breve in italiano (max 12 parole)."""


def _make_id(company: str, role: str, apply_url: str) -> str:
    apply_norm = normalize_job_url(apply_url) or apply_url
    raw = f"gemini:{company}:{role}:{apply_norm}"
    return hashlib.md5(raw.encode()).hexdigest()[:12]


def _origin_from_url(url: str) -> str:
    lower = url.lower()
    if "linkedin.com" in lower:
        return "linkedin"
    if "indeed.com" in lower:
        return "indeed"
    if "greenhouse.io" in lower or "lever.co" in lower or "workable.com" in lower:
        return "ats"
    return "website"


def _to_job_offer(raw: dict) -> JobOffer | None:
    company = str(raw.get("company") or "").strip()
    role = str(raw.get("role") or "").strip()
    apply_url = str(raw.get("apply_url") or "").strip()
    if not company or not role or not apply_url.startswith("http"):
        return None
    reason = str(raw.get("reason") or "").strip() or "Pertinente al prompt"
    source = str(raw.get("source") or "").strip() or "web"
    location = str(raw.get("location") or "").strip() or None
    posted_at = str(raw.get("posted_at") or "").strip() or None
    return JobOffer(
        id=_make_id(company, role, apply_url),
        company=company,
        role=role,
        apply_url=apply_url,
        source=source,
        origin=_origin_from_url(apply_url),
        posted_at=posted_at,
        location=location,
        seniority=detect_seniority(role),
        web_dev_fit=0,
        web_dev_fit_label="",
        status=VerificationStatus.VERIFIED,
        status_reason=reason,
        verified_at=datetime.utcnow(),
    )


async def discover_jobs_with_gemini(
    db: Session,
    command: SearchCommand,
    user_id: int | None = None,
) -> list[JobOffer]:
    if not is_configured():
        return []

    prompt = (command.prompt_text or "").strip()
    if not prompt:
        return []

    user_msg = f'Richiesta utente: "{prompt}"\nTrova annunci di lavoro reali e utili.'
    data: dict | None = None
    try:
        data, _, _ = await generate_json_with_google_search(
            db,
            "discover_jobs",
            DISCOVER_SYSTEM,
            user_msg,
            JOB_DISCOVER_SCHEMA,
            user_id,
            GEMINI_PARSE_MODEL,
            temperature=0.2,
            timeout=90,
        )
    except GeminiError:
        try:
            data, _, _ = await generate_json(
                db,
                "discover_jobs",
                DISCOVER_SYSTEM,
                user_msg,
                JOB_DISCOVER_SCHEMA,
                user_id,
                GEMINI_PARSE_MODEL,
                temperature=0.2,
                timeout=45,
            )
        except GeminiError:
            return []

    if not data:
        return []

    offers: list[JobOffer] = []
    seen: set[str] = set()
    for raw in data.get("offers") or []:
        if not isinstance(raw, dict):
            continue
        offer = _to_job_offer(raw)
        if not offer or offer.id in seen:
            continue
        seen.add(offer.id)
        offers.append(offer)
        if len(offers) >= MAX_GEMINI_OFFERS:
            break
    return offers
