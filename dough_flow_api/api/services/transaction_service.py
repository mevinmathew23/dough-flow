import uuid
from datetime import date

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.transaction import Transaction, TransactionType


def build_transaction_query(
    user_id: uuid.UUID,
    account_id: uuid.UUID | None = None,
    category_id: uuid.UUID | None = None,
    type: TransactionType | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
) -> Select[tuple[Transaction]]:
    """Build a filtered, ordered query for transactions."""
    query = select(Transaction).where(Transaction.user_id == user_id)

    if account_id:
        query = query.where(Transaction.account_id == account_id)
    if category_id:
        query = query.where(Transaction.category_id == category_id)
    if type:
        query = query.where(Transaction.type == type)
    if start_date:
        query = query.where(Transaction.date >= start_date)
    if end_date:
        query = query.where(Transaction.date <= end_date)
    if search:
        query = query.where(Transaction.description.ilike(f"%{search}%"))

    return query.order_by(Transaction.date.desc(), Transaction.created_at.desc())


async def bulk_categorize_transactions(
    db: AsyncSession,
    user_id: uuid.UUID,
    transaction_ids: list[uuid.UUID],
    category_id: uuid.UUID,
) -> int:
    """Assign a category to multiple transactions. Returns count of updated rows."""
    result = await db.execute(
        select(Transaction).where(
            Transaction.id.in_(transaction_ids),
            Transaction.user_id == user_id,
        )
    )
    transactions = list(result.scalars().all())
    for txn in transactions:
        txn.category_id = category_id
    await db.commit()
    return len(transactions)
