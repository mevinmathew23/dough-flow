import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DebtGroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class DebtGroupUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)


class DebtGroupResponse(BaseModel):
    id: uuid.UUID
    name: str
    debt_ids: list[uuid.UUID]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extract_debt_ids(cls, data: Any) -> Any:
        if hasattr(data, "debts"):
            data = {
                "id": data.id,
                "name": data.name,
                "debt_ids": [d.id for d in data.debts],
                "created_at": data.created_at,
            }
        return data


class DebtGroupMemberUpdate(BaseModel):
    debt_ids: list[uuid.UUID]
