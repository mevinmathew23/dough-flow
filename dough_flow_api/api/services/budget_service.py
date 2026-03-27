import uuid
from datetime import date

from sqlalchemy import and_, func, literal_column, outerjoin, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.budget import Budget
from api.models.category import Category
from api.models.transaction import Transaction, TransactionType
from api.schemas.budget import BudgetWithSpending
from api.utils import first_of_next_month


async def get_budgets_with_spending(
    db: AsyncSession,
    user_id: uuid.UUID,
    month: date,
) -> list[BudgetWithSpending]:
    """Get budgets for a month with actual spending per category.

    Uses a single JOIN query with a spending subquery to avoid N+1 queries.

    Args:
        db: Async database session.
        user_id: Owner's user id for scoping.
        month: First day of the target month.

    Returns:
        List of budget records with spending totals attached.
    """
    next_month = first_of_next_month(month)

    # Build spending subquery: total abs(amount) per category_id for this user/month
    spending_subq = (
        select(
            Transaction.category_id.label("category_id"),
            func.coalesce(func.sum(func.abs(Transaction.amount)), 0).label("spent"),
        )
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.date >= month,
                Transaction.date < next_month,
            )
        )
        .group_by(Transaction.category_id)
        .subquery()
    )

    result = await db.execute(
        select(
            Budget,
            Category,
            func.coalesce(spending_subq.c.spent, 0).label("spent"),
        )
        .join(Category, Budget.category_id == Category.id)
        .outerjoin(spending_subq, Budget.category_id == spending_subq.c.category_id)
        .where(Budget.user_id == user_id, Budget.month == month)
    )
    rows = result.all()

    return [
        BudgetWithSpending(
            id=budget.id,
            category_id=budget.category_id,
            category_name=category.name,
            category_icon=category.icon,
            amount=float(budget.amount),
            spent=float(spent),
            month=budget.month,
        )
        for budget, category, spent in rows
    ]
