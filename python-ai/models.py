from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    reset_token_hash: Mapped[str | None] = mapped_column(String(64))
    reset_token_expires: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    plan_tier: Mapped[str] = mapped_column(String(32), nullable=False, default="free")
    subscription_status: Mapped[str] = mapped_column(String(32), nullable=False, default="none")
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), index=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255))
    subscription_period_end: Mapped[datetime | None] = mapped_column(DateTime)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    first_name: Mapped[str | None] = mapped_column(String(120))
    last_name: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(40))
    city: Mapped[str | None] = mapped_column(String(120))
    country: Mapped[str | None] = mapped_column(String(120))
    address_line: Mapped[str | None] = mapped_column(String(255))
    headline: Mapped[str | None] = mapped_column(String(255))
    summary: Mapped[str | None] = mapped_column(Text)
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    github_url: Mapped[str | None] = mapped_column(String(500))
    website_url: Mapped[str | None] = mapped_column(String(500))
    portfolio_url: Mapped[str | None] = mapped_column(String(500))
    nationality: Mapped[str | None] = mapped_column(String(120))
    work_authorization: Mapped[str | None] = mapped_column(String(255))
    years_experience: Mapped[int | None] = mapped_column(Integer)
    skills: Mapped[str | None] = mapped_column(Text)
    cv_filename: Mapped[str | None] = mapped_column(String(255))
    cv_mime: Mapped[str | None] = mapped_column(String(120))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    job_title: Mapped[str] = mapped_column(String(255), nullable=False)
    job_url: Mapped[str | None] = mapped_column(String(500))
    company_website: Mapped[str | None] = mapped_column(String(500))
    company_linkedin_url: Mapped[str | None] = mapped_column(String(500))
    location: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="applied", index=True)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    remote_type: Mapped[str | None] = mapped_column(String(30))
    application_method: Mapped[str | None] = mapped_column(String(50))
    application_method_other: Mapped[str | None] = mapped_column(String(255))
    salary_min: Mapped[int | None] = mapped_column(Integer)
    salary_max: Mapped[int | None] = mapped_column(Integer)
    salary_currency: Mapped[str] = mapped_column(String(3), default="EUR")
    visa_sponsorship: Mapped[bool | None] = mapped_column(Boolean)
    ta_name: Mapped[str | None] = mapped_column(String(255))
    ta_email: Mapped[str | None] = mapped_column(String(255))
    ta_linkedin_url: Mapped[str | None] = mapped_column(String(500))
    ta_phone: Mapped[str | None] = mapped_column(String(50))
    hiring_manager_name: Mapped[str | None] = mapped_column(String(255))
    hiring_manager_linkedin_url: Mapped[str | None] = mapped_column(String(500))
    linkedin_connection_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    linkedin_message_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    follow_up_date: Mapped[date | None] = mapped_column(Date)
    last_contact_date: Mapped[date | None] = mapped_column(Date)
    response_received_at: Mapped[date | None] = mapped_column(Date)
    interview_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())
    last_applied_at: Mapped[datetime | None] = mapped_column(DateTime)
    application_source: Mapped[str] = mapped_column(String(32), nullable=False, default="manual", index=True)
    linked_offer_id: Mapped[str | None] = mapped_column(String(64), index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )
