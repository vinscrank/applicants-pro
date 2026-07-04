import re
from .schemas import SearchCommand, Seniority, VerificationStatus

ROLE_PENDING_AI = "Classificazione ruolo (AI)"

SENIORITY_PATTERNS = [
    (Seniority.LEAD, r"\b(lead|principal|staff|director)\b"),
    (Seniority.SENIOR, r"\b(senior|sr\.?)\b"),
    (Seniority.JUNIOR, r"\b(junior|jr\.?|graduate|entry)\b"),
    (Seniority.ENTRY, r"\b(intern|associate|entry)\b"),
    (Seniority.MID, r"\b(mid|intermediate)\b"),
]


def detect_seniority(title: str) -> Seniority:
    for level, pattern in SENIORITY_PATTERNS:
        if re.search(pattern, title, re.I):
            return level
    return Seniority.MID


def classify_offer(
    title: str,
    description: str,
    location: str,
    company: str,
    apply_active: bool,
    command: SearchCommand,
) -> tuple[VerificationStatus, str, None]:
    if not apply_active:
        return VerificationStatus.VERIFIED, "Apply possibilmente non attivo", None
    return VerificationStatus.VERIFIED, "Verificato e candidabile", None
