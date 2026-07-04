import re

from .schemas import SearchCommand, LocationRule, WorkMode

WORK_REMOTE_MARKERS = ("remote", "remoto", "work from home", "wfh", "telecommute", "anywhere")
WORK_HYBRID_MARKERS = ("hybrid", "ibrido", "partially remote", "part-remote")
WORK_ONSITE_MARKERS = ("onsite", "on-site", "on site", "in office", "in-office", "in-person")

LOCATION_STOP_WORDS = frozenset(
    {
        "remote",
        "remoto",
        "hybrid",
        "ibrido",
        "onsite",
        "office",
        "the",
        "ultimi",
        "giorni",
        "settimana",
        "developer",
        "engineer",
        "solo",
        "only",
    }
)

WORK_MODE_LABELS: dict[WorkMode, str] = {
    "any": "qualsiasi modalita",
    "onsite": "solo in sede",
    "hybrid": "solo ibrido",
    "remote": "solo remoto",
}


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def _tokens(value: str) -> list[str]:
    return [t for t in re.split(r"[\s,./|()\-]+", _normalize_text(value)) if len(t) >= 3]


def target_matches_location(target: str, location: str) -> bool:
    target_norm = _normalize_text(target)
    loc_norm = _normalize_text(location)
    if not target_norm or not loc_norm:
        return False

    if len(target_norm) <= 3 or len(loc_norm) <= 3:
        shorter, longer = (target_norm, loc_norm) if len(target_norm) <= len(loc_norm) else (loc_norm, target_norm)
        if len(shorter) <= 3:
            return bool(re.search(rf"\b{re.escape(shorter)}\b", longer))

    if target_norm in loc_norm or loc_norm in target_norm:
        return True

    target_tokens = [t for t in _tokens(target) if t not in LOCATION_STOP_WORDS]
    if not target_tokens:
        return False

    if all(token in loc_norm for token in target_tokens if len(token) >= 4):
        return True

    primary = max(target_tokens, key=len)
    if len(primary) >= 4 and primary in loc_norm:
        return True

    return False


def areas_equivalent(a: str, b: str) -> bool:
    return target_matches_location(a, b) or target_matches_location(b, a)


def target_in_area_list(target: str, areas: list[str]) -> bool:
    return any(areas_equivalent(target, area) for area in areas)


def detect_work_mode(location: str) -> str:
    loc_norm = _normalize_text(location)
    has_hybrid = any(marker in loc_norm for marker in WORK_HYBRID_MARKERS)
    has_remote = any(marker in loc_norm for marker in WORK_REMOTE_MARKERS)
    has_onsite = any(marker in loc_norm for marker in WORK_ONSITE_MARKERS)
    if has_hybrid:
        return "hybrid"
    if has_remote and has_onsite:
        return "hybrid"
    if has_remote:
        return "remote"
    if has_onsite:
        return "onsite"
    return "unknown"


def work_mode_matches(required: WorkMode, detected: str) -> bool:
    if required == "any":
        return True
    if required == "remote":
        return detected == "remote"
    if required == "hybrid":
        return detected in {"hybrid", "remote"}
    if required == "onsite":
        return detected in {"onsite", "unknown"}
    return False


def _dedupe_areas(values: list[str]) -> list[str]:
    merged: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = value.strip()
        if not cleaned:
            continue
        key = cleaned.lower()
        if key in seen:
            continue
        seen.add(key)
        merged.append(cleaned)
    return merged


def compact_location_areas(areas: list[str], limit: int = 5) -> list[str]:
    deduped = _dedupe_areas(areas)
    if len(deduped) <= limit:
        return deduped
    composites = [a for a in deduped if "," in a]
    ascii_areas = [a for a in deduped if a not in composites and all(ord(c) < 128 for c in a)]
    rest = [a for a in deduped if a not in composites and a not in ascii_areas]
    ordered: list[str] = []
    for bucket in (composites, ascii_areas, rest):
        for area in bucket:
            if area not in ordered:
                ordered.append(area)
            if len(ordered) >= limit:
                return ordered
    return ordered[:limit]


