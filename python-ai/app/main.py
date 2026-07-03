from fastapi import FastAPI
from app.routers import health, search


app = FastAPI(
    title="Interview Python AI",
    description="AI, scraper and vector services",
    version="0.1.0",
)

app.include_router(health.router)
app.include_router(search.router)



@app.get("/")
def root():
    return {"service": "python-ai", "status": "ok"}