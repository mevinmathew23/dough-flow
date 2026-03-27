import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.dependencies import get_current_user
from api.helpers import apply_update, delete_entity, get_or_404
from api.models.account import Account
from api.models.transaction import Transaction, TransactionType
from api.models.user import User
from api.schemas.transaction import (
    BulkCategorizeRequest,
    BulkCategorizeResponse,
    BulkDeleteRequest,
    BulkDeleteResponse,
    BulkUpdateTypeRequest,
    BulkUpdateTypeResponse,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)
from api.services.transaction_service import (
    build_transaction_query,
    bulk_categorize_transactions,
    bulk_delete_transactions,
    bulk_update_type,
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    # Verify account belongs to current user
    acct_result = await db.execute(
        select(Account).where(Account.id == data.account_id, Account.user_id == current_user.id)
    )
    if acct_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account not owned by user")

    txn = Transaction(**data.model_dump(), user_id=current_user.id)
    db.add(txn)
    await db.commit()
    await db.refresh(txn)
    return txn


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    account_id: uuid.UUID | None = Query(None),
    category_id: uuid.UUID | None = Query(None),
    type: TransactionType | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    search: str | None = Query(None),
) -> list[Transaction]:
    query = build_transaction_query(
        user_id=current_user.id,
        account_id=account_id,
        category_id=category_id,
        type=type,
        start_date=start_date,
        end_date=end_date,
        search=search,
    )
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    return await get_or_404(db, Transaction, transaction_id, current_user.id, "Transaction not found")


@router.patch("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: uuid.UUID,
    data: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Transaction:
    txn = await get_or_404(db, Transaction, transaction_id, current_user.id, "Transaction not found")
    await apply_update(db, txn, data)
    return txn


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await delete_entity(db, Transaction, transaction_id, current_user.id, "Transaction not found")


@router.post("/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete(
    data: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BulkDeleteResponse:
    deleted_count = await bulk_delete_transactions(db, current_user.id, data.transaction_ids)
    return BulkDeleteResponse(deleted_count=deleted_count)


@router.post("/bulk-categorize", response_model=BulkCategorizeResponse)
async def bulk_categorize(
    data: BulkCategorizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BulkCategorizeResponse:
    try:
        updated_count = await bulk_categorize_transactions(db, current_user.id, data.transaction_ids, data.category_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return BulkCategorizeResponse(updated_count=updated_count)


@router.post("/bulk-update-type", response_model=BulkUpdateTypeResponse)
async def bulk_update_type_endpoint(
    data: BulkUpdateTypeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BulkUpdateTypeResponse:
    updated_count = await bulk_update_type(db, current_user.id, data.transaction_ids, data.type)
    return BulkUpdateTypeResponse(updated_count=updated_count)
