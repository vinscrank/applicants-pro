import json
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

from sqlalchemy.orm import Session

import models
import scraper_orm
from scraper.url_normalize import normalize_job_url as _normalize_job_url
from scraper.schemas import (
    SearchCommand,
    SearchResult,
    JobOffer,
    VerificationStatus,
    Seniority,
    Company,
    SearchPreferences,
)
from scraper.scrapers import COMPANIES as SEED_COMPANIES


def seed_monitored_companies(db: Session) -> None:
    if db.query(scraper_orm.MonitoredCompany).count() > 0:
        return
    now = datetime.now(timezone.utc)
    for co in SEED_COMPANIES:
        existing = (
            db.query(scraper_orm.MonitoredCompany)
            .filter(
                scraper_orm.MonitoredCompany.ats == co["ats"],
                scraper_orm.MonitoredCompany.slug == co["slug"],
            )
            .first()
        )
        if not existing:
            db.add(
                scraper_orm.MonitoredCompany(
                    name=co["name"],
                    ats=co["ats"],
                    slug=co["slug"],
                    careers_url="",
                    active=True,
                    source="seed",
                    discovered_at=now,
                )
            )
    db.commit()


def get_applied_offer_ids(db: Session, user_id: int, offer_ids: list[str] | None = None) -> set[str]:
    q = db.query(scraper_orm.OfferteAppliedOffer.offer_id).filter(
        scraper_orm.OfferteAppliedOffer.user_id == user_id
    )
    if offer_ids:
        q = q.filter(scraper_orm.OfferteAppliedOffer.offer_id.in_(offer_ids))
    return {r[0] for r in q.all()}


def set_offers_applied(db: Session, user_id: int, offer_ids: list[str], applied: bool) -> None:
    unique_ids = list(dict.fromkeys(offer_id for offer_id in offer_ids if offer_id))
    if not unique_ids:
        return
    now = datetime.now(timezone.utc)
    if applied:
        for offer_id in unique_ids:
            row = db.get(scraper_orm.OfferteAppliedOffer, (user_id, offer_id))
            if row:
                row.applied_at = now
            else:
                db.add(
                    scraper_orm.OfferteAppliedOffer(
                        user_id=user_id,
                        offer_id=offer_id,
                        applied_at=now,
                    )
                )
    else:
        (
            db.query(scraper_orm.OfferteAppliedOffer)
            .filter(
                scraper_orm.OfferteAppliedOffer.user_id == user_id,
                scraper_orm.OfferteAppliedOffer.offer_id.in_(unique_ids),
            )
            .delete(synchronize_session=False)
        )
    db.commit()


def get_dismissed_offer_ids(db: Session, user_id: int, offer_ids: list[str] | None = None) -> set[str]:
    q = db.query(scraper_orm.OfferteDismissedOffer.offer_id).filter(
        scraper_orm.OfferteDismissedOffer.user_id == user_id
    )
    if offer_ids:
        q = q.filter(scraper_orm.OfferteDismissedOffer.offer_id.in_(offer_ids))
    return {r[0] for r in q.all()}


def _normalize_apply_url(url: str) -> str:
    return _normalize_job_url(url)


def _is_generic_apply_url(url_norm: str) -> bool:
    if not url_norm:
        return True
    parsed = urlparse(url_norm)
    path = (parsed.path or "").rstrip("/").lower()
    if not path or path == "/":
        return True
    if path.endswith("/jobs/search"):
        return True
    if path.endswith("/careers") or path.endswith("/careers/job"):
        return True
    host = (parsed.netloc or "").lower()
    if "linkedin.com" in host and "/jobs/view/" not in path:
        return True
    if "indeed.com" in host and "/viewjob" not in path and "/rc/clk" not in path:
        if path.endswith("/jobs") or path.endswith("/jobs/"):
            return True
    return False


