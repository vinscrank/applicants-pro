import re

from scraper.schemas import JobOffer

_ORIGIN_PRIORITY = {
    "linkedin": 0,
    "website": 1,
    "ats": 2,
    "indeed": 2,
    "upwork": 2,
}


def _normalize_company(company: str) -> str:
    value = re.sub(r"\s+", " ", (company or "").strip().lower())
    return re.split(r"\s*/\s*", value)[0].strip()


def _normalize_role(role: str) -> str:
    value = re.sub(r"\s+", " ", (role or "").strip().lower())
    value = re.sub(
        r"\s*[-–|]\s*(remote|hybrid|onsite|dublin|ireland|emea|office|location).*$",
        "",
        value,
        flags=re.I,
    )
    value = re.sub(r"\s*\((?:remote|hybrid|onsite|dublin|ireland)[^)]*\)\s*$", "", value, flags=re.I)
    value = re.sub(r"\s*\([^)]*\)\s*$", "", value)
    return value.strip()


def match_key_for(company: str, role: str) -> tuple[str, str] | None:
    company_norm = _normalize_company(company)
    role_norm = _normalize_role(role)
    if not company_norm or not role_norm:
        return None
    return company_norm, role_norm


def keys_match(company_a: str, role_a: str, company_b: str, role_b: str) -> bool:
    key_a = match_key_for(company_a, role_a)
    key_b = match_key_for(company_b, role_b)
    if not key_a or not key_b:
        return False
    if key_a[0] != key_b[0]:
        return False
    return key_a[1] == key_b[1] or _roles_similar(key_a[1], key_b[1])


def _dedup_key(offer: JobOffer) -> tuple[str, str] | None:
    return match_key_for(offer.company, offer.role)


def _roles_similar(left: str, right: str) -> bool:
    if left == right:
        return True
    if len(left) < 10 or len(right) < 10:
        return False
    return left in right or right in left


def _offer_priority(offer: JobOffer) -> tuple[int, int]:
    origin = (offer.origin or "ats").lower()
    origin_score = _ORIGIN_PRIORITY.get(origin, 1)
    direct_apply = 0 if "linkedin.com" in (offer.apply_url or "").lower() else 1
    return origin_score, direct_apply


def dedupe_cross_origin_offers(offers: list[JobOffer]) -> list[JobOffer]:
    if len(offers) < 2:
        return offers

    keyed: list[tuple[tuple[str, str], JobOffer]] = []
    unkeyed: list[JobOffer] = []
    for offer in offers:
        key = _dedup_key(offer)
        if key is None:
            unkeyed.append(offer)
        else:
            keyed.append((key, offer))

    if not keyed:
        return offers

    groups: list[list[JobOffer]] = []
    for key, offer in keyed:
        merged = False
        for group in groups:
            group_key = _dedup_key(group[0])
            if group_key is None:
                continue
            if group_key[0] != key[0]:
                continue
            if group_key[1] == key[1] or _roles_similar(group_key[1], key[1]):
                group.append(offer)
                merged = True
                break
        if not merged:
            groups.append([offer])

    deduped: list[JobOffer] = []
    for group in groups:
        best = max(group, key=_offer_priority)
        deduped.append(best)

    return deduped + unkeyed
