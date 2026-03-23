import uuid
from datetime import date

from pydantic import BaseModel


class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0
    target_date: date | None = None
    icon: str = ""


class GoalUpdate(BaseModel):
    name: str | None = None
    target_amount: float | None = None
    current_amount: float | None = None
    target_date: date | None = None
    icon: str | None = None


class GoalResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    target_amount: float
    current_amount: float
    target_date: date | None
    icon: str

    model_config = {"from_attributes": True}
