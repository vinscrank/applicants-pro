from dataclasses import dataclass

from .config import STRIPE_PRICE_BUSINESS, STRIPE_PRICE_BUSINESS_ANNUAL, STRIPE_PRICE_PRO, STRIPE_PRICE_PRO_ANNUAL
from .owner import is_owner


@dataclass(frozen=True)
class PlanDefinition:
    id: str
    name: str
    price_eur_month: float
    price_eur_year: float
    stripe_price_month: str
    stripe_price_year: str
    offerte_live: bool
    ai_calls_month: int
    auto_discover: bool
    companion_autofill: bool
    applications_max: int
    margin_note: str


OWNER_PLAN = PlanDefinition(
    id="owner",
    name="Proprietario",
    price_eur_month=0,
    price_eur_year=0,
    stripe_price_month="",
    stripe_price_year="",
    offerte_live=True,
    ai_calls_month=1_000_000,
    auto_discover=True,
    companion_autofill=True,
    applications_max=1_000_000,
    margin_note="Accesso completo senza Stripe",
)


PLANS: dict[str, PlanDefinition] = {
    "free": PlanDefinition(
        id="free",
        name="Free",
        price_eur_month=0,
        price_eur_year=0,
        stripe_price_month="",
        stripe_price_year="",
        offerte_live=False,
        ai_calls_month=0,
        auto_discover=False,
        companion_autofill=False,
        applications_max=40,
        margin_note="Acquisizione utenti",
    ),
    "pro": PlanDefinition(
        id="pro",
        name="Pro",
        price_eur_month=14.99,
        price_eur_year=149,
        stripe_price_month=STRIPE_PRICE_PRO,
        stripe_price_year=STRIPE_PRICE_PRO_ANNUAL,
        offerte_live=True,
        ai_calls_month=200,
        auto_discover=False,
        companion_autofill=True,
        applications_max=500,
        margin_note="Costo AI stimato ~1-2 EUR/mese per utente medio",
    ),
    "business": PlanDefinition(
        id="business",
        name="Business",
        price_eur_month=29.99,
        price_eur_year=299,
        stripe_price_month=STRIPE_PRICE_BUSINESS,
        stripe_price_year=STRIPE_PRICE_BUSINESS_ANNUAL,
        offerte_live=True,
        ai_calls_month=800,
        auto_discover=True,
        companion_autofill=True,
        applications_max=5000,
        margin_note="Power user + discovery AI",
    ),
}


def get_plan(plan_id: str) -> PlanDefinition:
    return PLANS.get(plan_id, PLANS["free"])


def is_paid_active(user) -> bool:
    return user.subscription_status == "active" and user.plan_tier in ("pro", "business")


def effective_plan_id(user) -> str:
    if is_owner(user):
        return "owner"
    if is_paid_active(user):
        return user.plan_tier
    if user.subscription_status == "trialing" and user.plan_tier in PLANS:
        return user.plan_tier
    return "free"


def plan_for_user(user) -> PlanDefinition:
    if is_owner(user):
        return OWNER_PLAN
    return get_plan(effective_plan_id(user))
