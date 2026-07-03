from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/internal/search", tags=["search"])


class ParseRequest(BaseModel):
    prompt: str


class ParseResponse(BaseModel):
    job_title: str | None = None
    location: str | None = None
    remote: bool | None = None
    raw_prompt: str


@router.post("/parse", response_model=ParseResponse)
def parse_search(body: ParseRequest):
    prompt = body.prompt.lower()
    return ParseResponse(
        job_title="Software Engineer" if "engineer" in prompt else "Developer",
        location="Milano" if "milano" in prompt else None,
        remote="remote" in prompt or "remoto" in prompt,
        raw_prompt=body.prompt,
    )


class RunSearchRequest(BaseModel):
    job_title: str | None = None
    location: str | None = None
    remote: bool | None = None


class JobOffer(BaseModel):
    id: str
    title: str
    company: str
    location: str | None = None
    url: str


class RunSearchResponse(BaseModel):
    search_id: str
    offers: list[JobOffer]


@router.post("/run", response_model=RunSearchResponse)
def run_search(body: RunSearchRequest):
    title = body.job_title or "Developer"
    return RunSearchResponse(
        search_id="mock-search-1",
        offers=[
            JobOffer(
                id="1",
                title=f"Senior {title}",
                company="Acme Corp",
                location=body.location,
                url="https://example.com/jobs/1",
            ),
            JobOffer(
                id="2",
                title=f"{title} (Remote)" if body.remote else title,
                company="Globex",
                location="Remote" if body.remote else body.location,
                url="https://example.com/jobs/2",
            ),
        ],
    )