from __future__ import annotations

import re

from sqlalchemy.orm import Session

import models
from scraper.schemas import JobOffer, RecentCareersOfferRow

STRONG_FIT_THRESHOLD = 70


def _tokenize_skills(skills: str | None) -> list[str]:
    if not skills:
        return []
    parts = re.split(r"[,;\n|/]+", skills)
    return [p.strip().lower() for p in parts if p.strip()]


def _fit_label(score: int) -> str:
    if score >= 70:
        return "Excellent fit"
    if score >= 50:
        return "Good fit"
    return "Weak fit"


def compute_profile_fit(
    profile: models.UserProfile | None,
    *,
    role: str,
    company: str = "",
    location: str | None = None,
) -> dict[str, object]:
    if profile is None:
        return {
            "profile_fit_score": 0,
            "profile_fit_label": "",
            "profile_fit_available": False,
            "profile_fit_feedback": "",
        }

    has_signals = bool(
        (profile.skills or "").strip()
        or (profile.headline or "").strip()
        or profile.years_experience
    )
    if not has_signals:
        return {
            "profile_fit_score": 0,
            "profile_fit_label": "",
            "profile_fit_available": False,
            "profile_fit_feedback": "",
        }

    score = 45
    feedback: list[str] = []
    role_lower = (role or "").lower()
    loc_lower = (location or "").lower()
    skills = _tokenize_skills(profile.skills)

    if skills:
        hits = [s for s in skills if len(s) >= 2 and s in role_lower]
        if hits:
            boost = min(28, 6 + len(hits) * 5)
            score += boost
            feedback.append(f"Skill overlap: {', '.join(hits[:3])}")
        else:
            score -= 8
            feedback.append("Title does not mention your listed skills")

    headline = (profile.headline or "").strip().lower()
    if headline:
        headline_tokens = [w for w in re.split(r"\s+", headline) if len(w) > 3]
        if any(token in role_lower for token in headline_tokens):
            score += 12
            feedback.append("Role aligns with your headline")
        elif any(token in role_lower for token in headline.split()[:2]):
            score += 6

    city = (profile.city or "").strip().lower()
    if city and city in loc_lower:
        score += 10
        feedback.append("Location matches your city")
    elif "remote" in loc_lower or "ibrid" in loc_lower or "hybrid" in loc_lower:
        score += 6
        feedback.append("Flexible work location")

    years = profile.years_experience or 0
    senior_role = any(w in role_lower for w in ("senior", "lead", "staff", "principal", "manager"))
    junior_role = any(w in role_lower for w in ("junior", "entry", "graduate", "intern"))
    if years >= 5 and senior_role:
        score += 10
        feedback.append("Seniority fits your experience")
    elif years <= 2 and junior_role:
        score += 8
        feedback.append("Junior-friendly role for your level")
    elif years >= 5 and junior_role:
        score -= 12
        feedback.append("Role may be below your experience level")

    if (profile.summary or "").strip() and company:
        company_lower = company.lower()
        summary_lower = (profile.summary or "").lower()
        if company_lower in summary_lower:
            score += 4

    score = max(0, min(100, score))
    label = _fit_label(score)
    if not feedback:
        feedback.append(label)

    return {
        "profile_fit_score": score,
        "profile_fit_label": label,
        "profile_fit_available": True,
        "profile_fit_feedback": " · ".join(feedback[:3]),
    }


def load_user_profile(db: Session, user_id: int | None) -> models.UserProfile | None:
    if not user_id:
        return None
    return db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()


def apply_profile_fit_to_job_offer(offer: JobOffer, profile: models.UserProfile | None) -> None:
    fit = compute_profile_fit(
        profile,
        role=offer.role,
        company=offer.company,
        location=offer.location,
    )
    offer.profile_fit_score = int(fit["profile_fit_score"])
    offer.profile_fit_label = str(fit["profile_fit_label"])
    offer.profile_fit_available = bool(fit["profile_fit_available"])
    setattr(offer, "profile_fit_feedback", str(fit["profile_fit_feedback"]))


def apply_profile_fit_to_careers_row(row: RecentCareersOfferRow, profile: models.UserProfile | None) -> None:
    fit = compute_profile_fit(
        profile,
        role=row.role,
        company=row.company_name,
        location=row.location,
    )
    row.profile_fit_score = int(fit["profile_fit_score"])
    row.profile_fit_label = str(fit["profile_fit_label"])
    row.profile_fit_available = bool(fit["profile_fit_available"])
    row.profile_fit_feedback = str(fit["profile_fit_feedback"])


def enrich_job_offers(db: Session, user_id: int | None, offers: list[JobOffer]) -> None:
    profile = load_user_profile(db, user_id)
    for offer in offers:
        apply_profile_fit_to_job_offer(offer, profile)


def enrich_careers_offers(db: Session, user_id: int | None, offers: list[RecentCareersOfferRow]) -> None:
    profile = load_user_profile(db, user_id)
    for row in offers:
        apply_profile_fit_to_careers_row(row, profile)