def dedupe_user_dismissed_offers(db: Session, user_id: int) -> int:
    rows = (
        db.query(scraper_orm.OfferteDismissedOffer)
        .filter(scraper_orm.OfferteDismissedOffer.user_id == user_id)
        .order_by(scraper_orm.OfferteDismissedOffer.dismissed_at.desc())
        .all()
    )
    kept_urls: set[str] = set()
    kept_company_roles: set[tuple[str, str]] = set()
    removed = 0
    for row in rows:
        url = (
            row.apply_url_norm
            if row.apply_url_norm and not _is_generic_apply_url(row.apply_url_norm)
            else ""
        )
        company_role = (
            (row.company_norm, row.role_norm)
            if row.company_norm and row.role_norm
            else None
        )
        duplicate = (url and url in kept_urls) or (
            company_role is not None and company_role in kept_company_roles
        )
        if duplicate:
            db.delete(row)
            removed += 1
            continue
        if url:
            kept_urls.add(url)
        if company_role:
            kept_company_roles.add(company_role)
    if removed:
        db.commit()
    return removed


def dedupe_all_dismissed_offers(db: Session) -> int:
    user_ids = [
        r[0]
        for r in db.query(scraper_orm.OfferteDismissedOffer.user_id).distinct().all()
    ]
    return sum(dedupe_user_dismissed_offers(db, user_id) for user_id in user_ids)


def _specific_apply_url(url: str) -> str:
    url_norm = _normalize_apply_url(url)
    if _is_generic_apply_url(url_norm):
        return ""
    return url_norm


def _dismissed_match_keys(
    db: Session,
    user_id: int,
) -> tuple[set[str], set[str], set[tuple[str, str]]]:
    rows = (
        db.query(scraper_orm.OfferteDismissedOffer)
        .filter(scraper_orm.OfferteDismissedOffer.user_id == user_id)
        .all()
    )
    offer_ids: set[str] = set()
    apply_urls: set[str] = set()
    company_roles: set[tuple[str, str]] = set()
    for row in rows:
        offer_ids.add(row.offer_id)
        if row.apply_url_norm and not _is_generic_apply_url(row.apply_url_norm):
            apply_urls.add(row.apply_url_norm)
        if row.company_norm and row.role_norm:
            company_roles.add((row.company_norm, row.role_norm))
    return offer_ids, apply_urls, company_roles


def _offer_matches_dismissed(
    offer: JobOffer,
    dismissed_ids: set[str],
    dismissed_urls: set[str],
    dismissed_company_roles: set[tuple[str, str]],
) -> bool:
    if offer.id in dismissed_ids:
        return True
    url_norm = _specific_apply_url(offer.apply_url or "")
    if url_norm and url_norm in dismissed_urls:
        return True
    company_role = _company_role_key(offer.company, offer.role)
    if company_role[0] and company_role[1] and company_role in dismissed_company_roles:
        return True
    return False


def job_url_is_dismissed(
    db: Session,
    user_id: int,
    job_url: str,
    company: str = "",
    role: str = "",
) -> bool:
    from scraper.url_normalize import persist_job_url

    _, dismissed_urls, dismissed_company_roles = _dismissed_match_keys(db, user_id)
    url_norm = _specific_apply_url(persist_job_url(job_url))
    if url_norm and url_norm in dismissed_urls:
        return True
    company_role = _company_role_key(company, role)
    if company_role[0] and company_role[1] and company_role in dismissed_company_roles:
        return True
    return False


def _norm_match_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def _company_role_key(company: str, role: str) -> tuple[str, str]:
    return (_norm_match_text(company), _norm_match_text(role))


def _pick_newer_application(
    current: models.Application | None,
    candidate: models.Application,
) -> models.Application:
    if current is None:
        return candidate
    current_ts = current.last_applied_at or current.created_at
    candidate_ts = candidate.last_applied_at or candidate.created_at
    if candidate_ts and current_ts and candidate_ts > current_ts:
        return candidate
    return current


