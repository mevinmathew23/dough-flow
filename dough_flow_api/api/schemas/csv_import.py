import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CSVMappingCreate(BaseModel):
    institution_name: str
    column_mapping: dict[str, str]
    date_format: str = "%m/%d/%Y"


class CSVMappingResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    institution_name: str
    column_mapping: dict[str, str]
    date_format: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ParsedCSVRow(BaseModel):
    date: str
    description: str
    amount: float
    category_name: str | None = None


class ExistingTransaction(BaseModel):
    date: str
    amount: float
    description: str


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


class CSVColumnDetectionResponse(BaseModel):
    columns: list[str]


class CSVConfirmRequest(BaseModel):
    account_id: uuid.UUID
    rows: list[CSVPreviewRow]
    save_mapping: bool = False
    institution_name: str | None = None
    column_mapping: dict[str, str] | None = None
    date_format: str = "%m/%d/%Y"


class CSVConfirmResponse(BaseModel):
    imported_count: int
    skipped_duplicates: int
