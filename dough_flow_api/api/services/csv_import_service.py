import uuid
from datetime import date as date_type
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from api.models.account import Account
from api.models.category import Category
from api.models.csv_mapping import CSVMapping
from api.models.transaction import Transaction, TransactionSource, TransactionType
from api.schemas.csv_import import (
    CategoryMappingEntryDict,
    CSVConfirmResponse,
    CSVPreviewResponse,
    CSVPreviewRow,
    ExistingTransaction,
    TransferCandidate,
)
from api.services.category_resolver import resolve_category
from api.services.csv_parser import find_duplicates
from api.services.transfer_matcher import find_transfer_matches


async def build_preview_response(
    db: AsyncSession,
    user_id: uuid.UUID,
    parsed: list[Any],
    account_id: str | None,
    date_tolerance_days: int,
    mapping_id: str | None,
    column_mapping: dict[str, str],
) -> CSVPreviewResponse:
    """Build the CSV preview response by detecting duplicates, transfers, and resolving categories.

    Args:
        db: Async database session.
        user_id: Owner's user id for scoping all queries.
        parsed: List of ParsedCSVRow instances from the CSV parser.
        account_id: Optional account UUID string to scope duplicate and transfer checks.
        date_tolerance_days: Number of days tolerance for transfer matching.
        mapping_id: Optional UUID string of a saved CSVMapping to load category overrides from.
        column_mapping: Parsed column mapping dict used to populate the response columns list.

    Returns:
        CSVPreviewResponse with annotated rows ready for client review.
    """
    duplicate_indices: list[int] = []
    if account_id:
        result = await db.execute(
            select(Transaction).where(
                Transaction.user_id == user_id,
                Transaction.account_id == uuid.UUID(account_id),
            )
        )
        existing = [
            ExistingTransaction(
                date=t.date.isoformat(),
                amount=float(t.amount),
                description=t.description,
            )
            for t in result.scalars().all()
        ]
        duplicate_indices = find_duplicates(parsed, existing)

    transfer_matches: dict[int, TransferCandidate] = {}
    if account_id:
        transfer_matches = await find_transfer_matches(
            parsed_rows=parsed,
            target_account_id=uuid.UUID(account_id),
            user_id=user_id,
            db=db,
            date_tolerance_days=date_tolerance_days,
        )

    institution_entries: list[CategoryMappingEntryDict] = []
    if mapping_id:
        mapping_result = await db.execute(select(CSVMapping).where(CSVMapping.id == uuid.UUID(mapping_id)))
        mapping_obj = mapping_result.scalar_one_or_none()
        if mapping_obj and mapping_obj.category_mapping:
            institution_entries = [
                CategoryMappingEntryDict(source=e["source"], target=e["target"])
                for e in mapping_obj.category_mapping.get("entries", [])
            ]

    cat_result = await db.execute(select(Category).where(or_(Category.user_id == user_id, Category.user_id.is_(None))))
    category_names = [c.name for c in cat_result.scalars().all()]

    rows = []
    for i, row in enumerate(parsed):
        match = resolve_category(row.category_name, category_names, institution_entries)
        rows.append(
            CSVPreviewRow(
                date=row.date,
                description=row.description,
                amount=row.amount,
                category_name=row.category_name,
                resolved_category_name=match.resolved_name,
                match_method=match.method,
                confidence=match.confidence,
                is_duplicate=i in duplicate_indices,
                transfer_match=transfer_matches.get(i),
            )
        )

    return CSVPreviewResponse(
        columns=list(column_mapping.values()),
        rows=rows,
        total_rows=len(rows),
        duplicate_count=len(duplicate_indices),
        transfer_match_count=len(transfer_matches),
    )


