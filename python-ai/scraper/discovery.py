import re
import asyncio
from urllib.parse import urlparse
import httpx

from .scrapers import FETCHERS, COMPANIES as SEED_COMPANIES

ATS_URL_PATTERNS = [
    (r"boards\.greenhouse\.io/([a-zA-Z0-9_-]+)", "greenhouse"),
    (r"boards-api\.greenhouse\.io/v1/boards/([a-zA-Z0-9_-]+)", "greenhouse"),
    (r"jobs\.lever\.co/([a-zA-Z0-9_-]+)", "lever"),
    (r"api\.lever\.co/v0/postings/([a-zA-Z0-9_-]+)", "lever"),
    (r"apply\.workable\.com/([a-zA-Z0-9_-]+)", "workable"),
    (r"jobs\.ashbyhq\.com/([a-zA-Z0-9_-]+)", "ashby"),
    (r"posting-api/job-board/([a-zA-Z0-9_-]+)", "ashby"),
]

SEED_COMPANY_NAMES = [
    "Stripe", "MongoDB", "Datadog", "HubSpot", "Klaviyo", "Vanta", "Intercom",
    "Udemy", "Deliveroo", "Keeper Security", "Trustpilot", "LearnUpon", "Circit",
    "Scorebuddy", "Salesforce", "Zoom", "IBM", "TSMG", "Alimentiv", "Datalex",
    "EXADS", "GLG", "Google", "Microsoft", "Amazon", "Meta", "Apple", "Oracle",
    "SAP", "Workday", "ServiceNow", "Snowflake", "Cloudflare", "Twilio", "Slack",
    "Dropbox", "Airbnb", "Spotify", "Revolut", "Wise", "Coinbase", "Robinhood",
    "Figma", "Notion", "Canva", "Shopify", "Square", "PayPal", "Adyen", "Worldpay",
    "Mastercard", "Visa", "Citi", "Bank of America", "JPMorgan", "Accenture",
    "Deloitte", "PwC", "EY", "KPMG", "HubSpot", "Zendesk", "Freshworks",
    "Atlassian", "GitLab", "GitHub", "JetBrains", "Elastic", "Confluent",
    "PagerDuty", "New Relic", "Splunk", "CrowdStrike", "Okta", "Auth0",
    "1Password", "LastPass", "Duo Security", "Proofpoint", "Snyk", "Lacework",
    "Wiz", "Airtable", "Miro", "Linear", "Asana", "Monday.com", "ClickUp",
    "HubSpot", "Marketo", "Mailchimp", "ActiveCampaign", "Braze", "Iterable",
    "Segment", "Amplitude", "Mixpanel", "Heap", "FullStory", "Hotjar",
    "Intercom", "Drift", "Gong", "Chorus", "Outreach", "Salesloft", "Clari",
    "Grafana Labs", "Prometheus", "HashiCorp", "Terraform", "Docker", "Red Hat",
    "Canonical", "SUSE", "VMware", "Nutanix", "Pure Storage", "NetApp",
    "Workhuman", "Personio", "HiBob", "Deel", "Remote.com", "Oyster",
    "Flipdish", "Wayflyer", "Stripe", "Fenergo", "Phorest", "Klaviyo",
    "Contentful", "Storyblok", "Sanity", "Strapi", "Prismic",
    "Sisense", "Looker", "Tableau", "Power BI", "ThoughtSpot",
    "Couchbase", "Redis", "Neo4j", "Cockroach Labs", "PlanetScale",
    "Vercel", "Netlify", "Railway", "Render", "Fly.io", "Supabase",
    "Firebase", "Appwrite", "Clerk", "Stytch", "WorkOS",
    "An Post", "AIB", "Bank of Ireland", "Permanent TSB", "Ryanair",
    "Kerry Group", "Smurfit Kappa", "CRH", "Kingspan", "Glanbia",
    "ICON plc", "Jazz Pharmaceuticals", "Allergan", "Shire",
    "Qualcomm", "Intel", "AMD", "NVIDIA", "Broadcom", "Qualtrics",
    "Zalando", "Booking.com", "Expedia", "TripAdvisor", "Skyscanner",
    "Indeed", "Glassdoor", "LinkedIn", "Monster", "StepStone",
    "Personio", "Personio", "Personio",
    "Learnosity", "Blackbaud", "Guidewire", "Workday", "Ceridian",
    "Sage", "Intuit", "Xero", "FreeAgent", "Wave", "FreshBooks",
    "GoCardless", "Checkout.com", "Mollie", "Rapyd", "Nuvei",
    "Sift", "Forter", "Riskified", "Signifyd", "Feedzai",
    "Collison", "Boxever", "Xtremepush", "Swrve", "Braze",
    "Etsy", "eBay", "Wayfair", "Zalando", "ASOS", "Boohoo",
    "HubSpot", "Pipedrive", "Close", "Copper", "Nutshell",
    "Aircall", "RingCentral", "8x8", "Dialpad", "Talkdesk",
    "Genesys", "Five9", "NICE", "Verint", "Calabrio",
    "Citrix", "LogMeIn", "TeamViewer", "AnyDesk", "Parsec",
    "Citrix", "Citrix", "Citrix",
]

KNOWN_SLUGS = {
    "keeper security": ("greenhouse", "keepersecurity"),
    "red hat": ("greenhouse", "redhat"),
    "monday.com": ("greenhouse", "mondaydotcom"),
    "remote.com": ("greenhouse", "remotecom"),
    "1password": ("greenhouse", "1password"),
}


