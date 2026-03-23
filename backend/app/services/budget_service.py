import uuid
from datetime import date

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction, TransactionType
from app.schemas.budget import BudgetWithSpending


async def get_budgets_with_spending(
    db: AsyncSession,
    user_id: uuid.UUID,
    month: date,
) -> list[BudgetWithSpending]:
    """Get budgets for a month with actual spending per category."""
    budget_result = await db.execute(
        select(Budget, Category)
        .join(Category, Budget.category_id == Category.id)
        .where(Budget.user_id == user_id, Budget.month == month)
    )
    rows = budget_result.all()

    if month.month == 12:
        next_month = date(month.year + 1, 1, 1)
    else:
        next_month = date(month.year, month.month + 1, 1)

    result = []
    for budget, category in rows:
        spending_result = await db.execute(
            select(func.coalesce(func.sum(func.abs(Transaction.amount)), 0)).where(
                and_(
                    Transaction.user_id == user_id,
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
