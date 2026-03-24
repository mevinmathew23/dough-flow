import uuid
from datetime import date, timedelta
from typing import Any

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.account import Account
from api.models.transaction import Transaction
from api.schemas.csv_import import ParsedCSVRow, TransferCandidate


def _is_transfer_candidate(
    row_amount: float, row_date: date, txn_amount: float, txn_date: date, tolerance: int
) -> tuple[bool, int]:
    """Check if a parsed row and existing transaction could be a transfer pair.

    Returns (is_match, day_difference).
    """
    if abs(abs(row_amount) - abs(txn_amount)) > 0.005:
        return False, 0
    if (row_amount > 0 and txn_amount > 0) or (row_amount < 0 and txn_amount < 0):
        return False, 0
    day_diff = abs((row_date - txn_date).days)
    if day_diff > tolerance:
        return False, 0
    return True, day_diff


def _resolve_matches(
    parsed_rows: list[ParsedCSVRow],
    existing_txns: list[Any],
    date_tolerance_days: int,
) -> dict[int, TransferCandidate]:
    """Build candidates for each row, then greedily assign closest-date matches."""
    row_candidates: list[list[tuple[int, Transaction, str]]] = [[] for _ in parsed_rows]

    for i, row in enumerate(parsed_rows):
        row_date = date.fromisoformat(row.date)
        for txn_row in existing_txns:
            txn: Transaction = txn_row[0]
            account_name: str = txn_row[1]
            is_match, day_diff = _is_transfer_candidate(
                row.amount, row_date, float(txn.amount), txn.date, date_tolerance_days
            )
            if is_match:
                row_candidates[i].append((day_diff, txn, account_name))

    claimed: set[uuid.UUID] = set()
    matches: dict[int, TransferCandidate] = {}
    for i, candidates in enumerate(row_candidates):
        if not candidates:
            continue
        candidates.sort(key=lambda c: c[0])
        for _, txn, account_name in candidates:
            if txn.id in claimed:
                continue
            claimed.add(txn.id)
            matches[i] = TransferCandidate(
                transaction_id=txn.id,
                account_id=txn.account_id,
                account_name=account_name,
                date=txn.date.isoformat(),
                description=txn.description,
                amount=float(txn.amount),
            )
            break

    return matches


async def find_transfer_matches(
    parsed_rows: list[ParsedCSVRow],
    target_account_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
    date_tolerance_days: int = 5,
) -> dict[int, TransferCandidate]:
    """Find existing transactions in other accounts that match parsed CSV rows as potential transfers.

    Returns a mapping of parsed row index to its best TransferCandidate match.
    Each existing transaction can match at most one parsed row (closest date wins).
    """
    if not parsed_rows:
        return {}

    row_dates = [date.fromisoformat(r.date) for r in parsed_rows]
    min_date = min(row_dates) - timedelta(days=date_tolerance_days)
    max_date = max(row_dates) + timedelta(days=date_tolerance_days)

    result = await db.execute(
        select(Transaction, Account.name.label("account_name"))
        .join(Account, Transaction.account_id == Account.id)
        .where(
            and_(
                Transaction.user_id == user_id,
                Transaction.account_id != target_account_id,
                Transaction.transfer_id.is_(None),
                Transaction.date >= min_date,
                Transaction.date <= max_date,
            )
        )
    )
    existing_txns = result.all()

    if not existing_txns:
        return {}

    return _resolve_matches(parsed_rows, list(existing_txns), date_tolerance_days)
