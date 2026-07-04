from .schemas import JobOffer, SearchCommand

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


def offer_keyword_relevant(offer: JobOffer, command: SearchCommand) -> bool:
    from .location_match import location_rules_for_command, job_passes_location_constraint
    from .title_match import offer_title_matches_keywords, phrase_token_match
    from .preferences import command_has_posted_constraint, job_passes_posted_constraint

    roles = [role.strip() for role in command.allowed_roles if role.strip()]
    if roles:
        hay = f"{offer.role} ".lower()
        role_ok = any(offer_title_matches_keywords(offer.role, [role]) for role in roles)
        if not role_ok and not any(phrase_token_match(hay, role) for role in roles):
            return False
    if command.require_location and location_rules_for_command(command):
        if not job_passes_location_constraint(offer.location, command):
            return False
    if command_has_posted_constraint(command) and not job_passes_posted_constraint(offer.posted_at, command):
        return False
    return True
