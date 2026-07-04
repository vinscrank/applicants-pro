import re

from .schemas import JobOffer, SearchCommand
from .prompt_terms import prompt_search_terms


def offer_relevance_score(offer: JobOffer, terms: list[str]) -> int:
    if not terms:
        return 100
    hay = f"{offer.role} {offer.company} {offer.location or ''} {offer.status_reason or ''}".lower()
    best = 0
    for term in terms:
        if not term:
            continue
        if term in hay:
            best = max(best, 100)
            continue
        words = [w for w in re.split(r"\s+", term) if len(w) > 2]
        if words and all(w in hay for w in words):
            best = max(best, 85)
            continue
        if words:
            matched = sum(1 for w in words if w in hay)
            best = max(best, round((matched / len(words)) * 70))
    return best


def filter_offers_by_prompt_relevance(
    offers: list[JobOffer],
    command: SearchCommand,
    min_score: int = 20,
) -> list[JobOffer]:
    return offers


def _ai_relevance_score(offer: JobOffer) -> int:
    if offer.web_dev_fit > 0:
        return offer.web_dev_fit
    return 50


def sort_offers_by_prompt_relevance(offers: list[JobOffer], command: SearchCommand) -> list[JobOffer]:
    terms = prompt_search_terms(command)
    return sorted(
        offers,
        key=lambda o: (
            o.profile_fit_score if o.profile_fit_available and o.profile_fit_score else -1,
            _ai_relevance_score(o),
            offer_relevance_score(o, terms) if terms else 50,
        ),
        reverse=True,
    )
