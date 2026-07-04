from .schemas import JobOffer

PROMPT_MATCH_SCORE_YES = 85
PROMPT_MATCH_SCORE_UNCLASSIFIED = 65
PROMPT_MATCH_SCORE_NO = 25
PROMPT_MATCH_MIN_SCORE = PROMPT_MATCH_SCORE_UNCLASSIFIED


def apply_prompt_match_score(offer: JobOffer, *, match: bool | None, reason: str = "") -> None:
    if match is True:
        offer.web_dev_fit = PROMPT_MATCH_SCORE_YES
    elif match is False:
        offer.web_dev_fit = PROMPT_MATCH_SCORE_NO
        if reason:
            offer.web_dev_fit_label = reason
    else:
        offer.web_dev_fit = PROMPT_MATCH_SCORE_UNCLASSIFIED
        offer.web_dev_fit_label = reason or "Non classificata dall'AI"


def offer_matches_prompt(offer: JobOffer, *, strict: bool = False) -> bool:
    score = offer.web_dev_fit or 0
    if strict and score == 0:
        return False
    if score > 0 and score <= PROMPT_MATCH_SCORE_NO:
        return False
    if score >= PROMPT_MATCH_MIN_SCORE or score >= 92 or score == 55:
        return True
    return False
