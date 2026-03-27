import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.debt import Debt
from api.models.debt_group import DebtGroup, debt_group_members


async def create_group(db: AsyncSession, user_id: uuid.UUID, name: str) -> DebtGroup:
    """Create a new debt group for the given user.

    Args:
        db: Async database session.
        user_id: Owner's user id.
        name: Display name for the group.

    Returns:
        The newly created DebtGroup instance with debts eagerly loaded.
    """
    group = DebtGroup(user_id=user_id, name=name)
    db.add(group)
    await db.commit()
    return await get_group(db, user_id, group.id)


async def list_groups(db: AsyncSession, user_id: uuid.UUID) -> list[DebtGroup]:
    """List all debt groups belonging to the given user.

    Args:
        db: Async database session.
        user_id: Owner's user id.

    Returns:
        All DebtGroup instances for the user, ordered by creation time.
    """
    result = await db.execute(
        select(DebtGroup)
        .where(DebtGroup.user_id == user_id)
        .options(selectinload(DebtGroup.debts))
        .order_by(DebtGroup.created_at)
    )
    return list(result.scalars().all())


async def get_group(db: AsyncSession, user_id: uuid.UUID, group_id: uuid.UUID) -> DebtGroup:
    """Fetch a single debt group by id, raising ValueError if not found.

    Args:
        db: Async database session.
        user_id: Owner's user id for scoping.
        group_id: Primary key of the debt group.

    Returns:
        The matching DebtGroup instance with debts loaded.

    Raises:
        ValueError: If the group does not exist or is not owned by user.
    """
    result = await db.execute(
        select(DebtGroup)
        .where(DebtGroup.id == group_id, DebtGroup.user_id == user_id)
        .options(selectinload(DebtGroup.debts))
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise ValueError("Debt group not found")
    return group


async def update_group(
    db: AsyncSession,
    user_id: uuid.UUID,
    group_id: uuid.UUID,
    name: str | None,
) -> DebtGroup:
    """Rename a debt group.

    Args:
        db: Async database session.
        user_id: Owner's user id for scoping.
        group_id: Primary key of the debt group.
        name: New name, or None to leave unchanged.

    Returns:
        The updated DebtGroup instance.

    Raises:
        ValueError: If the group does not exist or is not owned by user.
    """
    group = await get_group(db, user_id, group_id)
    if name is not None:
        group.name = name
    await db.commit()
    return await get_group(db, user_id, group_id)


async def delete_group(db: AsyncSession, user_id: uuid.UUID, group_id: uuid.UUID) -> None:
    """Delete a debt group.

    Args:
        db: Async database session.
        user_id: Owner's user id for scoping.
        group_id: Primary key of the debt group to delete.

    Raises:
        ValueError: If the group does not exist or is not owned by user.
    """
    group = await get_group(db, user_id, group_id)
    await db.delete(group)
    await db.commit()


async def set_group_debts(
    db: AsyncSession,
    user_id: uuid.UUID,
    group_id: uuid.UUID,
    debt_ids: list[uuid.UUID],
) -> DebtGroup:
    """Replace the debt membership of a group.

    Args:
        db: Async database session.
        user_id: Owner's user id for scoping.
        group_id: Primary key of the debt group.
        debt_ids: Full list of debt ids to assign to the group.

    Returns:
        The updated DebtGroup instance with refreshed debt membership.

    Raises:
        ValueError: If the group does not exist, is not owned by user, or any
            debt_id is invalid or not owned by user.
    """
    group = await get_group(db, user_id, group_id)

    # Validate all debt_ids belong to user
    if debt_ids:
        result = await db.execute(select(Debt.id).where(Debt.id.in_(debt_ids), Debt.user_id == user_id))
        valid_ids = {row[0] for row in result.all()}
        invalid = set(debt_ids) - valid_ids
        if invalid:
            raise ValueError("Some debt IDs are invalid or not owned by user")

    # Clear existing membership
    await db.execute(delete(debt_group_members).where(debt_group_members.c.debt_group_id == group_id))

    # Add new membership
    if debt_ids:
        debt_result = await db.execute(select(Debt).where(Debt.id.in_(debt_ids), Debt.user_id == user_id))
        group.debts = list(debt_result.scalars().all())

    await db.commit()

    # Re-fetch with fresh debts relationship
    return await get_group(db, user_id, group_id)
