from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class JobSearch(Base):
    __tablename__ = "job_searches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    searched_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    total_found: Mapped[int] = mapped_column(Integer, nullable=False)
    verified_count: Mapped[int] = mapped_column(Integer, nullable=False)
    maybe_count: Mapped[int] = mapped_column(Integer, nullable=False)
    rejected_count: Mapped[int] = mapped_column(Integer, nullable=False)
    command_json: Mapped[str] = mapped_column(Text, nullable=False)
    offers: Mapped[list["JobOfferRow"]] = relationship(back_populates="search", cascade="all, delete-orphan")


class JobOfferRow(Base):
    __tablename__ = "job_offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    search_id: Mapped[int] = mapped_column(ForeignKey("job_searches.id"), index=True)
    offer_id: Mapped[str] = mapped_column(String(64), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(500), nullable=False)
    apply_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    posted_at: Mapped[str | None] = mapped_column(String(64))
    language_requirement: Mapped[str | None] = mapped_column(String(255))
    seniority: Mapped[str] = mapped_column(String(32), nullable=False)
    web_dev_fit: Mapped[int] = mapped_column(Integer, nullable=False)
    web_dev_fit_label: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    status_reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    location: Mapped[str | None] = mapped_column(Text)
    origin: Mapped[str] = mapped_column(String(16), nullable=False, default="ats")
    verified_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    search: Mapped["JobSearch"] = relationship(back_populates="offers")


class JobAppliedOffer(Base):
    __tablename__ = "job_applied_offers"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    offer_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class JobDismissedOffer(Base):
    __tablename__ = "job_dismissed_offers"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    offer_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    dismissed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    apply_url_norm: Mapped[str | None] = mapped_column(String(1000))
    company_norm: Mapped[str | None] = mapped_column(String(255))
    role_norm: Mapped[str | None] = mapped_column(String(500))


class MonitoredCompany(Base):
    __tablename__ = "monitored_companies"
    __table_args__ = (UniqueConstraint("ats", "slug", name="uq_monitored_ats_slug"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ats: Mapped[str] = mapped_column(String(32), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    careers_url: Mapped[str] = mapped_column(String(1000), default="")
    job_count: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    source: Mapped[str] = mapped_column(String(32), default="manual")
    discovered_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    priority: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class LlmUsageRow(Base):
    __tablename__ = "llm_usage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(64), nullable=False)
    operation: Mapped[str] = mapped_column(String(64), nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, default=0)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)


class LlmSettingsRow(Base):
    __tablename__ = "llm_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    monthly_budget_usd: Mapped[float] = mapped_column(Float, nullable=False)
    parse_prompt_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    discover_company_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    auto_discover_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class UserJobPreferences(Base):
    __tablename__ = "user_job_preferences"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    preferences_json: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
