import uuid
from datetime import date

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction, TransactionType
from app.schemas.report import CategoryComparison, CategorySpending, MonthlySummary, NetWorth


async def get_monthly_summary(
    db: AsyncSession,
    user_id: uuid.UUID,
    month: date,
) -> MonthlySummary:
    """Get income, expense, and savings for a given month."""
    if month.month == 12:
        next_month = date(month.year + 1, 1, 1)
    else:
        next_month = date(month.year, month.month + 1, 1)

    # Total income
    income_result = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.type == TransactionType.INCOME,
                Transaction.date >= month,
                Transaction.date < next_month,
            )
        )
    )
    income = float(income_result.scalar_one())

    # Total expenses (stored as negative, so we abs)
    expense_result = await db.execute(
        select(func.coalesce(func.sum(func.abs(Transaction.amount)), 0)).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.date >= month,
                Transaction.date < next_month,
            )
        )
    )
    expenses = float(expense_result.scalar_one())

    savings = income - expenses
    savings_rate = round((savings / income) * 100, 1) if income > 0 else 0.0

    return MonthlySummary(
        month=month.isoformat(),
        income=round(income, 2),
        expenses=round(expenses, 2),
        savings=round(savings, 2),
        savings_rate=savings_rate,
    )


async def get_category_breakdown(
    db: AsyncSession,
    user_id: uuid.UUID,
    month: date,
) -> list[CategorySpending]:
    """Get spending by category for a given month."""
    if month.month == 12:
        next_month = date(month.year + 1, 1, 1)
    else:
        next_month = date(month.year, month.month + 1, 1)

    result = await db.execute(
        select(
            Category.id,
            Category.name,
            Category.icon,
            func.sum(func.abs(Transaction.amount)).label("total"),
        )
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.date >= month,
                Transaction.date < next_month,
            )
        )
        .group_by(Category.id, Category.name, Category.icon)
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
    )

    return [
        CategorySpending(
            category_id=row.id,
            category_name=row.name,
            category_icon=row.icon,
            total=round(float(row.total), 2),
        )
        for row in result.all()
    ]


async def get_income_vs_expense_trend(
    db: AsyncSession,
    user_id: uuid.UUID,
    months: int = 6,
) -> list[MonthlySummary]:
    """Get monthly income vs expense for the last N months."""
    today = date.today()
    # Start from the first day of (months-1) months ago
    start_month = date(today.year, today.month, 1)
    for _ in range(months - 1):
        if start_month.month == 1:
            start_month = date(start_month.year - 1, 12, 1)
        else:
            start_month = date(start_month.year, start_month.month - 1, 1)

    trend = []
    current = start_month
    for _ in range(months):
        summary = await get_monthly_summary(db, user_id, current)
        trend.append(summary)
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)

    return trend


async def get_net_worth(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> NetWorth:
    """Calculate net worth from all accounts."""
    result = await db.execute(
        select(
            func.coalesce(func.sum(Account.balance), 0),
        ).where(Account.user_id == user_id)
    )
    total = float(result.scalar_one())
    return NetWorth(net_worth=round(total, 2))


async def get_category_comparison(
    db: AsyncSession,
    user_id: uuid.UUID,
    month: date,
) -> list[CategoryComparison]:
    """Get category spending for current month vs prior month with % change."""
    current = await get_category_breakdown(db, user_id, month)

    # Calculate prior month
    if month.month == 1:
        prior_month = date(month.year - 1, 12, 1)
    else:
        prior_month = date(month.year, month.month - 1, 1)
    prior = await get_category_breakdown(db, user_id, prior_month)

    prior_map = {item.category_id: item.total for item in prior}

    result = []
    for item in current:
        prior_total = prior_map.get(item.category_id, 0.0)
        pct_change = round(((item.total - prior_total) / prior_total) * 100, 1) if prior_total > 0 else 0.0
        result.append(
            CategoryComparison(
                category_id=item.category_id,
                category_name=item.category_name,
                category_icon=item.category_icon,
                total=item.total,
                prior_total=prior_total,
                pct_change=pct_change,
            )
        )
    return result
