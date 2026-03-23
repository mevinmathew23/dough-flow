import json
import uuid
from datetime import date as date_type

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.dependencies import get_current_user
from api.models.csv_mapping import CSVMapping
from api.models.transaction import Transaction, TransactionSource, TransactionType
from api.models.user import User
from api.schemas.csv_import import (
    CSVColumnDetectionResponse,
    CSVConfirmRequest,
    CSVConfirmResponse,
    CSVMappingResponse,
    CSVPreviewResponse,
    CSVPreviewRow,
    ExistingTransaction,
)
from api.services.csv_parser import CSVParseError, detect_columns, find_duplicates, parse_csv

router = APIRouter(prefix="/api/csv", tags=["csv_import"])


@router.post("/detect-columns", response_model=CSVColumnDetectionResponse)
async def detect_csv_columns(
    file: UploadFile = File(...),
    _current_user: User = Depends(get_current_user),
) -> CSVColumnDetectionResponse:
    content = await file.read()
    try:
        columns = detect_columns(content)
    except CSVParseError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return CSVColumnDetectionResponse(columns=columns)


@router.post("/preview", response_model=CSVPreviewResponse)
async def preview_csv(
    file: UploadFile = File(...),
    column_mapping: str = Form(...),
    date_format: str = Form("%m/%d/%Y"),
    account_id: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CSVPreviewResponse:
    content = await file.read()
    mapping = json.loads(column_mapping)

    try:
        parsed = parse_csv(content, mapping, date_format)
    except CSVParseError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    # Check for duplicates against existing transactions
    duplicate_indices: list[int] = []
    if account_id:
        result = await db.execute(
            select(Transaction).where(
                Transaction.user_id == current_user.id,
                Transaction.account_id == uuid.UUID(account_id),
            )
        )
        existing = [
            ExistingTransaction(date=t.date.isoformat(), amount=float(t.amount), description=t.description)
            for t in result.scalars().all()
        ]
        duplicate_indices = find_duplicates(parsed, existing)

    rows = [
        CSVPreviewRow(
            date=row.date,
            description=row.description,
            amount=row.amount,
            category_name=row.category_name,
            is_duplicate=i in duplicate_indices,
        )
        for i, row in enumerate(parsed)
    ]

    return CSVPreviewResponse(
        columns=list(mapping.values()),
        rows=rows,
        total_rows=len(rows),
        duplicate_count=len(duplicate_indices),
    )


@router.post("/confirm", response_model=CSVConfirmResponse, status_code=status.HTTP_201_CREATED)
async def confirm_import(
    data: CSVConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CSVConfirmResponse:
    imported = 0
    skipped = 0

    for row in data.rows:
        if row.is_duplicate:
            skipped += 1
            continue

        txn_type = TransactionType.EXPENSE if row.amount < 0 else TransactionType.INCOME
        txn = Transaction(
            account_id=data.account_id,
            user_id=current_user.id,
            date=date_type.fromisoformat(row.date),
            amount=row.amount,
            description=row.description,
            type=txn_type,
            source=TransactionSource.CSV_IMPORT,
        )
        db.add(txn)
        imported += 1

    # Save mapping if requested
    if data.save_mapping and data.column_mapping and data.institution_name:
        mapping = CSVMapping(
            user_id=current_user.id,
            institution_name=data.institution_name,
            column_mapping=data.column_mapping,
            date_format=data.date_format,
        )
        db.add(mapping)

    await db.commit()

    return CSVConfirmResponse(imported_count=imported, skipped_duplicates=skipped)


@router.get("/mappings", response_model=list[CSVMappingResponse])
async def list_mappings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CSVMapping]:
    result = await db.execute(select(CSVMapping).where(CSVMapping.user_id == current_user.id))
    return list(result.scalars().all())


@router.delete("/mappings/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mapping(
    mapping_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(CSVMapping).where(CSVMapping.id == mapping_id, CSVMapping.user_id == current_user.id)
    )
    mapping = result.scalar_one_or_none()
    if mapping is None:
        raise HTTPException(status_code=404, detail="Mapping not found")
    await db.delete(mapping)
    await db.commit()
