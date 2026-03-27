import uuid
from datetime import date

from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.account import Account
from api.models.category import Category
from api.models.transaction import Transaction, TransactionType
from api.schemas.report import (
    CategoryComparison,
    CategorySpending,
    MonthlySummary,
    NetWorth,
    TransferPair,
)
from api.utils import first_of_next_month


def _first_of_prior_month(d: date) -> date:
    """Return the first day of the month before the given date.

    Args:
        d: Any date whose month should be decremented by one.

    Returns:
        A date representing the first day of the prior calendar month.
    """
    if d.month == 1:
        return date(d.year - 1, 12, 1)
    return date(d.year, d.month - 1, 1)


async def get_monthly_summary(
    db: AsyncSession,
    user_id: uuid.UUID,
    month: date,
) -> MonthlySummary:
    """Get income, expense, and savings for a given month.

    Args:
        db: Async database session.
        user_id: Owner's user id for scoping.
        month: First day of the target month.

    Returns:
        MonthlySummary with income, expenses, savings, rate, and payments.
    """
    next_month = first_of_next_month(month)

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

    # Total payments (debt reductions, stored as negative)
    payment_result = await db.execute(
        select(func.coalesce(func.sum(func.abs(Transaction.amount)), 0)).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.type == TransactionType.PAYMENT,
                Transaction.date >= month,
                Transaction.date < next_month,
            )
        )
    )
    payments = float(payment_result.scalar_one())

    savings = income - expenses
    savings_rate = round((savings / income) * 100, 1) if income > 0 else 0.0

    return MonthlySummary(
        month=month.isoformat(),
        income=round(income, 2),
        expenses=round(expenses, 2),
        savings=round(savings, 2),
        savings_rate=savings_rate,
        payments=round(payments, 2),
    )


async def get_category_breakdown(
    db: AsyncSession,
    user_id: uuid.UUID,
    month: date,
) -> list[CategorySpending]:
    """Get spending by category for a given month.

    Args:
        db: Async database session.
        user_id: Owner's user id for scoping.
        month: First day of the target month.

    Returns:
        List of CategorySpending ordered by total descending.
    """
    next_month = first_of_next_month(month)

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
    """Get monthly income vs expense for the last N months.

    Uses a single query grouped by month to avoid N+1 queries per month.

    Args:
        db: Async database session.
        user_id: Owner's user id for scoping.
        months: Number of calendar months to include (most recent first).

    Returns:
        List of MonthlySummary in chronological order.
    """
    today = date.today()
    start_month = date(today.year, today.month, 1)
    for _ in range(months - 1):
        start_month = _first_of_prior_month(start_month)

    end_date = first_of_next_month(date(today.year, today.month, 1))

    # SQLite-compatible month truncation; production PostgreSQL also supports strftime
    month_label = func.strftime("%Y-%m-01", Transaction.date)

    result = await db.execute(
        select(
            month_label.label("month_str"),
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.type == TransactionType.INCOME, Transaction.amount),
                        else_=0,
                    )
                ),
                0,
            ).label("income"),
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.type == TransactionType.EXPENSE, func.abs(Transaction.amount)),
                        else_=0,
                    )
                ),
                0,
            ).label("expenses"),
            func.coalesce(
                func.sum(
                    case(
                        (Transaction.type == TransactionType.PAYMENT, func.abs(Transaction.amount)),
                        else_=0,
                    )
                ),
                0,
            ).label("payments"),
        )
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.date >= start_month,
                Transaction.date < end_date,
                Transaction.type.in_([TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.PAYMENT]),
            )
        )
        .group_by(month_label)
        .order_by(month_label)
    )
    rows_by_month: dict[str, tuple[float, float, float]] = {
        row.month_str: (float(row.income), float(row.expenses), float(row.payments)) for row in result.all()
    }

    # Build full month list, filling in zeros for months with no transactions
    trend: list[MonthlySummary] = []
    current = start_month
    for _ in range(months):
        key = current.isoformat()  # "YYYY-MM-01"
        income, expenses, payments = rows_by_month.get(key, (0.0, 0.0, 0.0))
        savings = income - expenses
        savings_rate = round((savings / income) * 100, 1) if income > 0 else 0.0
        trend.append(
            MonthlySummary(
                month=key,
                income=round(income, 2),
                expenses=round(expenses, 2),
                savings=round(savings, 2),
                savings_rate=savings_rate,
                payments=round(payments, 2),
            )
        )
        current = first_of_next_month(current)

    return trend


async def get_net_worth(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> NetWorth:
    """Calculate net worth from all accounts.

    Args:
        db: Async database session.
        user_id: Owner's user id for scoping.

    Returns:
        NetWorth with total balance across all accounts.
    """
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
    """Get category spending for current month vs prior month with % change.

    Args:
        db: Async database session.
        user_id: Owner's user id for scoping.
        month: First day of the target month.

    Returns:
        List of CategoryComparison entries for all categories with current spending.
    """
    current = await get_category_breakdown(db, user_id, month)
    prior_month = _first_of_prior_month(month)
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


async def get_transfers(
    db: AsyncSession,
    user_id: uuid.UUID,
    month: date,
) -> list[TransferPair]:
    """Get transfer pairs for a given month.

    Args:
        db: Async database session.
        user_id: Owner's user id for scoping.
        month: First day of the target month.

    Returns:
        List of TransferPair entries representing matched transfer transactions.
    """
    next_month = first_of_next_month(month)

    result = await db.execute(
        select(Transaction, Account.name.label("account_name"))
        .join(Account, Transaction.account_id == Account.id)
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.type == TransactionType.TRANSFER,
                Transaction.transfer_id.is_not(None),
                Transaction.date >= month,
                Transaction.date < next_month,
            )
        )
        .order_by(Transaction.date.desc())
    )

    # Group by transfer_id to form pairs
    pairs: dict[uuid.UUID, list[tuple[Transaction, str]]] = {}
    for row in result.all():
        txn = row[0]
        account_name = row[1]
        pairs.setdefault(txn.transfer_id, []).append((txn, account_name))

    transfers = []
    for transfer_id, txn_pair in pairs.items():
        if len(txn_pair) != 2:
            continue
        # The negative amount is "from", positive is "to"
        if float(txn_pair[0][0].amount) < 0:
            from_txn, from_name = txn_pair[0]
            _, to_name = txn_pair[1]
        else:
            from_txn, from_name = txn_pair[1]
            _, to_name = txn_pair[0]

        transfers.append(
            TransferPair(
                transfer_id=transfer_id,
                date=from_txn.date.isoformat(),
                amount=abs(float(from_txn.amount)),
                from_account=from_name,
                to_account=to_name,
                description=from_txn.description,
            )
        )

    return transfers
