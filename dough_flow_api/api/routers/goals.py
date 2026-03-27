import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.dependencies import get_current_user
from api.helpers import apply_update, create_entity, delete_entity, get_or_404
from api.models.goal import Goal
from api.models.user import User
from api.schemas.goal import GoalCreate, GoalResponse, GoalUpdate

router = APIRouter(prefix="/api/goals", tags=["goals"])


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    data: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Goal:
    return await create_entity(db, Goal, data, current_user.id)


@router.get("", response_model=list[GoalResponse])
async def list_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Goal]:
    result = await db.execute(select(Goal).where(Goal.user_id == current_user.id))
    return list(result.scalars().all())


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Goal:
    return await get_or_404(db, Goal, goal_id, current_user.id, "Goal not found")


@router.patch("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: uuid.UUID,
    data: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Goal:
    goal = await get_or_404(db, Goal, goal_id, current_user.id, "Goal not found")
    await apply_update(db, goal, data)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await delete_entity(db, Goal, goal_id, current_user.id, "Goal not found")