def _slug_variants(name: str) -> list[str]:
    clean = name.lower().strip()
    variants = [
        clean.replace(" ", ""),
        clean.replace(" ", "-"),
        clean.replace(" ", "_"),
        clean.replace(".", ""),
        clean.replace(".", "-"),
        re.sub(r"[^a-z0-9]", "", clean),
        re.sub(r"[^a-z0-9]", "-", clean).strip("-"),
    ]
    words = [w for w in re.split(r"[\s.]+", name) if w]
    if len(words) > 1:
        variants.append("".join(w[0].lower() for w in words if w))
    return list(dict.fromkeys(v for v in variants if v))


def parse_careers_url(url: str) -> tuple[str, str, str] | None:
    for pattern, ats in ATS_URL_PATTERNS:
        m = re.search(pattern, url, re.I)
        if m:
            return ats, m.group(1).lower(), url
    return None


async def _verify_ats(ats: str, slug: str, client: httpx.AsyncClient) -> int:
    fetcher = FETCHERS.get(ats)
    if not fetcher:
        return 0
    jobs = await fetcher(slug, slug, client)
    return len(jobs)


async def discover_from_url(url: str, display_name: str = "") -> dict | None:
    parsed = parse_careers_url(url)
    if not parsed:
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
                r = await client.get(url)
                if r.status_code == 200:
                    for pattern, ats in ATS_URL_PATTERNS:
                        m = re.search(pattern, r.text, re.I)
                        if m:
                            parsed = (ats, m.group(1).lower(), url)
                            break
        except Exception:
            parsed = None

    if parsed:
        ats, slug, source_url = parsed
        async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
            count = await _verify_ats(ats, slug, client)

        if count == 0:
            return None

        name = display_name or slug.replace("-", " ").title()
        return {
            "name": name,
            "ats": ats,
            "slug": slug,
            "careers_url": source_url,
            "job_count": count,
            "source": "url",
        }

    from .careers_page import probe_careers_website

    return await probe_careers_website(url, display_name)


async def discover_from_name(name: str, db=None, user_id: int | None = None) -> dict | None:
    key = name.lower().strip()
    if key in KNOWN_SLUGS:
        ats, slug = KNOWN_SLUGS[key]
        async with httpx.AsyncClient(follow_redirects=True, timeout=12) as client:
            count = await _verify_ats(ats, slug, client)
        if count > 0:
            return {
                "name": name, "ats": ats, "slug": slug,
                "careers_url": "", "job_count": count, "source": "known",
            }

    slugs = _slug_variants(name)
    async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
        for ats in ("greenhouse", "lever", "workable", "ashby"):
            for slug in slugs:
                count = await _verify_ats(ats, slug, client)
                if count > 0:
                    careers = {
                        "greenhouse": f"https://boards.greenhouse.io/{slug}",
                        "lever": f"https://jobs.lever.co/{slug}",
                        "workable": f"https://apply.workable.com/{slug}",
                        "ashby": f"https://jobs.ashbyhq.com/{slug}",
                    }
                    return {
                        "name": name, "ats": ats, "slug": slug,
                        "careers_url": careers.get(ats, ""),
                        "job_count": count, "source": "scan",
                    }

    if db is not None:
        try:
            from .llm.usage_pg import assert_operation_allowed
            from .llm.discovery_assist import suggest_company_slugs
            from .llm.usage_pg import BudgetExceededError
            from .llm.policies import LlmPolicyError

            assert_operation_allowed(db, "discover_company")
            candidates = await suggest_company_slugs(db, name, user_id)
            async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
                seen: set[tuple[str, str]] = set()
                careers_tpl = {
                    "greenhouse": "https://boards.greenhouse.io/{slug}",
                    "lever": "https://jobs.lever.co/{slug}",
                    "workable": "https://apply.workable.com/{slug}",
                    "ashby": "https://jobs.ashbyhq.com/{slug}",
                }
                for c in candidates:
                    ats = (c.get("ats") or "").lower()
                    slug = (c.get("slug") or "").lower()
                    if not ats or not slug or ats not in FETCHERS:
                        continue
                    key = (ats, slug)
                    if key in seen:
                        continue
                    seen.add(key)
                    count = await _verify_ats(ats, slug, client)
                    if count > 0:
                        url = c.get("careers_url") or careers_tpl.get(ats, "").format(slug=slug)
                        return {
                            "name": name, "ats": ats, "slug": slug,
                            "careers_url": url, "job_count": count, "source": "gemini",
                        }
        except BudgetExceededError:
            raise
        except LlmPolicyError:
            return None
    return None


async def run_auto_discovery(
    names: list[str] | None = None,
    db=None,
    max_scan: int | None = None,
    user_id: int | None = None,
) -> dict:
    from .llm.config import AUTO_DISCOVER_MAX

    limit = max_scan if max_scan is not None else AUTO_DISCOVER_MAX
    targets = list(dict.fromkeys(names or SEED_COMPANY_NAMES))[: max(1, limit)]
    discovered: list[dict] = []
    failed: list[str] = []
    semaphore = asyncio.Semaphore(8)

    async def scan(name: str):
        async with semaphore:
            result = await discover_from_name(name, db, user_id)
            if result:
                discovered.append(result)
            else:
                failed.append(name)

    await asyncio.gather(*[scan(n) for n in targets])

    return {
        "scanned": len(targets),
        "discovered": discovered,
        "failed_count": len(failed),
        "failed": failed[:30],
    }
