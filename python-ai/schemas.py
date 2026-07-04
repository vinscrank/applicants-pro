from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field

StatusType = Literal[
    "draft",
    "applied",
    "follow_up_sent",
    "phone_screen",
    "technical_interview",
    "final_interview",
    "offer",
    "accepted",
    "rejected",
    "ghosted",
    "withdrawn",
]

PriorityType = Literal["low", "medium", "high"]
RemoteType = Literal["remote", "hybrid", "onsite", "unknown"]
ApplicationMethodType = Literal[
    "linkedin",
    "company_website",
    "indeed",
    "other",
    "email",
    "recruiter",
    "referral",
    "job_board",
]

ApplicationSourceType = Literal["manual", "quick_add", "offerte_live", "careers", "extension"]

TaskKindType = Literal["follow_up", "interview"]
TaskScopeType = Literal["today", "week", "overdue"]


class ApplicationBase(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    job_title: str = Field(min_length=1, max_length=255)
    job_url: str | None = None
    company_website: str | None = None
    company_linkedin_url: str | None = None
    location: str | None = None
    status: StatusType = "applied"
    priority: PriorityType = "medium"
    remote_type: RemoteType | None = None
    application_method: ApplicationMethodType | None = None
    application_method_other: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str = "EUR"
    visa_sponsorship: bool | None = None
    ta_name: str | None = None
    ta_email: str | None = None
    ta_linkedin_url: str | None = None
    ta_phone: str | None = None
    hiring_manager_name: str | None = None
    hiring_manager_linkedin_url: str | None = None
    linkedin_connection_sent: bool = False
    linkedin_message_sent: bool = False
    follow_up_date: date | None = None
    last_contact_date: date | None = None
    response_received_at: date | None = None
    interview_date: date | None = None
    created_at: date | None = None
    last_applied_at: datetime | None = None
    application_source: ApplicationSourceType = "manual"
    linked_offer_id: str | None = None
    notes: str | None = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=255)
    job_title: str | None = Field(default=None, min_length=1, max_length=255)
    job_url: str | None = None
    company_website: str | None = None
    company_linkedin_url: str | None = None
    location: str | None = None
    status: StatusType | None = None
    priority: PriorityType | None = None
    remote_type: RemoteType | None = None
    application_method: ApplicationMethodType | None = None
    application_method_other: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str | None = None
    visa_sponsorship: bool | None = None
    ta_name: str | None = None
    ta_email: str | None = None
    ta_linkedin_url: str | None = None
    ta_phone: str | None = None
    hiring_manager_name: str | None = None
    hiring_manager_linkedin_url: str | None = None
    linkedin_connection_sent: bool | None = None
    linkedin_message_sent: bool | None = None
    follow_up_date: date | None = None
    last_contact_date: date | None = None
    response_received_at: date | None = None
    interview_date: date | None = None
    created_at: date | None = None
    last_applied_at: datetime | None = None
    application_source: ApplicationSourceType | None = None
    linked_offer_id: str | None = None
    notes: str | None = None


class ApplicationResponse(ApplicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: date
    updated_at: datetime

    @computed_field
    @property
    def offerte_offer_id(self) -> str | None:
        if self.linked_offer_id:
            return self.linked_offer_id
        notes = self.notes or ""
        for part in notes.split():
            if part.startswith("offer:"):
                offer_id = part[6:].strip()
                if offer_id:
                    return offer_id
        return None


class ApplicationPageMatchResponse(BaseModel):
    matched: bool
    application_id: int | None = None
    offer_id: str | None = None
    company_name: str = ""
    job_title: str = ""
    status: str = ""
    is_draft: bool = False
    last_applied_at: datetime | None = None


class ApplySessionSyncRequest(BaseModel):
    page_url: str = Field(min_length=8, max_length=2000)
    job_url: str | None = Field(default=None, max_length=2000)
    company_name: str | None = Field(default=None, max_length=255)
    job_title: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    session_id: str | None = Field(default=None, max_length=128)
    step: int | None = Field(default=None, ge=1, le=50)
    finalize: bool = False
    application_id: int | None = None
    linked_offer_id: str | None = Field(default=None, max_length=64)
    notes: str | None = Field(default=None, max_length=4000)
    application_method: str | None = None


class ApplySessionSyncResponse(BaseModel):
    application_id: int = 0
    created: bool
    status: str
    already_applied: bool = False
    skipped: bool = False


class StatsResponse(BaseModel):
    total: int
    by_status: dict[str, int]
    follow_up_due: int
    linkedin_pending: int
    applied_today: int
    daily_average: float = 0


class ExportResponse(BaseModel):
    version: int = 1
    exported_at: datetime
    applications: list[ApplicationResponse]


class ImportApplicationItem(ApplicationBase):
    id: int | None = None
    created_at: date | None = None
    updated_at: datetime | None = None


class ImportRequest(BaseModel):
    version: int = 1
    applications: list[ImportApplicationItem]
    replace: bool = False


class ImportResponse(BaseModel):
    imported: int
    replace: bool


class ApplicationTaskResponse(BaseModel):
    id: str
    application_id: int
    kind: TaskKindType
    company_name: str
    job_title: str
    due: date