def _extract_offer_id_from_notes(notes: str | None) -> str | None:
    for part in (notes or "").split():
        if part.startswith("offer:"):
            offer_id = part[6:].strip()
            if offer_id:
                return offer_id
    return None


def _match_tracker_application_for_offer(
    offer: JobOffer,
    apps: list[models.Application],
    *,
    by_url: dict[str, models.Application],
    by_company_role: dict[tuple[str, str], models.Application],
    by_offer_marker: dict[str, models.Application],
) -> models.Application | None:
    from scraper.application_sync import page_url_matches_application
    from scraper.offer_dedup import keys_match
    from scraper.tracker_match import cross_url_same_job

    matched: models.Application | None = by_offer_marker.get(offer.id)

    normalized_url = _normalize_job_url(offer.apply_url or "")
    if normalized_url and normalized_url in by_url:
        matched = _pick_newer_application(matched, by_url[normalized_url])

    offer_url = (offer.apply_url or "").strip()
    if offer_url:
        for app in apps:
            stored = (app.job_url or "").strip()
            if stored and (page_url_matches_application(offer_url, stored) or cross_url_same_job(offer_url, stored)):
                matched = _pick_newer_application(matched, app)

    company_role = _company_role_key(offer.company, offer.role)
    if company_role[0] and company_role[1] and company_role in by_company_role:
        matched = _pick_newer_application(matched, by_company_role[company_role])

    if offer.company.strip() and offer.role.strip():
        from scraper.application_sync import _roles_compatible

        for app in apps:
            if keys_match(app.company_name or "", app.job_title or "", offer.company, offer.role):
                matched = _pick_newer_application(matched, app)
                continue
            if _roles_compatible(app.job_title or "", offer.role) and _company_role_key(
                app.company_name or "",
                app.job_title or "",
            )[0] == company_role[0]:
                matched = _pick_newer_application(matched, app)

    return matched


