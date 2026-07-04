from datetime import datetime, timedelta, timezone

from .schemas import SearchCommand, JobOffer, VerificationStatus, SearchPreferences, PostedWithin

DEFAULT_SEARCH_PREFERENCES = SearchPreferences()


def portal_search_locations(command: SearchCommand, prefs: SearchPreferences) -> list[str]:
    return [loc.strip() for loc in command.locations if loc.strip()]


def command_for_portal_search(command: SearchCommand, prefs: SearchPreferences) -> SearchCommand:
    locs = portal_search_locations(command, prefs)
    if locs and locs != command.locations:
        return command.model_copy(update={"locations": locs})
    return command


def merge_command_with_preferences(command: SearchCommand, prefs: SearchPreferences) -> SearchCommand:
    updates: dict = {}

    if prefs.require_active_apply:
        updates["require_active_apply"] = True

    if updates:
        return command.model_copy(update=updates)
    return command


def preferences_from_command(command: SearchCommand, prefs: SearchPreferences) -> SearchPreferences:
    posted_within = getattr(command, "posted_within", "any") or "any"
    if posted_within != "any" and posted_within != prefs.posted_within:
        return prefs.model_copy(update={"posted_within": posted_within})
    return prefs


def parse_posted_at(value: str | None) -> datetime | None:
    if not value:
        return None
    raw = value.strip()
    if not raw:
        return None
    normalized = raw.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%b %d, %Y", "%B %d, %Y"):
        try:
            dt = datetime.strptime(raw[:30], fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    digits = raw[:10]
    if len(digits) == 10 and digits[4] == "-":
        try:
            dt = datetime.strptime(digits, "%Y-%m-%d")
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return None


POSTED_WITHIN_LABELS: dict[PostedWithin, str] = {
    "any": "tutte le offerte attive",
    "24h": "ultime 24 ore",
    "7d": "ultima settimana / ultimi 7 giorni",
    "30d": "ultimo mese / ultimi 30 giorni",
    "90d": "ultimi 3 mesi",
}


def posted_cutoff(window: PostedWithin) -> datetime | None:
    now = datetime.now(timezone.utc)
    if window == "24h":
        return now - timedelta(hours=24)
    if window == "7d":
        return now - timedelta(days=7)
    if window == "30d":
        return now - timedelta(days=30)
    if window == "90d":
        return now - timedelta(days=90)
    return None


def command_has_posted_constraint(command: SearchCommand) -> bool:
    days = getattr(command, "posted_within_days", None)
    if days is not None and days > 0:
        return True
    return (getattr(command, "posted_within", "any") or "any") != "any"


def posted_cutoff_for_command(command: SearchCommand) -> datetime | None:
    days = getattr(command, "posted_within_days", None)
    if days is not None and days > 0:
        return datetime.now(timezone.utc) - timedelta(days=days)
    return posted_cutoff(getattr(command, "posted_within", "any") or "any")


def posted_constraint_label(command: SearchCommand) -> str | None:
    days = getattr(command, "posted_within_days", None)
    if days is not None and days > 0:
        if days == 1:
            return "ultimo giorno"
        return f"ultimi {days} giorni"
    posted_within = getattr(command, "posted_within", "any") or "any"
    if posted_within == "any":
        return None
    return POSTED_WITHIN_LABELS.get(posted_within, posted_within)


def job_passes_posted_constraint(posted_at: str | None, command: SearchCommand) -> bool:
    if not command_has_posted_constraint(command):
        return True
    cutoff = posted_cutoff_for_command(command)
    if cutoff is None:
        return True
    dt = parse_posted_at(posted_at)
    if dt is None:
        return False
    return dt >= cutoff


def matches_posted_window(posted_at: str | None, prefs: SearchPreferences) -> bool:
    if prefs.posted_within == "any":
        return True
    cutoff = posted_cutoff(prefs.posted_within)
    if cutoff is None:
        return True
    dt = parse_posted_at(posted_at)
    if dt is None:
        return True
    return dt >= cutoff


def apply_offer_result_filters(
    offers: list[JobOffer],
    prefs: SearchPreferences,
    command: SearchCommand | None = None,
) -> list[JobOffer]:
    return sort_offers(offers, prefs)


def sort_offers(offers: list[JobOffer], prefs: SearchPreferences) -> list[JobOffer]:
    if prefs.sort_by == "posted_asc":
        return sorted(
            offers,
            key=lambda o: (parse_posted_at(o.posted_at) or datetime.min.replace(tzinfo=timezone.utc), o.company),
        )
    if prefs.sort_by == "relevance":
        return sorted(offers, key=lambda o: (
            0 if o.status == VerificationStatus.VERIFIED else 1 if o.status == VerificationStatus.MAYBE else 2,
            -(parse_posted_at(o.posted_at) or datetime.min.replace(tzinfo=timezone.utc)).timestamp(),
        ))
    return sorted(
        offers,
        key=lambda o: (parse_posted_at(o.posted_at) or datetime.min.replace(tzinfo=timezone.utc)),
        reverse=True,
    )
