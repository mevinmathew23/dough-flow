import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.dependencies import get_current_user
from api.helpers import apply_update, delete_entity, get_or_404
from api.models.account import Account
from api.models.user import User
from api.schemas.account import AccountCreate, AccountResponse, AccountUpdate
from api.services.account_service import create_account_with_debt

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: AccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Account:
    return await create_account_with_debt(db, data, current_user.id)


@router.get("", response_model=list[AccountResponse])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Account]:
    result = await db.execute(select(Account).where(Account.user_id == current_user.id))
    return list(result.scalars().all())


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Account:
    return await get_or_404(db, Account, account_id, current_user.id, "Account not found")


@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: uuid.UUID,
    data: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Account:
    account = await get_or_404(db, Account, account_id, current_user.id, "Account not found")
    await apply_update(db, account, data)
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await delete_entity(db, Account, account_id, current_user.id, "Account not found")
