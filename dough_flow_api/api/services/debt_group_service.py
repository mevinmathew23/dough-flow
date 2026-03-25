import uuid

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.debt import Debt
from api.models.debt_group import DebtGroup, debt_group_members


async def create_group(db: AsyncSession, user_id: uuid.UUID, name: str) -> DebtGroup:
    group = DebtGroup(user_id=user_id, name=name)
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


async def list_groups(db: AsyncSession, user_id: uuid.UUID) -> list[DebtGroup]:
    result = await db.execute(
        select(DebtGroup)
        .where(DebtGroup.user_id == user_id)
        .options(selectinload(DebtGroup.debts))
        .order_by(DebtGroup.created_at)
    )
    return list(result.scalars().all())


async def get_group(db: AsyncSession, user_id: uuid.UUID, group_id: uuid.UUID) -> DebtGroup:
    result = await db.execute(
        select(DebtGroup)
        .where(DebtGroup.id == group_id, DebtGroup.user_id == user_id)
        .options(selectinload(DebtGroup.debts))
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=404, detail="Debt group not found")
    return group


async def update_group(
    db: AsyncSession, user_id: uuid.UUID, group_id: uuid.UUID, name: str | None,
) -> DebtGroup:
    group = await get_group(db, user_id, group_id)
    if name is not None:
        group.name = name
    await db.commit()
    return await get_group(db, user_id, group_id)


async def delete_group(db: AsyncSession, user_id: uuid.UUID, group_id: uuid.UUID) -> None:
    group = await get_group(db, user_id, group_id)
    await db.delete(group)
    await db.commit()


async def set_group_debts(
    db: AsyncSession, user_id: uuid.UUID, group_id: uuid.UUID, debt_ids: list[uuid.UUID],
) -> DebtGroup:
    group = await get_group(db, user_id, group_id)

    # Validate all debt_ids belong to user
    if debt_ids:
        result = await db.execute(
            select(Debt.id).where(Debt.id.in_(debt_ids), Debt.user_id == user_id)
        )
        valid_ids = {row[0] for row in result.all()}
        invalid = set(debt_ids) - valid_ids
        if invalid:
            raise HTTPException(status_code=400, detail="Some debt IDs are invalid or not owned by user")

    # Clear existing membership
    await db.execute(
        delete(debt_group_members).where(debt_group_members.c.debt_group_id == group_id)
    )

    # Add new membership
    if debt_ids:
        result = await db.execute(
            select(Debt).where(Debt.id.in_(debt_ids), Debt.user_id == user_id)
        )
        group.debts = list(result.scalars().all())

    await db.commit()

    # Re-fetch with fresh debts relationship
    return await get_group(db, user_id, group_id)
