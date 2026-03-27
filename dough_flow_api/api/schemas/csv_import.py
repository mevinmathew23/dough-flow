import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

from api.services.category_resolver import CategoryMappingDict


class CategoryMappingEntry(BaseModel):
    source: str
    target: str


class InstitutionCategoryMapping(BaseModel):
    entries: list[CategoryMappingEntry]


class CSVMappingCreate(BaseModel):
    institution_name: str
    column_mapping: dict[str, str]
    date_format: str = "%m/%d/%Y"


class CSVMappingResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    institution_name: str
    column_mapping: dict[str, str]
    date_format: str
    category_mapping: InstitutionCategoryMapping | None = None
    is_default: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("category_mapping", mode="before")
    @classmethod
    def parse_category_mapping(
        cls, v: CategoryMappingDict | InstitutionCategoryMapping | None
    ) -> InstitutionCategoryMapping | None:
        if v is None:
            return None
        if isinstance(v, dict):
            entries = [CategoryMappingEntry(**e) for e in v.get("entries", [])]
            return InstitutionCategoryMapping(entries=entries)
        return v


class ParsedCSVRow(BaseModel):
    date: str
    description: str
    amount: float
    category_name: str | None = None


class ExistingTransaction(BaseModel):
    date: str
    amount: float
    description: str


class TransferCandidate(BaseModel):
    transaction_id: uuid.UUID
    account_id: uuid.UUID
    account_name: str
    date: str
    description: str
    amount: float


class CSVPreviewRow(BaseModel):
    date: str
    description: str
    amount: float
    category_name: str | None = None
    resolved_category_name: str | None = None
    match_method: Literal["exact", "institution", "fuzzy", "unmatched"] | None = None
    confidence: float | None = None
    is_duplicate: bool = False
    transfer_match: TransferCandidate | None = None
    link_transfer_id: uuid.UUID | None = None


class CSVPreviewResponse(BaseModel):
    columns: list[str]
    rows: list[CSVPreviewRow]
    total_rows: int
    duplicate_count: int
    transfer_match_count: int = 0


class CSVColumnDetectionResponse(BaseModel):
    columns: list[str]


class CSVConfirmRequest(BaseModel):
    account_id: uuid.UUID
    rows: list[CSVPreviewRow]
    save_mapping: bool = False
    institution_name: str | None = None
    column_mapping: dict[str, str] | None = None
    date_format: str = "%m/%d/%Y"
    mapping_id: uuid.UUID | None = None


class CSVConfirmResponse(BaseModel):
    imported_count: int
    skipped_duplicates: int
