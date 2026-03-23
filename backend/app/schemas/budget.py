import uuid
from datetime import date

from pydantic import BaseModel


class BudgetCreate(BaseModel):
    category_id: uuid.UUID
    amount: float
    month: date


class BudgetUpdate(BaseModel):
    amount: float | None = None


class BudgetResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    category_id: uuid.UUID
    amount: float
    month: date

    model_config = {"from_attributes": True}


class BudgetWithSpending(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    category_name: str
    category_icon: str
    amount: float
    spent: float
    month: date