def _format_applied_at(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def enrich_offers_applied(
    db: Session,
    offers: list[JobOffer],
    user_id: int | None = None,
) -> list[JobOffer]:
    if not offers:
        return offers
    offer_ids = [o.id for o in offers]
    if user_id is None:
        applied_ids: set[str] = set()
        dismissed_ids: set[str] = set()
        dismissed_urls: set[str] = set()
        dismissed_company_roles: set[tuple[str, str]] = set()
        applied_at_by_offer: dict[str, datetime] = {}
    else:
        applied_ids = get_applied_offer_ids(db, user_id, offer_ids)
        dismissed_ids, dismissed_urls, dismissed_company_roles = _dismissed_match_keys(db, user_id)
        applied_at_by_offer = {}
        if applied_ids:
            rows = (
                db.query(scraper_orm.OfferteAppliedOffer.offer_id, scraper_orm.OfferteAppliedOffer.applied_at)
                .filter(
                    scraper_orm.OfferteAppliedOffer.user_id == user_id,
                    scraper_orm.OfferteAppliedOffer.offer_id.in_(applied_ids),
                )
                .all()
            )
            for offer_id, applied_at in rows:
                if applied_at:
                    applied_at_by_offer[offer_id] = applied_at

    by_url: dict[str, models.Application] = {}
    by_company_role: dict[tuple[str, str], models.Application] = {}
    by_offer_marker: dict[str, models.Application] = {}
    if user_id is not None:
        user_apps = (
            db.query(models.Application)
            .filter(
                models.Application.user_id == user_id,
                models.Application.status != "draft",
            )
            .all()
        )
        for app in user_apps:
            normalized_url = _normalize_job_url(app.job_url or "")
            if normalized_url:
                by_url[normalized_url] = _pick_newer_application(by_url.get(normalized_url), app)
            company_role = _company_role_key(app.company_name or "", app.job_title or "")
            if company_role[0] and company_role[1]:
                by_company_role[company_role] = _pick_newer_application(
                    by_company_role.get(company_role),
                    app,
                )
            marker_offer_id = _extract_offer_id_from_notes(app.notes)
            if marker_offer_id:
                by_offer_marker[marker_offer_id] = _pick_newer_application(
                    by_offer_marker.get(marker_offer_id),
                    app,
                )

    enriched: list[JobOffer] = []
    newly_applied_ids: list[str] = []
    for offer in offers:
        matched_app: models.Application | None = None
        if user_id is not None:
            matched_app = _match_tracker_application_for_offer(
                offer,
                user_apps,
                by_url=by_url,
                by_company_role=by_company_role,
                by_offer_marker=by_offer_marker,
            )

        applied = offer.id in applied_ids or matched_app is not None
        if matched_app and offer.id not in applied_ids:
            newly_applied_ids.append(offer.id)
        tracker_status = matched_app.status if matched_app else None
        if applied and not tracker_status:
            tracker_status = "applied"

        applied_at = None
        if matched_app:
            applied_at = _format_applied_at(matched_app.last_applied_at or matched_app.created_at)
        elif offer.id in applied_at_by_offer:
            applied_at = _format_applied_at(applied_at_by_offer[offer.id])

        enriched.append(
            offer.model_copy(
                update={
                    "applied": applied,
                    "applied_at": applied_at,
                    "application_id": matched_app.id if matched_app else None,
                    "tracker_status": tracker_status,
                    "user_dismissed": _offer_matches_dismissed(
                        offer,
                        dismissed_ids,
                        dismissed_urls,
                        dismissed_company_roles,
                    ),
                }
            )
        )
    if user_id is not None and newly_applied_ids:
        set_offers_applied(db, user_id, newly_applied_ids, True)
    return enriched


def _offer_visible_for_command(offer: JobOffer, command: SearchCommand | None) -> bool:
    from scraper.prompt_match import offer_matches_prompt as _prompt_match
    from scraper.title_match import offer_title_matches_keywords, title_keywords_for_command

    if command:
        keywords = title_keywords_for_command(command)
        if keywords and not offer_title_matches_keywords(offer.role, keywords):
            return False
    return _prompt_match(offer, strict=bool((command.prompt_text or "").strip()) if command else False)


def _application_matches_search_context(app: models.Application, command: SearchCommand | None) -> bool:
    from scraper.location_match import location_rules_for_command, location_constraint_status
    from scraper.title_match import offer_title_matches_keywords, title_keywords_for_command

    if not command:
        return True
    title = (app.job_title or "").strip()
    if not title:
        return False
    keywords = title_keywords_for_command(command)
    if keywords and not offer_title_matches_keywords(title, keywords):
        return False
    if command.require_location and location_rules_for_command(command):
        location = (app.location or "").strip()
        if location and location.lower() not in {"unknown", "n/d", "n/a", "not specified", "non specificata"}:
            if location_constraint_status(location, command) is False:
                return False
    roles = [role.strip() for role in command.allowed_roles if role.strip()]
    if roles:
        from scraper.offer_dedup import keys_match

        company = (app.company_name or "").strip()
        if not any(keys_match(company, title, company, role) for role in roles):
            return False
    return True


def _application_already_represented(pool: list[JobOffer], app: models.Application) -> bool:
    for offer in pool:
        if offer.application_id == app.id:
            return True
        if _match_tracker_application_for_offer(
            offer,
            [app],
            by_url={},
            by_company_role={},
            by_offer_marker={},
        ):
            return True
    return False


def _historical_offer_from_application(app: models.Application) -> JobOffer:
    from scraper.tracker_match import tracker_offer_id_for_application

    applied_at = _format_applied_at(app.last_applied_at or app.created_at)
    verified_at = datetime.now(timezone.utc)
    return JobOffer(
        id=tracker_offer_id_for_application(app.id, app.notes),
        company=(app.company_name or "").strip() or "Azienda",
        role=(app.job_title or "").strip() or "Ruolo",
        apply_url=(app.job_url or "").strip(),
        source="tracker",
        origin="website",
        posted_at=applied_at,
        language_requirement=None,
        seniority=Seniority.UNKNOWN,
        status=VerificationStatus.VERIFIED,
        status_reason="Candidatura storica dal tracker",
        location=(app.location or "").strip() or None,
        verified_at=verified_at,
        applied=True,
        applied_at=applied_at,
        application_id=app.id,
        tracker_status=app.status,
        user_dismissed=False,
        historical=True,
    )


def supplement_pool_with_tracker_applications(
    db: Session,
    pool: list[JobOffer],
    user_id: int,
    command: SearchCommand | None = None,
) -> list[JobOffer]:
    apps = (
        db.query(models.Application)
        .filter(
            models.Application.user_id == user_id,
            models.Application.status != "draft",
        )
        .all()
    )
    if not apps:
        return pool

    merged = list(pool)
    seen_ids = {offer.id for offer in merged}
    for app in apps:
        if _application_already_represented(merged, app):
            continue
        if command and not _application_matches_search_context(app, command):
            continue
        historical = _historical_offer_from_application(app)
        if historical.id in seen_ids:
            continue
        seen_ids.add(historical.id)
        merged.append(historical)

    return enrich_offers_applied(db, merged, user_id)


def _user_search_ids(db: Session, user_id: int) -> list[int]:
    return [
        r[0]
        for r in db.query(scraper_orm.OfferteSearch.id)
        .filter(scraper_orm.OfferteSearch.user_id == user_id)
        .all()
    ]


def find_matching_live_offers(
    db: Session,
    user_id: int,
    job_url: str,
    company: str = "",
    role: str = "",
) -> list[dict]:
    from scraper.application_sync import page_url_matches_application
    from scraper.offer_dedup import keys_match
    from scraper.tracker_match import cross_url_same_job

    search_ids = _user_search_ids(db, user_id)
    if not search_ids:
        return []
    target_url = _normalize_apply_url(job_url)
    target_path = urlparse(target_url).path.rstrip("/") if target_url else ""
    base_query = db.query(scraper_orm.OfferteOfferRow).filter(
        scraper_orm.OfferteOfferRow.search_id.in_(search_ids)
    )
    rows: list[scraper_orm.OfferteOfferRow] = []
    if target_path and len(target_path) >= 8:
        rows = (
            base_query.filter(scraper_orm.OfferteOfferRow.apply_url.ilike(f"%{target_path}%"))
            .order_by(scraper_orm.OfferteOfferRow.id.desc())
            .all()
        )
    if not rows and company.strip() and role.strip():
        rows = base_query.order_by(scraper_orm.OfferteOfferRow.id.desc()).limit(2000).all()
    elif not rows:
        return []
    applied_ids = get_applied_offer_ids(db, user_id)
    dismissed_ids, dismissed_urls, dismissed_company_roles = _dismissed_match_keys(db, user_id)
    matched: list[dict] = []
    seen: set[str] = set()
    for row in rows:
        if row.offer_id in seen:
            continue
        row_url = row.apply_url or ""
        url_match = bool(job_url.strip()) and (
            page_url_matches_application(job_url, row_url) or cross_url_same_job(job_url, row_url)
        )
        role_match = bool(company.strip() and role.strip()) and keys_match(
            row.company or "",
            row.role or "",
            company,
            role,
        )
        if not url_match and not role_match:
            continue
        seen.add(row.offer_id)
        row_url = _specific_apply_url(row.apply_url or "")
        row_company_role = _company_role_key(row.company or "", row.role or "")
        dismissed = (
            row.offer_id in dismissed_ids
            or (bool(row_url) and row_url in dismissed_urls)
            or (
                bool(row_company_role[0] and row_company_role[1])
                and row_company_role in dismissed_company_roles
            )
        )
        matched.append(
            {
                "offer_id": row.offer_id,
                "company": row.company or "",
                "role": row.role or "",
                "apply_url": row.apply_url or "",
                "applied": row.offer_id in applied_ids,
                "dismissed": dismissed,
            }
        )
    return matched


def _find_offer_row_for_dismissed(
    db: Session,
    user_id: int,
    dismissed_row: scraper_orm.OfferteDismissedOffer,
) -> scraper_orm.OfferteOfferRow | None:
    row = (
        db.query(scraper_orm.OfferteOfferRow)
        .filter(scraper_orm.OfferteOfferRow.offer_id == dismissed_row.offer_id)
        .order_by(scraper_orm.OfferteOfferRow.id.desc())
        .first()
    )
    if row:
        return row
    search_ids = _user_search_ids(db, user_id)
    if not search_ids:
        return None
    rows = (
        db.query(scraper_orm.OfferteOfferRow)
        .filter(scraper_orm.OfferteOfferRow.search_id.in_(search_ids))
        .order_by(scraper_orm.OfferteOfferRow.id.desc())
        .limit(3000)
        .all()
    )
    if dismissed_row.apply_url_norm:
        for candidate in rows:
            if _normalize_apply_url(candidate.apply_url) == dismissed_row.apply_url_norm:
                return candidate
    if dismissed_row.company_norm and dismissed_row.role_norm:
        target = (dismissed_row.company_norm, dismissed_row.role_norm)
        for candidate in rows:
            if _company_role_key(candidate.company, candidate.role) == target:
                return candidate
    return None


def list_user_dismissed_offers(db: Session, user_id: int) -> list[JobOffer]:
    rows = (
        db.query(scraper_orm.OfferteDismissedOffer)
        .filter(scraper_orm.OfferteDismissedOffer.user_id == user_id)
        .order_by(scraper_orm.OfferteDismissedOffer.dismissed_at.desc())
        .all()
    )
    offers: list[JobOffer] = []
    seen_keys: set[str | tuple[str, str]] = set()
    for dismissed_row in rows:
        row = _find_offer_row_for_dismissed(db, user_id, dismissed_row)
        if not row:
            continue
        url_key = _normalize_apply_url(row.apply_url or "")
        company_role = _company_role_key(row.company, row.role)
        dedupe_key: str | tuple[str, str] = url_key if url_key else company_role
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)
        offers.append(_row_to_offer(row))
    if not offers:
        return []
    return enrich_offers_applied(db, offers, user_id)


