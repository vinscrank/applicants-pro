from urllib.parse import urlparse, urlunparse

JOB_URL_MAX_LEN = 500


def normalize_job_url(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        return ""
    parsed = urlparse(raw.split("#", 1)[0].rstrip("/"))
    return urlunparse((parsed.scheme, parsed.netloc.lower(), parsed.path.rstrip("/"), "", "", ""))


def persist_job_url(url: str) -> str:
    normalized = normalize_job_url(url)
    if not normalized:
        return (url or "").strip()[:JOB_URL_MAX_LEN]
    if len(normalized) <= JOB_URL_MAX_LEN:
        return normalized
    return normalized[:JOB_URL_MAX_LEN]
