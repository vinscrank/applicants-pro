import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from contextlib import asynccontextmanager

from fastapi import FastAPI
from app.routers import health, internal_search, internal_llm, internal_jobs
from database import SessionLocal
from scraper import repository as repo
from scraper.llm.usage_pg import init_llm_settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    db = SessionLocal()
    try:
        init_llm_settings(db)
        repo.seed_monitored_companies(db)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
    yield


app = FastAPI(
    title="Interview Python AI",
    description="Scraper and LLM services",
    version="0.2.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(internal_search.router)
app.include_router(internal_llm.router)
app.include_router(internal_jobs.router)


@app.get("/")
def root():
    return {"service": "python-ai", "status": "ok"}