async def process_import(
    db: AsyncSession,
    user_id: uuid.UUID,
    account_id: uuid.UUID,
    rows: list[CSVPreviewRow],
    mapping_id: uuid.UUID | None,
    save_mapping: bool,
    institution_name: str | None,
    column_mapping: dict[str, str] | None,
    date_format: str,
) -> CSVConfirmResponse:
    """Persist confirmed CSV rows as transactions and optionally save/update the mapping.

    Skips rows marked as duplicates. Handles transfer linking and auto-saves
    category overrides back to the institution mapping when applicable.

    Args:
        db: Async database session.
        user_id: Owner's user id.
        account_id: Target account UUID. Must belong to user_id.
        rows: Preview rows from the client, with resolution decisions applied.
        mapping_id: Optional existing mapping to update with new category overrides.
        save_mapping: When True and institution_name/column_mapping are provided,
            persist a new mapping.
        institution_name: Institution name for saving a new mapping.
        column_mapping: Column mapping dict for saving a new mapping.
        date_format: Date format string for saving a new mapping.

    Returns:
        CSVConfirmResponse with counts of imported and skipped rows.

    Raises:
        ValueError: If the account does not belong to the current user.
    """
    acct_result = await db.execute(select(Account).where(Account.id == account_id, Account.user_id == user_id))
    if acct_result.scalar_one_or_none() is None:
        raise ValueError("Account not owned by user")

    cat_result = await db.execute(select(Category).where(or_(Category.user_id == user_id, Category.user_id.is_(None))))
    category_by_name: dict[str, uuid.UUID] = {cat.name.lower(): cat.id for cat in cat_result.scalars().all()}

    imported = 0
    skipped = 0

    for row in rows:
        if row.is_duplicate:
            skipped += 1
            continue

        effective_category = row.resolved_category_name or row.category_name
        resolved_category_id = category_by_name.get(effective_category.lower()) if effective_category else None

        if row.link_transfer_id:
            shared_transfer_id = uuid.uuid4()
            txn = Transaction(
                account_id=account_id,
                user_id=user_id,
                date=date_type.fromisoformat(row.date),
                amount=row.amount,
                description=row.description,
                type=TransactionType.TRANSFER,
                source=TransactionSource.CSV_IMPORT,
                transfer_id=shared_transfer_id,
                category_id=resolved_category_id,
            )
            db.add(txn)

            result = await db.execute(
                select(Transaction).where(
                    Transaction.id == row.link_transfer_id,
                    Transaction.user_id == user_id,
                )
            )
            existing_txn = result.scalar_one_or_none()
            if existing_txn:
                existing_txn.type = TransactionType.TRANSFER
                existing_txn.transfer_id = shared_transfer_id
        else:
            txn_type = TransactionType.EXPENSE if row.amount < 0 else TransactionType.INCOME
            txn = Transaction(
                account_id=account_id,
                user_id=user_id,
                date=date_type.fromisoformat(row.date),
                amount=row.amount,
                description=row.description,
                type=txn_type,
                source=TransactionSource.CSV_IMPORT,
                category_id=resolved_category_id,
            )
            db.add(txn)
        imported += 1

    if mapping_id:
        await _apply_category_overrides(db, user_id, rows, mapping_id)

    if save_mapping and column_mapping and institution_name:
        new_mapping = CSVMapping(
            user_id=user_id,
            institution_name=institution_name,
            column_mapping=column_mapping,
            date_format=date_format,
        )
        db.add(new_mapping)

    await db.commit()

    return CSVConfirmResponse(imported_count=imported, skipped_duplicates=skipped)


async def _apply_category_overrides(
    db: AsyncSession,
    user_id: uuid.UUID,
    rows: list[CSVPreviewRow],
    mapping_id: uuid.UUID,
) -> None:
    """Merge category resolution overrides back into the saved institution mapping.

    Fuzzy and unmatched resolutions that differ from the original CSV category are
    persisted as new source->target entries, deduplicating by source key. For default
    (shared) mappings a new user-specific mapping is forked instead of mutating the
    original.

    Args:
        db: Async database session.
        user_id: Owner's user id, used when forking a default mapping.
        rows: Preview rows containing match_method and category resolution decisions.
        mapping_id: UUID of the mapping to update.
    """
    overrides: list[CategoryMappingEntryDict] = []
    for row in rows:
        if (
            row.category_name
            and row.resolved_category_name
            and row.category_name.lower() != row.resolved_category_name.lower()
            and row.match_method in ("fuzzy", "unmatched")
        ):
            overrides.append(
                CategoryMappingEntryDict(
                    source=row.category_name,
                    target=row.resolved_category_name,
                )
            )

    # Deduplicate overrides (last wins per source)
    seen: dict[str, CategoryMappingEntryDict] = {}
    for override in overrides:
        seen[override["source"].lower()] = override
    unique_overrides = list(seen.values())

    if not unique_overrides:
        return

    mapping_result = await db.execute(select(CSVMapping).where(CSVMapping.id == mapping_id))
    mapping_obj = mapping_result.scalar_one_or_none()
    if not mapping_obj:
        return

    if mapping_obj.is_default:
        existing_entries = list(mapping_obj.category_mapping.get("entries", []) if mapping_obj.category_mapping else [])
        merged: dict[str, CategoryMappingEntryDict] = {
            e["source"].lower(): CategoryMappingEntryDict(source=e["source"], target=e["target"])
            for e in existing_entries
        }
        for override in unique_overrides:
            merged[override["source"].lower()] = override
        forked = CSVMapping(
            user_id=user_id,
            institution_name=mapping_obj.institution_name,
            column_mapping=mapping_obj.column_mapping,
            date_format=mapping_obj.date_format,
            category_mapping={"entries": list(merged.values())},
            is_default=False,
        )
        db.add(forked)
    else:
        existing = mapping_obj.category_mapping or {"entries": []}
        existing_entries = list(existing.get("entries", []))
        existing_sources = {e["source"].lower(): i for i, e in enumerate(existing_entries)}
        for override in unique_overrides:
            source_lower = override["source"].lower()
            if source_lower in existing_sources:
                existing_entries[existing_sources[source_lower]] = override
            else:
                existing_entries.append(override)
        mapping_obj.category_mapping = {"entries": existing_entries}
        flag_modified(mapping_obj, "category_mapping")
