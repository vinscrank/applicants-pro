import re

from .schemas import SearchCommand

_TITLE_HINTS = (
    "nel titolo",
    "in the title",
    "title mentions",
    "title contains",
    "titolo contiene",
    "titolo con",
    "con \"",
    "with \"",
)

_LANGUAGE_TERMS = (
    "italian speaker",
    "italian speaking",
    "speak italian",
    "speaks italian",
    "parlare italiano",
    "parla italiano",
    "lingua italiana",
    "italian language",
    "native italian",
    "fluent italian",
)


def _dedupe_keywords(values: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = " ".join((value or "").strip().split())
        if len(cleaned) < 2:
            continue
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(cleaned)
    return out


def dedupe_title_keywords(values: list[str]) -> list[str]:
    return _dedupe_keywords(values)


def infer_title_keywords(prompt: str) -> list[str]:
    text = (prompt or "").strip()
    if not text:
        return []
    lowered = text.lower()
    keywords: list[str] = []

    for match in re.finditer(r'["\']([^"\']{2,})["\']', text):
        keywords.append(match.group(1).strip())

    mentions_title = any(hint in lowered for hint in _TITLE_HINTS) or bool(keywords)
    if mentions_title or any(term in lowered for term in _LANGUAGE_TERMS):
        for term in _LANGUAGE_TERMS:
            if term in lowered:
                keywords.append(term)
        if "italian" in lowered and "italian" not in [k.lower() for k in keywords]:
            keywords.append("Italian")

    return _dedupe_keywords(keywords)


def title_keywords_for_command(command: SearchCommand) -> list[str]:
    explicit = _dedupe_keywords(getattr(command, "title_keywords", []) or [])
    if explicit:
        return explicit
    return infer_title_keywords(command.prompt_text or "")


def role_match_tokens(phrase: str) -> list[str]:
    return [token for token in re.split(r"[\s/,-]+", phrase.lower()) if len(token) >= 3]


def phrase_token_match(hay: str, phrase: str) -> bool:
    if not hay:
        return False
    lowered = hay.lower()
    needle = phrase.lower().strip()
    if needle and needle in lowered:
        return True
    tokens = role_match_tokens(phrase)
    return bool(tokens and all(token in lowered for token in tokens))


def offer_title_matches_keywords(role: str, keywords: list[str]) -> bool:
    if not keywords:
        return True
    hay = (role or "").lower()
    if not hay:
        return False
    for keyword in keywords:
        if phrase_token_match(hay, keyword):
            return True
    return False
