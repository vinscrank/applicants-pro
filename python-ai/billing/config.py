import os

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
STRIPE_PRICE_PRO = os.getenv("STRIPE_PRICE_PRO", "").strip()
STRIPE_PRICE_BUSINESS = os.getenv("STRIPE_PRICE_BUSINESS", "").strip()
STRIPE_PRICE_PRO_ANNUAL = os.getenv("STRIPE_PRICE_PRO_ANNUAL", "").strip()
STRIPE_PRICE_BUSINESS_ANNUAL = os.getenv("STRIPE_PRICE_BUSINESS_ANNUAL", "").strip()

BILLING_ENABLED = bool(STRIPE_SECRET_KEY)

_default_owner = "vinci.loca1@gmail.com"
_raw_owners = os.getenv("OWNER_EMAILS", _default_owner).strip()
OWNER_EMAILS = frozenset(
    email.strip().lower() for email in _raw_owners.split(",") if email.strip()
)

SAAS_MARGIN_PERCENT = float(os.getenv("SAAS_MARGIN_PERCENT", "400"))