def merge_dismissed_into_pool(db: Session, pool: list[JobOffer], user_id: int) -> list[JobOffer]:
    dismissed = list_user_dismissed_offers(db, user_id)
    if not dismissed:
        return pool
    present_ids = {o.id for o in pool}
    present_urls = {_normalize_apply_url(o.apply_url or "") for o in pool if o.apply_url}
    present_company_roles = {_company_role_key(o.company, o.role) for o in pool}
    extras: list[JobOffer] = []
    for offer in dismissed:
        if offer.id in present_ids:
            continue
        url = _normalize_apply_url(offer.apply_url or "")
        if url and url in present_urls:
            continue
        company_role = _company_role_key(offer.company, offer.role)
        if company_role[0] and company_role[1] and company_role in present_company_roles:
            continue
        extras.append(offer)
    if not extras:
        return pool
    return [*pool, *extras]


def _row_to_offer(row: scraper_orm.OfferteOfferRow) -> JobOffer:
    origin = getattr(row, "origin", None) or "ats"
    if origin not in ("ats", "linkedin", "indeed", "upwork", "website"):
        origin = "ats"
    return JobOffer(
        id=row.offer_id,
        company=row.company,
        role=row.role,
        apply_url=row.apply_url,
        source=row.source,
        origin=origin,
        posted_at=row.posted_at,
        language_requirement=row.language_requirement,
        seniority=Seniority(row.seniority),
        web_dev_fit=row.web_dev_fit,
        web_dev_fit_label=row.web_dev_fit_label,
        status=VerificationStatus(row.status),
        status_reason=row.status_reason,
        location=row.location,
        verified_at=row.verified_at,
    )


