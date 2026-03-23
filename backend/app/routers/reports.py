from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.report import CategoryComparison, CategorySpending, MonthlySummary, NetWorth
from app.services.report_generator import (
    get_category_breakdown,
    get_category_comparison,
    get_income_vs_expense_trend,
    get_monthly_summary,
    get_net_worth,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/monthly", response_model=MonthlySummary)
async def monthly_summary(
    month: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> MonthlySummary:
    data = await get_monthly_summary(db, user.id, month)
    return MonthlySummary(**data)


@router.get("/categories", response_model=list[CategorySpending])
async def category_breakdown(
    month: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CategorySpending]:
    data = await get_category_breakdown(db, user.id, month)
    return [CategorySpending(**row) for row in data]


@router.get("/trend", response_model=list[MonthlySummary])
async def income_expense_trend(
    months: int = Query(6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[MonthlySummary]:
    data = await get_income_vs_expense_trend(db, user.id, months)
    return [MonthlySummary(**row) for row in data]


@router.get("/categories/comparison", response_model=list[CategoryComparison])
async def category_comparison(
    month: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[CategoryComparison]:
    data = await get_category_comparison(db, user.id, month)
    return [CategoryComparison(**row) for row in data]


@router.get("/net-worth", response_model=NetWorth)
async def net_worth(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> NetWorth:
    data = await get_net_worth(db, user.id)
    return NetWorth(**data)
