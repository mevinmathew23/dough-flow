import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction, TransactionType
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetResponse, BudgetUpdate, BudgetWithSpending

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    data: BudgetCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Budget:
    # Check for duplicate budget (same user, category, month)
    existing = await db.execute(
        select(Budget).where(
            Budget.user_id == user.id,
            Budget.category_id == data.category_id,
            Budget.month == data.month,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409,
            detail="Budget already exists for this category and month",
        )

    budget = Budget(**data.model_dump(), user_id=user.id)
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return budget


@router.get("", response_model=list[BudgetResponse])
async def list_budgets(
    month: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Budget]:
    result = await db.execute(
        select(Budget).where(Budget.user_id == user.id, Budget.month == month)
    )
    return list(result.scalars().all())


@router.get("/spending", response_model=list[BudgetWithSpending])
async def list_budgets_with_spending(
    month: date = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[BudgetWithSpending]:
    # Get budgets for this month
    budget_result = await db.execute(
        select(Budget, Category).join(Category, Budget.category_id == Category.id).where(
            Budget.user_id == user.id, Budget.month == month
        )
    )
    rows = budget_result.all()

    # Calculate date range for the month
    if month.month == 12:
        next_month = date(month.year + 1, 1, 1)
    else:
        next_month = date(month.year, month.month + 1, 1)

    result = []
    for budget, category in rows:
        # Get spending for this category in this month
        spending_result = await db.execute(
            select(func.coalesce(func.sum(func.abs(Transaction.amount)), 0)).where(
                and_(
                    Transaction.user_id == user.id,
                    Transaction.category_id == budget.category_id,
                    Transaction.type == TransactionType.EXPENSE,
                    Transaction.date >= month,
                    Transaction.date < next_month,
                )
            )
        )
        spent = float(spending_result.scalar())

        result.append(
            BudgetWithSpending(
                id=budget.id,
                category_id=budget.category_id,
                category_name=category.name,
                category_icon=category.icon,
                amount=float(budget.amount),
                spent=spent,
                month=budget.month,
            )
        )

    return result


@router.patch("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: uuid.UUID,
    data: BudgetUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Budget:
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == user.id)
    )
    budget = result.scalar_one_or_none()
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(budget, field, value)
    await db.commit()
    await db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == user.id)
    )
    budget = result.scalar_one_or_none()
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found")
    await db.delete(budget)
    await db.commit()
