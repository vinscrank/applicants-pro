from .schemas import SearchCommand


def _expand_role_terms(roles: list[str]) -> list[str]:
    expanded: list[str] = []
    seen: set[str] = set()
    for role in roles:
        for chunk in role.replace("|", ",").replace(";", ",").replace("/", ",").split(","):
            term = chunk.strip().lower()
            if not term or len(term) < 2 or term in seen:
                continue
            seen.add(term)
            expanded.append(term)
        whole = role.strip().lower()
        if whole and whole not in seen:
            seen.add(whole)
            expanded.append(whole)
    return expanded


def _clean_prompt_phrase(text: str) -> str:
    cleaned = " ".join((text or "").strip().split())
    return cleaned.strip(".,;:!?").lower()


def prompt_search_terms(command: SearchCommand) -> list[str]:
    from .title_match import title_keywords_for_command

    roles = _expand_role_terms([r.strip() for r in command.allowed_roles if r.strip()])
    if roles:
        return roles
    title_keywords = title_keywords_for_command(command)
    if title_keywords:
        return title_keywords
    prompt = _clean_prompt_phrase(command.prompt_text or "")
    if prompt:
        return [prompt]
    return []