def _row_to_company(row: scraper_orm.MonitoredCompany) -> Company:
    discovered = row.discovered_at
    if discovered and discovered.tzinfo is None:
        discovered = discovered.replace(tzinfo=timezone.utc)
    return Company(
        id=row.id,
        name=row.name,
        ats=row.ats,
        slug=row.slug,
        careers_url=row.careers_url or "",
        job_count=row.job_count or 0,
        active=bool(row.active),
        source=row.source or "manual",
        discovered_at=discovered,
        priority=bool(getattr(row, "priority", False)),
    )


def get_company_by_id(db: Session, company_id: int) -> Company | None:
    row = db.get(scraper_orm.MonitoredCompany, company_id)
    if not row:
        return None
    return _row_to_company(row)


def update_company_job_count(db: Session, company_id: int, job_count: int) -> None:
    row = db.get(scraper_orm.MonitoredCompany, company_id)
    if not row:
        return
    row.job_count = job_count
    db.commit()


def list_companies(db: Session, active_only: bool = True) -> list[Company]:
    q = db.query(scraper_orm.MonitoredCompany)
    if active_only:
        q = q.filter(scraper_orm.MonitoredCompany.active.is_(True))
    rows = (
        q.order_by(
            scraper_orm.MonitoredCompany.priority.desc(),
            scraper_orm.MonitoredCompany.name,
        ).all()
    )
    return [_row_to_company(r) for r in rows]


