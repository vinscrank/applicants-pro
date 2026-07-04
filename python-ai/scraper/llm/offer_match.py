import asyncio

from sqlalchemy.orm import Session

from ..schemas import JobOffer, SearchCommand
from ..location_match import location_rules_for_command, location_rules_context_lines
from ..title_match import title_keywords_for_command
from .gemini import generate_json, is_configured, GeminiError

OFFER_MATCH_SCHEMA = {
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

ROLE_MATCH_RULES = """RUOLO (solo vincoli espliciti dal prompt):
- Se il prompt NON indica ruoli/tipi di lavoro: NON filtrare per settore o categoria (tech, sales, HR, support, ecc.).
  Qualsiasi titolo puo essere pertinente se rispetta gli altri vincoli (location, parole nel titolo, data).
- Se il prompt indica uno o piu ruoli: valuta il titolo rispetto a QUEL testo, senza allargarlo ad altri settori.
- Con piu ruoli collegati da OR/oppure: basta corrispondenza ad almeno uno di essi.
- Seniority diversa (Junior/Senior/Lead) NON esclude se il nucleo del ruolo coincide col prompt.
- Se l'utente nomina nel prompt una tecnologia, linguaggio, framework o stack, match=true SOLO se il titolo
  riflette quello stesso elemento scritto dall'utente. Due linguaggi o stack diversi NON sono intercambiabili
  solo perche entrambi sono ruoli developer/engineer.
- Un titolo generico (es. Full Stack Developer, Software Engineer) NON basta se nel prompt c'e un ruolo con
  tecnologia/linguaggio esplicito: match=false.
- match=false se il titolo indica un ruolo, linguaggio o stack diverso da quello nel prompt.
- NON preferire implicitamente ruoli tech, developer o software se l'utente non li ha chiesti."""

LOCATION_MATCH_RULES = """LOCATION (OR / oppure, modalita onsite/ibrido/remoto):
- Valuta area E modalita di lavoro leggendo il campo location dell'annuncio con giudizio semantico.
- Usa i vincoli location_rules del prompt (aree + work_mode per regola). Se piu regole OR, basta una valida.
- work_mode any: accetta onsite, ibrido o remoto se l'area e coerente col prompt.
- work_mode remote: solo se l'annuncio e chiaramente remoto per quell'area.
- work_mode onsite / hybrid: rispetta la modalita richiesta.
- Location assente (N/D) con vincolo geografico = match=false."""

DATE_MATCH_RULES = """DATA:
- Se il prompt indica un periodo (ultima settimana, ultimo mese, ecc.), match=false se la data e chiaramente
  prima di quel periodo oppure se la data manca del tutto (N/D)."""

TITLE_KEYWORD_RULES = """PAROLE NEL TITOLO:
- Se il prompt richiede parole/frasi specifiche nel titolo (es. Italian speaker, Italian), match=false se
  NESSUNA di quelle varianti compare nel titolo dell'annuncio (campo ruolo).
- Per OR tra varianti (Italian speaker OPPURE Italian): basta che il titolo contenga almeno una variante.
- Non inferire dal settore o dalla location: se manca nel titolo, escludi."""

OFFER_MATCH_SYSTEM = f"""Sei l'UNICO classificatore di pertinenza tra annunci e il prompt utente.
Nessun altro filtro corregera le tue decisioni: sii preciso su ruolo, location/modalita, titolo e periodo.

Ogni annuncio: ruolo | location | data pubblicazione | azienda.

{TITLE_KEYWORD_RULES}

{ROLE_MATCH_RULES}

{LOCATION_MATCH_RULES}

{DATE_MATCH_RULES}

match=true SOLO se rispetta tutti i vincoli espliciti del prompt (titolo, ruolo, location, data).
match=false se un vincolo esplicito non e rispettato.
In dubbio su un vincolo NON presente nel prompt: non escludere per quel vincolo.
reason: frase breve in italiano (max 12 parole), indica perche incluso o escluso. JSON only."""

OFFER_MATCH_SYSTEM_STRICT = f"""Sei un classificatore STRICT. Il prompt contiene vincoli su titolo, ruolo, location e/o periodo.

Ogni annuncio: ruolo | location | data pubblicazione | azienda.

{TITLE_KEYWORD_RULES}

{ROLE_MATCH_RULES}

{LOCATION_MATCH_RULES}

{DATE_MATCH_RULES}

match=true SOLO se rispetta tutti i vincoli espliciti (titolo/ruolo/location/data).
Se la data manca (N/D) con vincolo temporale esplicito nel prompt, match=false.
match=false per titolo senza parole richieste, ruolo non coerente, altra citta/area, o data fuori periodo.
reason: frase breve in italiano (max 12 parole). JSON only."""

BATCH_SIZE = 80
MAX_BATCHES = 16
CLASSIFY_CONCURRENCY = 4


def _match_system(command: SearchCommand) -> str:
    from ..prompt_constraints import has_strict_prompt_constraints

    if has_strict_prompt_constraints(command):
        return OFFER_MATCH_SYSTEM_STRICT
    return OFFER_MATCH_SYSTEM


def _classification_tail(command: SearchCommand) -> str:
    roles = [role.strip() for role in command.allowed_roles if role.strip()]
    title_keywords = title_keywords_for_command(command)
    parts: list[str] = []
    if title_keywords:
        parts.append("match=true SOLO se il titolo contiene almeno una parola/frase richiesta nel prompt.")
        parts.append("match=false se mancano le parole richieste nel titolo.")
    if roles:
        if len(roles) > 1 and not command.require_role_match:
            parts.append(
                "match=true se il titolo corrisponde ad ALMENO UNO dei ruoli scritti nel prompt."
            )
        else:
            parts.append("match=true se il titolo corrisponde al ruolo scritto nel prompt.")
        parts.append(
            "match=false se il titolo indica un linguaggio, tecnologia o stack diverso da quello nel prompt."
        )
        parts.append(
            "Un titolo generico developer/engineer NON basta se nel prompt c'e una tecnologia esplicita."
        )
    else:
        parts.append(
            "Nessun ruolo specifico nel prompt: non escludere per settore (tech, sales, HR, support, ecc.)."
        )
    parts.append("Applica SOLO i vincoli espliciti del prompt (titolo, ruolo, location, data).")
    parts.append("match=false se un vincolo esplicito non e rispettato.")
    return "\n".join(parts) + "\n"


def _offer_line(offer: JobOffer) -> str:
    location = (offer.location or "").strip() or "N/D"
    posted = (offer.posted_at or "").strip() or "N/D"
    company = (offer.company or "").strip() or "N/D"
    role = (offer.role or "").strip() or "N/D"
    return f"{role} | {location} | {posted} | {company}"


async def _classify_batch(
    db: Session,
    prompt: str,
    command: SearchCommand,
    batch: list[JobOffer],
    user_id: int | None,
) -> dict[str, dict[str, str | bool]]:
    lines = "\n".join(f"{i}. {_offer_line(offer)}" for i, offer in enumerate(batch))
    roles = [r.strip() for r in command.allowed_roles if r.strip()]
    title_keywords = title_keywords_for_command(command)
    context_parts = [f'Prompt utente: "{prompt}"']
    if title_keywords:
        context_parts.append(
            "Parole richieste nel TITOLO (almeno una, OPPURE tra varianti): "
            + " OPPURE ".join(title_keywords)
        )
        context_parts.append("match=false se il titolo non contiene nessuna variante richiesta.")
    if roles:
        if len(roles) > 1 and not command.require_role_match:
            context_parts.append(
                f"Ruoli cercati nel prompt (OR — corrispondenza ad ALMENO UNO): {' OPPURE '.join(roles)}"
            )
        else:
            context_parts.append(f"Ruolo cercato nel prompt: {', '.join(roles)}")
        context_parts.append(
            "match=false se il titolo indica un linguaggio, tecnologia o stack diverso da quello nel prompt."
        )
        context_parts.append(
            "Non considerare equivalenti due linguaggi o stack diversi solo perche entrambi sono ruoli tech."
        )
    else:
        context_parts.append(
            "Nessun ruolo specifico nel prompt: non escludere annunci per settore o categoria professionale."
        )
    for line in location_rules_context_lines(location_rules_for_command(command)):
        context_parts.append(line)
    if command.require_location and location_rules_for_command(command):
        context_parts.append("Vincolo geografico OBBLIGATORIO nel prompt.")
    from ..preferences import posted_constraint_label

    posted_label = posted_constraint_label(command)
    if posted_label:
        context_parts.append(f"Vincolo temporale OBBLIGATORIO: solo annunci del periodo {posted_label}.")
    user_msg = (
        "\n".join(context_parts)
        + f"\n\nClassifica TUTTI i {len(batch)} annunci (id da 0 a {len(batch) - 1}).\n"
        + _classification_tail(command)
        + lines
    )
    try:
        data, _, _ = await generate_json(
            db,
            "classify_offers",
            _match_system(command),
            user_msg,
            OFFER_MATCH_SCHEMA,
            user_id,
            temperature=0,
        )
    except (GeminiError, Exception):
        return {}

    out: dict[str, dict[str, str | bool]] = {}
    for item in data.get("results") or []:
        idx = item.get("id")
        if isinstance(idx, str) and idx.isdigit():
            idx = int(idx)
        if isinstance(idx, float) and idx == int(idx):
            idx = int(idx)
        if not isinstance(idx, int) or idx < 0 or idx >= len(batch):
            continue
        offer = batch[idx]
        out[offer.id] = {
            "match": bool(item.get("match")),
            "reason": str(item.get("reason") or "").strip() or "Pertinente al prompt",
        }
    return out


async def classify_offers_for_prompt(
    db: Session,
    command: SearchCommand,
    offers: list[JobOffer],
    user_id: int | None = None,
) -> dict[str, dict[str, str | bool]]:
    if not offers or not is_configured():
        return {}

    prompt = (command.prompt_text or "").strip()
    if not prompt:
        return {}

    ordered = sorted(offers, key=lambda o: (o.company.lower(), o.role.lower(), o.id))
    batches = [
        ordered[i : i + BATCH_SIZE]
        for i in range(0, len(ordered), BATCH_SIZE)
    ]
    if len(batches) > MAX_BATCHES:
        batches = batches[:MAX_BATCHES]

    sem = asyncio.Semaphore(CLASSIFY_CONCURRENCY)

    async def run_batch(batch: list[JobOffer]) -> dict[str, dict[str, str | bool]]:
        async with sem:
            result = await _classify_batch(db, prompt, command, batch, user_id)
            if not result and batch:
                result = await _classify_batch(db, prompt, command, batch, user_id)
            return result

    parts = await asyncio.gather(*[run_batch(batch) for batch in batches], return_exceptions=True)
    out: dict[str, dict[str, str | bool]] = {}
    for part in parts:
        if isinstance(part, dict):
            out.update(part)
    return out