def _normalize_rule(rule: LocationRule) -> LocationRule | None:
    areas = compact_location_areas(rule.areas)
    if not areas:
        return None
    mode = rule.work_mode if rule.work_mode in {"any", "onsite", "hybrid", "remote"} else "any"
    return LocationRule(areas=areas, work_mode=mode)


def rules_from_legacy(locations: list[str], remote_only_areas: list[str]) -> list[LocationRule]:
    rules: list[LocationRule] = []
    remote = _dedupe_areas(remote_only_areas)
    locs = _dedupe_areas(locations)
    if remote:
        rules.append(LocationRule(areas=remote, work_mode="remote"))
    for loc in locs:
        if target_in_area_list(loc, remote):
            continue
        rules.append(LocationRule(areas=[loc], work_mode="any"))
    return rules


def location_rules_for_command(command: SearchCommand) -> list[LocationRule]:
    rules: list[LocationRule] = []
    for raw in getattr(command, "location_rules", None) or []:
        normalized = _normalize_rule(raw)
        if normalized:
            rules.append(normalized)
    if rules:
        return rules
    return rules_from_legacy(command.locations, getattr(command, "remote_only_areas", None) or [])


def flatten_location_rules(rules: list[LocationRule]) -> tuple[list[str], list[str]]:
    locations: list[str] = []
    remote_only: list[str] = []
    for rule in rules:
        for area in rule.areas:
            locations.append(area)
            if rule.work_mode == "remote":
                remote_only.append(area)
    return _dedupe_areas(locations), _dedupe_areas(remote_only)


def location_rule_matches(rule: LocationRule, location: str) -> bool:
    if not any(target_matches_location(area, location) for area in rule.areas):
        return False
    return work_mode_matches(rule.work_mode, detect_work_mode(location))


def location_rule_label(rule: LocationRule) -> str:
    areas = " · ".join(rule.areas[:4])
    if rule.work_mode == "any":
        return areas
    prefix = {"remote": "Remoto", "hybrid": "Ibrido", "onsite": "In sede"}.get(rule.work_mode, rule.work_mode)
    return f"{prefix} · {areas}"


def location_rules_context_lines(rules: list[LocationRule]) -> list[str]:
    if not rules:
        return []
    if len(rules) == 1:
        rule = rules[0]
        areas = ", ".join(rule.areas)
        if rule.work_mode == "any":
            return [f"Area richiesta: {areas} (onsite, ibrido o remoto)."]
        return [f"Area richiesta: {areas} ({WORK_MODE_LABELS[rule.work_mode]})."]
    parts = []
    for rule in rules:
        areas = ", ".join(rule.areas)
        parts.append(f"{areas} ({WORK_MODE_LABELS[rule.work_mode]})")
    return [f"Vincoli geografici (OR): {' OPPURE '.join(parts)}."]


def location_targets(command: SearchCommand) -> list[str]:
    rules = location_rules_for_command(command)
    areas: list[str] = []
    for rule in rules:
        areas.extend(rule.areas)
    return _dedupe_areas(areas)


def remote_only_areas(command: SearchCommand) -> list[str]:
    rules = location_rules_for_command(command)
    areas: list[str] = []
    for rule in rules:
        if rule.work_mode == "remote":
            areas.extend(rule.areas)
    return _dedupe_areas(areas)


def location_constraint_status(location: str | None, command: SearchCommand) -> bool | None:
    if not command.require_location:
        return None
    rules = location_rules_for_command(command)
    if not rules:
        return None

    loc = (location or "").strip()
    if not loc or _normalize_text(loc) in {"n/d", "nd", "-"}:
        return None

    if any(location_rule_matches(rule, loc) for rule in rules):
        return True
    return False


def job_passes_location_constraint(location: str | None, command: SearchCommand) -> bool:
    if not command.require_location:
        return True
    if not location_rules_for_command(command):
        return True
    return location_constraint_status(location, command) is True
