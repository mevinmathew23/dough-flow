import uuid
from datetime import datetime

from pydantic import BaseModel


class CSVMappingCreate(BaseModel):
    institution_name: str
    column_mapping: dict
    date_format: str = "%m/%d/%Y"


class CSVMappingResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    institution_name: str
    column_mapping: dict
    date_format: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CSVPreviewRow(BaseModel):
    date: str
    description: str
    amount: float
    category_name: str | None = None
    is_duplicate: bool = False


class CSVPreviewResponse(BaseModel):
    columns: list[str]
    rows: list[CSVPreviewRow]
    total_rows: int
    duplicate_count: int


class CSVConfirmRequest(BaseModel):
    account_id: uuid.UUID
    rows: list[CSVPreviewRow]
    save_mapping: bool = False
    institution_name: str | None = None
    column_mapping: dict | None = None
    date_format: str = "%m/%d/%Y"


class CSVConfirmResponse(BaseModel):
    imported_count: int
    skipped_duplicates: int