def get_companies_for_scrape(db: Session) -> list[dict]:
    rows = (
        db.query(scraper_orm.MonitoredCompany)
        .filter(scraper_orm.MonitoredCompany.active.is_(True))
        .all()
    )
    return [{"name": r.name, "ats": r.ats, "slug": r.slug, "careers_url": r.careers_url or ""} for r in rows]


def upsert_company(db: Session, data: dict) -> tuple[Company, bool]:
    now = datetime.now(timezone.utc)
    existing = (
        db.query(scraper_orm.MonitoredCompany)
        .filter(
            scraper_orm.MonitoredCompany.ats == data["ats"],
            scraper_orm.MonitoredCompany.slug == data["slug"],
        )
        .first()
    )
    if existing:
        existing.name = data["name"]
        existing.careers_url = data.get("careers_url", "")
        existing.job_count = data.get("job_count", 0)
        existing.active = True
        existing.source = data.get("source", "manual")
        existing.discovered_at = now
        db.commit()
        db.refresh(existing)
        return _row_to_company(existing), False

    row = scraper_orm.MonitoredCompany(
        name=data["name"],
        ats=data["ats"],
        slug=data["slug"],
        careers_url=data.get("careers_url", ""),
        job_count=data.get("job_count", 0),
        active=True,
        source=data.get("source", "manual"),
        discovered_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _row_to_company(row), True


def bulk_upsert_companies(db: Session, items: list[dict]) -> tuple[int, int]:
    added = skipped = 0
    for item in items:
        _, is_new = upsert_company(db, item)
        if is_new:
            added += 1
        else:
            skipped += 1
    return added, skipped


def get_user_search_preferences(db: Session, user_id: int) -> SearchPreferences:
    from scraper.preferences import DEFAULT_SEARCH_PREFERENCES

    row = db.get(scraper_orm.UserOffertePreferences, user_id)
    if not row:
        return DEFAULT_SEARCH_PREFERENCES.model_copy()
    try:
        return SearchPreferences(**json.loads(row.preferences_json))
    except (json.JSONDecodeError, TypeError, ValueError):
        return DEFAULT_SEARCH_PREFERENCES.model_copy()
