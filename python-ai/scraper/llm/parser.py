from sqlalchemy.orm import Session

from ..schemas import SearchCommand, LocationRule
from ..location_match import flatten_location_rules
from ..title_match import dedupe_title_keywords, infer_title_keywords, title_keywords_for_command
from .config import GEMINI_PARSE_MODEL
from .gemini import generate_json, is_configured, GeminiError, SEARCH_COMMAND_SCHEMA

PARSE_SYSTEM = """Sei l'unico interprete del prompt di ricerca lavoro. Nessun codice downstream correggera le tue scelte.
Estrai filtri precisi dal testo libero (italiano o inglese) e restituisci SOLO JSON valido.

Regole critiche:
- prompt_text: copia il testo utente (trim).
- allowed_roles: ruoli cercati ESATTAMENTE come scritti dall'utente nel prompt.
  * UN solo ruolo nel prompt -> UNA SOLA voce in allowed_roles (max 1). Correggi solo typo evidenti
    nello stesso ruolo (es. enegineer -> engineer). NON aggiungere sinonimi, traduzioni o varianti
    (developer/engineer, frontend/front-end, dev/sviluppatore) se l'utente non li ha scritti.
  * Piu ruoli SOLO se il prompt contiene OR/oppure/o/| tra ruoli distinti (es. "frontend engineer o react developer"):
    metti OGNI ruolo come voce separata (max 3) e require_role_match=false.
  * L'interpretazione mostrata all'utente deve corrispondere al prompt: non espandere o arricchire i ruoli.
- require_role_match: true se c'e un solo ruolo cercato (default). false SOLO se c'e OR/oppure/o/| tra ruoli distinti.
- location_rules: regole geografiche strutturate. Ogni regola ha:
  - areas: massimo 4 varianti utili per match e job board. Esempio Dublino:
    ["Dublin, Ireland", "Dublino", "Dublin", "Ireland"]. Niente liste lunghe duplicate.
  - work_mode: "any" | "onsite" | "hybrid" | "remote"
    * "a Dublino"/"in Milan" senza vincolo modalita -> work_mode="any" (NON onsite).
    * "onsite"/"in sede" esplicito -> "onsite". "remoto"/"da remoto" -> "remote". "ibrido"/"hybrid" -> "hybrid".
    * "any" = onsite, ibrido o remoto legati all'area.
- locations: [] (derivato da location_rules).
- remote_only_areas: [] (derivato da location_rules).
- require_location: true se il prompt vincola geografia o modalita.
- posted_within / posted_within_days: SOLO se il prompt menziona un periodo. Altrimenti any e null.
- exclude_patterns / exclude_pure_sales / exclude_call_center: solo esclusioni esplicite.
- title_keywords: parole o frasi che DEVONO comparire nel TITOLO dell'annuncio quando il prompt lo chiede
  (es. "Italian speaker", "Italian" nel titolo). Metti ogni variante come voce separata (OR). [] se non richiesto.
  NON mettere queste voci in allowed_roles: allowed_roles e solo per tipi di lavoro (developer, support, sales, ecc.).
- Se il prompt non cerca un ruolo tech specifico (es. "qualsiasi settore", "non importa se tech"), lascia allowed_roles=[].
- require_active_apply: true salvo richiesta contraria.
- Non inventare filtri assenti nel prompt."""

VALID_POSTED_WITHIN = frozenset({"any", "24h", "7d", "30d", "90d"})
VALID_WORK_MODES = frozenset({"any", "onsite", "hybrid", "remote"})


def _prompt_has_role_or(text: str) -> bool:
    lowered = f" {(text or '').lower()} "
    for marker in (" oppure ", " or ", " | ", " o "):
        if marker in lowered:
            return True
    return False


def _compact_allowed_roles(roles: list[str], *, single_role_only: bool = False) -> list[str]:
    out: list[str] = []
    seen_tokens: set[frozenset[str]] = set()
    for role in roles:
        cleaned = role.strip()
        if not cleaned:
            continue
        tokens = frozenset(cleaned.lower().split())
        if tokens in seen_tokens:
            continue
        seen_tokens.add(tokens)
        out.append(cleaned)
        if single_role_only or len(out) >= 3:
            break
    return out


def _rules_from_payload(cmd: SearchCommand) -> list[LocationRule]:
    rules: list[LocationRule] = []
    for raw in cmd.location_rules or []:
        areas = [a.strip() for a in raw.areas if a.strip()]
        if not areas:
            continue
        mode = raw.work_mode if raw.work_mode in VALID_WORK_MODES else "any"
        rules.append(LocationRule(areas=areas, work_mode=mode))
    if rules:
        return rules
    if cmd.locations or cmd.remote_only_areas:
        from ..location_match import rules_from_legacy

        return rules_from_legacy(cmd.locations, cmd.remote_only_areas or [])
    return []


def normalize_search_command(cmd: SearchCommand) -> SearchCommand:
    location_rules = _rules_from_payload(cmd)
    locations, remote_only = flatten_location_rules(location_rules)

    raw_roles = [r.strip() for r in cmd.allowed_roles if r.strip()]
    has_role_or = _prompt_has_role_or(cmd.prompt_text or "")
    if not has_role_or:
        allowed_roles = _compact_allowed_roles(raw_roles, single_role_only=True)
        require_role_match = True
    else:
        allowed_roles = _compact_allowed_roles(raw_roles, single_role_only=False)
        require_role_match = len(allowed_roles) <= 1

    posted_within = cmd.posted_within if cmd.posted_within in VALID_POSTED_WITHIN else "any"
    posted_within_days = cmd.posted_within_days
    if posted_within_days is not None and posted_within_days <= 0:
        posted_within_days = None

    require_location = cmd.require_location or bool(location_rules)

    title_keywords = dedupe_title_keywords(
        list(getattr(cmd, "title_keywords", []) or []) + infer_title_keywords(cmd.prompt_text or "")
    )
    if title_keywords:
        dev_noise = {"italian speaker", "italian", "italiano", "speaker"}
        allowed_roles = [r for r in allowed_roles if r.strip().lower() not in dev_noise]

    return cmd.model_copy(
        update={
            "languages": [],
            "require_language": False,
            "title_keywords": title_keywords,
            "location_rules": location_rules,
            "locations": locations,
            "remote_only_areas": remote_only,
            "posted_within": posted_within,
            "posted_within_days": posted_within_days,
            "require_location": require_location,
            "allowed_roles": allowed_roles,
            "require_role_match": require_role_match,
        }
    )


async def parse_prompt_llm(
    db: Session, text: str, base: SearchCommand | None = None, user_id: int | None = None
) -> tuple[SearchCommand, bool]:
    cleaned = text.strip()
    if not cleaned:
        cmd = base or SearchCommand()
        cmd.prompt_text = ""
        return cmd, False

    if not is_configured():
        raise GeminiError("GEMINI_API_KEY non configurata")

    user_msg = cleaned
    if base:
        user_msg += f"\n\nContesto attuale (aggiorna se il prompt lo richiede): {base.model_dump_json()}"

    data, _, _ = await generate_json(
        db, "parse_prompt", PARSE_SYSTEM, user_msg, SEARCH_COMMAND_SCHEMA, user_id, GEMINI_PARSE_MODEL, temperature=0
    )
    data["prompt_text"] = cleaned
    data["languages"] = []
    data["require_language"] = False
    if not data.get("title_keywords"):
        data["title_keywords"] = []
    if not data.get("location_rules"):
        data["location_rules"] = []
    cmd = normalize_search_command(SearchCommand(**data))
    return cmd, True
