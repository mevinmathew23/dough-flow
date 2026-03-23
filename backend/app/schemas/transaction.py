import uuid
from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.transaction import TransactionSource, TransactionType


class TransactionCreate(BaseModel):
    account_id: uuid.UUID
    date: date_type
    amount: float
    description: str
    category_id: uuid.UUID | None = None
    type: TransactionType


class TransactionUpdate(BaseModel):
    date: date_type | None = None
    amount: float | None = None
    description: str | None = None
    category_id: uuid.UUID | None = None
    type: TransactionType | None = None


class TransactionResponse(BaseModel):
    id: uuid.UUID
    account_id: uuid.UUID
    user_id: uuid.UUID
    date: date_type
    amount: float
    description: str
    category_id: uuid.UUID | None
    type: TransactionType
    source: TransactionSource
    transfer_id: uuid.UUID | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BulkCategorizeRequest(BaseModel):
    transaction_ids: list[uuid.UUID]
    category_id: uuid.UUID
