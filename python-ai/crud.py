from datetime import date, datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy import distinct, text

import models
import schemas


def _applied_datetime(value: date | datetime | None, status: str) -> datetime | None:
    if status != "applied":
        return value if isinstance(value, datetime) else None
    now = datetime.now(timezone.utc)
    if value is None:
        return now
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return datetime.combine(value, now.time(), tzinfo=timezone.utc)


def _as_date(value: date | datetime | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    return value


def _user_query(db: Session, user_id: int):
    return db.query(models.Application).filter(models.Application.user_id == user_id)


def get_applications(
    db: Session,
    user_id: int,
    status: str | None = None,
    search: str | None = None,
    exclude_rejected: bool = True,
    include_drafts: bool = False,
) -> list[models.Application]:
    query = _user_query(db, user_id)
    if status:
        query = query.filter(models.Application.status == status)
    elif include_drafts:
        if exclude_rejected:
            query = query.filter(models.Application.status != "rejected")
    else:
        query = query.filter(models.Application.status != "draft")
        if exclude_rejected:
            query = query.filter(models.Application.status != "rejected")
    if search:
        term = f"%{search}%"
        query = query.filter(
            (models.Application.company_name.ilike(term))
            | (models.Application.job_title.ilike(term))
            | (models.Application.ta_name.ilike(term))
            | (models.Application.location.ilike(term))
        )
    return query.order_by(models.Application.updated_at.desc()).all()


def get_application(db: Session, application_id: int, user_id: int) -> models.Application | None:
    return (
        _user_query(db, user_id)
        .filter(models.Application.id == application_id)
        .first()
    )


def get_application_by_job_url(db: Session, job_url: str, user_id: int) -> models.Application | None:
    normalized = job_url.strip()
    if not normalized:
        return None
    return (
        _user_query(db, user_id)
        .filter(models.Application.job_url == normalized)
        .first()
    )


def create_application(db: Session, data: schemas.ApplicationCreate, user_id: int) -> models.Application:
    import models as m
    from billing.plans import plan_for_user

    user = db.get(m.User, user_id)
    if user:
        plan = plan_for_user(user)
        count = _user_query(db, user_id).count()
        if count >= plan.applications_max:
            raise ValueError("Limite candidature del piano raggiunto. Passa a Pro.")
    payload = data.model_dump()
    if payload.get("created_at") is None:
        payload["created_at"] = date.today()
    if not payload.get("application_source"):
        payload["application_source"] = "manual"
    payload["last_applied_at"] = _applied_datetime(
        payload.get("last_applied_at"),
        payload.get("status", "applied"),
    )
    payload["user_id"] = user_id
    application = models.Application(**payload)
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def update_application(
    db: Session, application_id: int, user_id: int, data: schemas.ApplicationUpdate
) -> models.Application | None:
    application = get_application(db, application_id, user_id)
    if not application:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(application, key, value)
    if data.status == "applied" and data.last_applied_at is None:
        application.last_applied_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(application)
    return application


def delete_application(db: Session, application_id: int, user_id: int) -> bool:
    application = get_application(db, application_id, user_id)
    if not application:
        return False
    db.delete(application)
    db.commit()
    return True


def get_company_names(db: Session, user_id: int) -> list[str]:
    rows = (
        _user_query(db, user_id)
        .with_entities(distinct(models.Application.company_name))
        .order_by(models.Application.company_name.asc())
        .all()
    )
    return [row[0] for row in rows if row[0]]


def get_stats(db: Session, user_id: int) -> schemas.StatsResponse:
    applications = (
        _user_query(db, user_id)
        .filter(models.Application.status != "draft")
        .all()
    )
    by_status: dict[str, int] = {}
    follow_up_due = 0
    linkedin_pending = 0
    today = date.today()
    applied_today = 0
    applied_dates: list[date] = []

    for app in applications:
        by_status[app.status] = by_status.get(app.status, 0) + 1
        applied_on = _as_date(app.last_applied_at) or _as_date(app.created_at)
        if applied_on:
            applied_dates.append(applied_on)
            if applied_on == today:
                applied_today += 1
        if app.follow_up_date and app.follow_up_date <= today and app.status not in (
            "rejected",
            "ghosted",
            "withdrawn",
            "accepted",
        ):
            follow_up_due += 1
        if not app.linkedin_connection_sent and app.ta_linkedin_url:
            linkedin_pending += 1

    if applied_dates:
        first_day = min(applied_dates)
        tracked_days = max(1, (today - first_day).days + 1)
        daily_average = round(len(applied_dates) / tracked_days, 1)
    else:
        daily_average = 0.0

    return schemas.StatsResponse(
        total=len(applications),
        by_status=by_status,
        follow_up_due=follow_up_due,
        linkedin_pending=linkedin_pending,
        applied_today=applied_today,
        daily_average=daily_average,
    )


def export_applications(db: Session, user_id: int) -> schemas.ExportResponse:
    applications = (
        _user_query(db, user_id).order_by(models.Application.id.asc()).all()
    )
    return schemas.ExportResponse(
        exported_at=datetime.utcnow(),
        applications=[
            schemas.ApplicationResponse.model_validate(app) for app in applications
        ],
    )


def import_applications(db: Session, data: schemas.ImportRequest, user_id: int) -> int:
    if data.replace:
        _user_query(db, user_id).delete()
        db.flush()

    for item in data.applications:
        payload = item.model_dump(exclude={"id", "updated_at"})
        if payload.get("created_at") is None:
            payload["created_at"] = date.today()
        if not payload.get("application_source"):
            payload["application_source"] = "manual"
        payload["user_id"] = user_id
        if data.replace and item.id is not None:
            application = models.Application(id=item.id, **payload)
        else:
            application = models.Application(**payload)
        db.add(application)

    db.commit()

    if data.replace:
        db.execute(
            text(
                "SELECT setval("
                "pg_get_serial_sequence('applications', 'id'), "
                "COALESCE((SELECT MAX(id) FROM applications), 1), "
                "true)"
            )
        )
        db.commit()

    return len(data.applications)


def _week_bounds(today: date) -> tuple[date, date]:
    week_start = today.fromordinal(today.toordinal() - today.weekday())
    week_end = week_start.fromordinal(week_start.toordinal() + 6)
    return week_start, week_end


def _task_in_scope(due: date, scope: str, today: date) -> bool:
    if scope == "today":
        return due == today
    if scope == "week":
        week_start, week_end = _week_bounds(today)
        return week_start <= due <= week_end
    if scope == "overdue":
        return due < today
    return False


def get_application_tasks(
    db: Session,
    user_id: int,
    scope: schemas.TaskScopeType,
) -> list[schemas.ApplicationTaskResponse]:
    closed_statuses = {"rejected", "ghosted", "withdrawn", "accepted"}
    applications = (
        _user_query(db, user_id)
        .filter(models.Application.status != "draft")
        .all()
    )
    today = date.today()
    tasks: list[schemas.ApplicationTaskResponse] = []

    for app in applications:
        if app.status in closed_statuses:
            continue
        if app.follow_up_date and _task_in_scope(app.follow_up_date, scope, today):
            tasks.append(
                schemas.ApplicationTaskResponse(
                    id=f"fu-{app.id}",
                    application_id=app.id,
                    kind="follow_up",
                    company_name=app.company_name,
                    job_title=app.job_title,
                    due=app.follow_up_date,
                )
            )
        if app.interview_date and _task_in_scope(app.interview_date, scope, today):
            tasks.append(
                schemas.ApplicationTaskResponse(
                    id=f"in-{app.id}",
                    application_id=app.id,
                    kind="interview",
                    company_name=app.company_name,
                    job_title=app.job_title,
                    due=app.interview_date,
                )
            )

    tasks.sort(key=lambda task: (task.due, task.application_id))
    return tasks
