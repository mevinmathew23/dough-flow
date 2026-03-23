import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.debt import Debt
from app.models.user import User
from app.schemas.debt import (
    DebtCreate,
    DebtGroupSummary,
    DebtResponse,
    DebtUpdate,
    GrowthProjection,
    PayoffSummary,
)
from app.services.debt_calculator import (
    calculate_group_summary,
    calculate_payoff_summary,
    project_growth,
)

router = APIRouter(prefix="/api/debts", tags=["debts"])


@router.post("", response_model=DebtResponse, status_code=status.HTTP_201_CREATED)
async def create_debt(
    data: DebtCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Debt:
    debt = Debt(**data.model_dump(), user_id=current_user.id)
    db.add(debt)
    await db.commit()
    await db.refresh(debt)
    return debt


@router.get("", response_model=list[DebtResponse])
async def list_debts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Debt]:
    result = await db.execute(select(Debt).where(Debt.user_id == current_user.id).order_by(Debt.priority_order))
    return list(result.scalars().all())


@router.get("/payoff", response_model=PayoffSummary)
async def get_payoff_projection(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    extra_monthly: float = Query(0),
) -> PayoffSummary:
    result = await db.execute(select(Debt).where(Debt.user_id == current_user.id).order_by(Debt.priority_order))
    debts = list(result.scalars().all())
    if not debts:
        return PayoffSummary(
            projections=[],
            total_debt=0,
            total_interest=0,
            debt_free_date=date.today(),
            interest_saved_vs_minimum=0,
        )
    return calculate_payoff_summary(debts, extra_monthly, date.today())


@router.get("/growth", response_model=list[GrowthProjection])
async def get_growth_projections(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    months: int = Query(12, ge=1, le=120),
) -> list[GrowthProjection]:
    """Project how each debt grows over time from interest alone (no payments)."""
    result = await db.execute(select(Debt).where(Debt.user_id == current_user.id).order_by(Debt.priority_order))
    debts = list(result.scalars().all())
    return [project_growth(d, months) for d in debts]


@router.get("/grouped", response_model=DebtGroupSummary)
async def get_grouped_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebtGroupSummary:
    """Get all debts aggregated: total principal, total balance, weighted interest rate."""
    result = await db.execute(select(Debt).where(Debt.user_id == current_user.id).order_by(Debt.priority_order))
    debts = list(result.scalars().all())
    if not debts:
        return DebtGroupSummary(
            debt_ids=[],
            total_principal=0,
            total_current_balance=0,
            weighted_interest_rate=0,
            total_minimum_payment=0,
            debt_count=0,
        )
    return calculate_group_summary(debts)


@router.get("/{debt_id}", response_model=DebtResponse)
async def get_debt(
    debt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Debt:
    result = await db.execute(select(Debt).where(Debt.id == debt_id, Debt.user_id == current_user.id))
    debt = result.scalar_one_or_none()
    if debt is None:
        raise HTTPException(status_code=404, detail="Debt not found")
    return debt


@router.patch("/{debt_id}", response_model=DebtResponse)
async def update_debt(
    debt_id: uuid.UUID,
    data: DebtUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Debt:
    result = await db.execute(select(Debt).where(Debt.id == debt_id, Debt.user_id == current_user.id))
    debt = result.scalar_one_or_none()
    if debt is None:
        raise HTTPException(status_code=404, detail="Debt not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(debt, field, value)
    await db.commit()
    await db.refresh(debt)
    return debt


@router.delete("/{debt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_debt(
    debt_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(select(Debt).where(Debt.id == debt_id, Debt.user_id == current_user.id))
    debt = result.scalar_one_or_none()
    if debt is None:
        raise HTTPException(status_code=404, detail="Debt not found")
    await db.delete(debt)
    await db.commit()
