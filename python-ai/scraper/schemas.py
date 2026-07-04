from enum import Enum
from pydantic import BaseModel, Field, model_validator
from typing import Literal, Optional
from datetime import datetime


class VerificationStatus(str, Enum):
    VERIFIED = "verified"
    MAYBE = "maybe"
    REJECTED = "rejected"


class Seniority(str, Enum):
    ENTRY = "entry"
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"
    UNKNOWN = "unknown"


PostedWithin = Literal["any", "24h", "7d", "30d", "90d"]
WorkMode = Literal["any", "onsite", "hybrid", "remote"]
MinStatus = Literal["all", "verified", "verified_maybe"]
SortBy = Literal["posted_desc", "posted_asc", "relevance"]


class LocationRule(BaseModel):
    areas: list[str] = Field(default_factory=list)
    work_mode: WorkMode = "any"


class SearchCommand(BaseModel):
    prompt_text: str = ""
    locations: list[str] = Field(default_factory=list)
    location_rules: list[LocationRule] = Field(default_factory=list)
    require_location: bool = False
    posted_within: PostedWithin = "any"
    posted_within_days: Optional[int] = None
    remote_only_areas: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    require_language: bool = False
    allowed_roles: list[str] = Field(default_factory=list)
    require_role_match: bool = False
    exclude_patterns: list[str] = Field(default_factory=list)
    title_keywords: list[str] = Field(default_factory=list)
    require_active_apply: bool = True
    exclude_pure_sales: bool = False
    exclude_call_center: bool = False

    @model_validator(mode="before")
    @classmethod
    def migrate_legacy(cls, data):
        if isinstance(data, dict):
            if "require_italian" in data and "require_language" not in data:
                data["require_language"] = data.pop("require_italian")
        return data


class JobOffer(BaseModel):
    id: str
    company: str
    role: str
    apply_url: str
    source: str
    origin: Literal["ats", "linkedin", "indeed", "upwork", "website"] = "ats"
    posted_at: Optional[str] = None
    language_requirement: Optional[str] = None
    seniority: Seniority = Seniority.UNKNOWN
    web_dev_fit: int = Field(default=0, ge=0, le=100)
    web_dev_fit_label: str = ""
    status: VerificationStatus
    status_reason: str = ""
    location: Optional[str] = None
    verified_at: datetime = Field(default_factory=datetime.utcnow)
    applied: bool = False
    applied_at: Optional[str] = None
    application_id: Optional[int] = None
    tracker_status: Optional[str] = None
    user_dismissed: bool = False
    historical: bool = False
    profile_fit_score: int = Field(default=0, ge=0, le=100)
    profile_fit_label: str = ""
    profile_fit_available: bool = False


class SearchSummary(BaseModel):
    id: int
    searched_at: datetime
    total_found: int
    verified_count: int
    maybe_count: int
    rejected_count: int
    prompt_text: str = ""
    locations: list[str] = Field(default_factory=list)
    allowed_roles: list[str] = Field(default_factory=list)


class SearchPreferences(BaseModel):
    default_locations: list[str] = Field(default_factory=list)
    origins: list[str] = Field(default_factory=list)
    posted_within: PostedWithin = "any"
    min_status: MinStatus = "all"
    sort_by: SortBy = "posted_desc"
    require_active_apply: bool = True


class SearchResult(BaseModel):
    id: Optional[int] = None
    command: SearchCommand
    preferences: SearchPreferences = Field(default_factory=SearchPreferences)
    searched_at: datetime
    total_found: int
    verified_count: int
    maybe_count: int
    rejected_count: int
    offers: list[JobOffer]
    offer_pool: list[JobOffer] = Field(default_factory=list)


class Company(BaseModel):
    id: Optional[int] = None
    name: str
    ats: str
    slug: str
    careers_url: str = ""
    job_count: int = 0
    active: bool = True
    source: str = "manual"
    discovered_at: Optional[datetime] = None
    priority: bool = False


class CompanyCreateRequest(BaseModel):
    name: str
    ats: str
    slug: str
    careers_url: str = ""
    active: bool = True
    priority: bool = False


class CompanyUpdateRequest(BaseModel):
    name: str | None = None
    ats: str | None = None
    slug: str | None = None
    careers_url: str | None = None
    active: bool | None = None
    job_count: int | None = None
    priority: bool | None = None


class CompanyScanRequest(BaseModel):
    posted_within: PostedWithin = "7d"


class CompanyScanSearchRequest(BaseModel):
    title_query: str


class ScannedOfferBrief(BaseModel):
    role: str
    posted_at: Optional[str] = None
    apply_url: str = ""
    location: Optional[str] = None
    source: str = ""


class CompanyScanResult(BaseModel):
    company_id: Optional[int] = None
    company_name: str
    careers_url: str = ""
    ats: str = ""
    slug: str = ""
    posted_within: PostedWithin = "7d"
    posted_within_label: str = ""
    total_jobs: int = 0
    recent_count: int = 0
    unknown_date_count: int = 0
    recent_offers: list[ScannedOfferBrief] = Field(default_factory=list)
    scanned_at: datetime


class RecentCareersOfferRow(BaseModel):
    company_id: Optional[int] = None
    company_name: str
    role: str
    posted_at: Optional[str] = None
    apply_url: str = ""
    location: Optional[str] = None
    source: str = ""


class ScanAllRecentResult(BaseModel):
    posted_within: PostedWithin = "24h"
    posted_within_label: str = ""
    title_query: Optional[str] = None
    companies_scanned: int = 0
    companies_failed: int = 0
    offer_count: int = 0
    offers: list[RecentCareersOfferRow] = Field(default_factory=list)
    scanned_at: datetime


class DiscoveryResult(BaseModel):
    scanned: int
    discovered: list[Company]
    added: int
    skipped: int
    failed_count: int
