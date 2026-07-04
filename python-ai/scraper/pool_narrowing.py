from .schemas import SearchCommand
from .scrapers import RawJob
from .location_match import location_rules_for_command, job_passes_location_constraint
from .prompt_terms import prompt_search_terms
from .preferences import command_has_posted_constraint, job_passes_posted_constraint
from .title_match import offer_title_matches_keywords, phrase_token_match
import os

MAX_POOL_FOR_SEARCH = max(20, int(os.getenv("SEARCH_MAX_POOL", "200")))
LINKEDIN_RESERVE = max(0, int(os.getenv("SEARCH_LINKEDIN_RESERVE", "60")))


def _split_terms(values: list[str]) -> list[str]:
    terms: list[str] = []
    seen: set[str] = set()
    for value in values:
        for piece in value.replace(",", " ").replace("/", " ").replace("-", " ").split():
            piece = piece.strip().lower()
            if len(piece) >= 3 and piece not in seen:
                seen.add(piece)
                terms.append(piece)
    return terms


def _role_rank_terms(command: SearchCommand) -> list[str]:
    return _split_terms(prompt_search_terms(command))


def _location_rank_terms(command: SearchCommand) -> list[str]:
    areas: list[str] = []
    for rule in location_rules_for_command(command):
        areas.extend(rule.areas)
    return _split_terms(areas)


def _role_haystack(job: RawJob) -> str:
    desc = (job.description or "")[:800]
    return f"{job.role} {desc}".lower()


def _term_in_haystack(term: str, hay: str) -> bool:
    if term in hay:
        return True
    if term == "frontend":
        return "front-end" in hay or "front end" in hay
    return False


def _job_role_rank(job: RawJob, role_terms: list[str]) -> int:
    if not role_terms:
        return 0
    hay = _role_haystack(job)
    return sum(1 for term in role_terms if _term_in_haystack(term, hay))


def _job_location_rank(job: RawJob, location_terms: list[str]) -> int:
    if not location_terms:
        return 0
    hay = (job.location or "").lower()
    return sum(1 for term in location_terms if term in hay)


def _job_sort_key(
    job: RawJob,
    role_terms: list[str],
    location_terms: list[str],
) -> tuple[int, int, int, str, str]:
    role_rank = _job_role_rank(job, role_terms)
    location_rank = _job_location_rank(job, location_terms)
    total = role_rank + location_rank
    return (-role_rank, -location_rank, -total, job.company, job.role)


def _sort_jobs(
    jobs: list[RawJob],
    role_terms: list[str],
    location_terms: list[str],
) -> list[RawJob]:
    if not role_terms and not location_terms:
        return jobs
    return sorted(jobs, key=lambda job: _job_sort_key(job, role_terms, location_terms))


def _passes_role_precheck(job: RawJob, command: SearchCommand) -> bool:
    roles = [role.strip() for role in command.allowed_roles if role.strip()]
    if not roles:
        return True
    hay = f"{job.role} {(job.description or '')[:600]}".lower()
    for role in roles:
        if offer_title_matches_keywords(job.role, [role]):
            return True
        if phrase_token_match(hay, role):
            return True
    return False


def _passes_pool_precheck(
    job: RawJob,
    command: SearchCommand,
    role_terms: list[str],
    location_terms: list[str],
) -> bool:
    if not _passes_role_precheck(job, command):
        return False
    if command.require_location and location_terms and _job_location_rank(job, location_terms) == 0:
        return False
    if command_has_posted_constraint(command) and not job_passes_posted_constraint(job.posted_at, command):
        return False
    return True


def narrow_raw_jobs_for_prompt(jobs: list[RawJob], command: SearchCommand) -> list[RawJob]:
    if not jobs:
        return []

    role_terms = _role_rank_terms(command)
    location_terms = _location_rank_terms(command)

    jobs = [
        job
        for job in jobs
        if _passes_pool_precheck(job, command, role_terms, location_terms)
    ]
    if not jobs:
        return []

    linkedin_jobs = [j for j in jobs if getattr(j, "origin", "ats") == "linkedin"]
    other_jobs = [j for j in jobs if getattr(j, "origin", "ats") != "linkedin"]

    linkedin_jobs = _sort_jobs(linkedin_jobs, role_terms, location_terms)
    other_jobs = _sort_jobs(other_jobs, role_terms, location_terms)

    selected_linkedin = linkedin_jobs[:LINKEDIN_RESERVE]
    remaining = max(0, MAX_POOL_FOR_SEARCH - len(selected_linkedin))
    selected_other = other_jobs[:remaining]
    return selected_linkedin + selected_other
