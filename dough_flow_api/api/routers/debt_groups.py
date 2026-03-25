import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.dependencies import get_current_user
from api.models.user import User
from api.schemas.debt_group import (
    DebtGroupCreate,
    DebtGroupMemberUpdate,
    DebtGroupResponse,
    DebtGroupUpdate,
)
from api.services.debt_group_service import (
    create_group,
    delete_group,
    get_group,
    list_groups,
    set_group_debts,
    update_group,
)

router = APIRouter(prefix="/api/debt-groups", tags=["debt-groups"])


def _to_response(group) -> DebtGroupResponse:
    return DebtGroupResponse(
        id=group.id,
        name=group.name,
        debt_ids=[d.id for d in group.debts],
        created_at=group.created_at,
    )


@router.post("", response_model=DebtGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_debt_group(
    data: DebtGroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebtGroupResponse:
    group = await create_group(db, current_user.id, data.name)
    return DebtGroupResponse(
        id=group.id, name=group.name, debt_ids=[], created_at=group.created_at,
    )


@router.get("", response_model=list[DebtGroupResponse])
async def list_debt_groups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DebtGroupResponse]:
    groups = await list_groups(db, current_user.id)
    return [_to_response(g) for g in groups]


@router.patch("/{group_id}", response_model=DebtGroupResponse)
async def update_debt_group(
    group_id: uuid.UUID,
    data: DebtGroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebtGroupResponse:
    group = await update_group(db, current_user.id, group_id, data.name)
    return _to_response(group)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_debt_group(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await delete_group(db, current_user.id, group_id)


@router.put("/{group_id}/debts", response_model=DebtGroupResponse)
async def set_debt_group_members(
    group_id: uuid.UUID,
    data: DebtGroupMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebtGroupResponse:
    group = await set_group_debts(db, current_user.id, group_id, data.debt_ids)
    return _to_response(group)
