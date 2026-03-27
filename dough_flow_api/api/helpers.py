import uuid
from typing import Any, Protocol, TypeVar

from fastapi import HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import Base

T = TypeVar("T", bound=Base)


class _OwnedModel(Protocol):
    id: Any
    user_id: Any


async def get_or_404(
    db: AsyncSession,
    model: type[T],
    item_id: uuid.UUID,
    user_id: uuid.UUID,
    detail: str = "Not found",
) -> T:
    """Fetch a record by id and user_id, raising 404 if not found.

    Args:
        db: Async database session.
        model: SQLAlchemy ORM model class.
        item_id: Primary key of the record.
        user_id: Owner's user id for scoping.
        detail: Error message to include in the 404 response.

    Returns:
        The ORM instance.

    Raises:
        HTTPException: 404 if the record does not exist or is not owned by user.
    """
    owned: _OwnedModel = model  # type: ignore[assignment]
    result = await db.execute(select(model).where(owned.id == item_id, owned.user_id == user_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail=detail)
    return item


async def apply_update(
    db: AsyncSession,
    item: Base,
    data: BaseModel,
) -> None:
    """Apply a partial update from a Pydantic model onto an ORM instance.

    Args:
        db: Async database session.
        item: The ORM instance to update.
        data: Pydantic model containing only the fields to change.
    """
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)


async def create_entity(
    db: AsyncSession,
    model: type[T],
    data: BaseModel,
    user_id: uuid.UUID,
    exclude_fields: set[str] | None = None,
) -> T:
    """Create an ORM instance, persist it, and return the refreshed record.

    Args:
        db: Async database session.
        model: SQLAlchemy ORM model class to instantiate.
        data: Pydantic model holding field values.
        user_id: Owner's user id to attach.
        exclude_fields: Optional set of field names to omit from the dump.

    Returns:
        The newly created and refreshed ORM instance.
    """
    item = model(
        **data.model_dump(exclude=exclude_fields),
        user_id=user_id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def delete_entity(
    db: AsyncSession,
    model: type[T],
    item_id: uuid.UUID,
    user_id: uuid.UUID,
    detail: str = "Not found",
) -> None:
    """Delete a record by id after verifying ownership, raising 404 if missing.

    Args:
        db: Async database session.
        model: SQLAlchemy ORM model class.
        item_id: Primary key of the record to delete.
        user_id: Owner's user id for scoping.
        detail: Error message to include in the 404 response.
    """
    item = await get_or_404(db, model, item_id, user_id, detail)
    await db.delete(item)
    await db.commit()
