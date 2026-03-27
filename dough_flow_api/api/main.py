from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.database import async_session
from api.routers import (
    accounts,
    auth,
    budgets,
    categories,
    csv_import,
    debt_groups,
    debts,
    goals,
    reports,
    transactions,
)
from api.seed import seed_default_categories, seed_default_csv_mappings


class HealthResponse(BaseModel):
    status: str


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    async with async_session() as db:
        await seed_default_categories(db)
        await seed_default_csv_mappings(db)
    yield


app = FastAPI(title="Dough Flow API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(debts.router)
app.include_router(debt_groups.router)
app.include_router(goals.router)
app.include_router(transactions.router)
app.include_router(reports.router)
app.include_router(csv_import.router)
app.include_router(budgets.router)


@app.get("/api/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok")
