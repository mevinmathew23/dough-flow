import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.dependencies import get_current_user
from api.helpers import apply_update, delete_entity, get_or_404
from api.models.budget import Budget
from api.models.user import User
from api.schemas.budget import BudgetCreate, BudgetResponse, BudgetUpdate, BudgetWithSpending
from api.services.budget_service import get_budgets_with_spending

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    data: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Budget:
    existing = await db.execute(
        select(Budget).where(
            Budget.user_id == current_user.id,
            Budget.category_id == data.category_id,
            Budget.month == data.month,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="Budget already exists for this category and month",
        )

    budget = Budget(**data.model_dump(), user_id=current_user.id)
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return budget


@router.get("", response_model=list[BudgetResponse])
async def list_budgets(
    month: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Budget]:
    result = await db.execute(select(Budget).where(Budget.user_id == current_user.id, Budget.month == month))
    return list(result.scalars().all())


@router.get("/spending", response_model=list[BudgetWithSpending])
async def list_budgets_with_spending(
    month: date = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BudgetWithSpending]:
    return await get_budgets_with_spending(db, current_user.id, month)


@router.patch("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: uuid.UUID,
    data: BudgetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Budget:
    budget = await get_or_404(db, Budget, budget_id, current_user.id, "Budget not found")
    await apply_update(db, budget, data)
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await delete_entity(db, Budget, budget_id, current_user.id, "Budget not found")
