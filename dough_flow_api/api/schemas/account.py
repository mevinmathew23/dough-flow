import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from api.models.account import AccountType


class AccountCreate(BaseModel):
    name: str
    type: AccountType
    institution: str
    balance: float = 0
    interest_rate: float | None = None


class AccountUpdate(BaseModel):
    name: str | None = None
    institution: str | None = None
    balance: float | None = None
    interest_rate: float | None = None


class AccountResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: AccountType
    institution: str
    balance: float
    interest_rate: float | None
    external_id: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
