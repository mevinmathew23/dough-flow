import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class DebtGroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class DebtGroupUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)


class DebtGroupResponse(BaseModel):
    id: uuid.UUID
    name: str
    debt_ids: list[uuid.UUID]
    created_at: datetime


class DebtGroupMemberUpdate(BaseModel):
    debt_ids: list[uuid.UUID]
