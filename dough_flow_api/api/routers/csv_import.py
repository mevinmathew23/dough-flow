import json
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.dependencies import get_current_user
from api.models.csv_mapping import CSVMapping
from api.models.user import User
from api.schemas.csv_import import (
    CSVColumnDetectionResponse,
    CSVConfirmRequest,
    CSVConfirmResponse,
    CSVMappingResponse,
    CSVPreviewResponse,
)
from api.services.csv_import_service import build_preview_response, process_import
from api.services.csv_parser import CSVParseError, detect_columns, parse_csv

router = APIRouter(prefix="/api/csv", tags=["csv_import"])


@router.post("/detect-columns", response_model=CSVColumnDetectionResponse)
async def detect_csv_columns(
    file: UploadFile = File(...),
    _current_user: User = Depends(get_current_user),
) -> CSVColumnDetectionResponse:
    content = await file.read()
    try:
        columns = detect_columns(content)
    except CSVParseError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return CSVColumnDetectionResponse(columns=columns)


@router.post("/preview", response_model=CSVPreviewResponse)
async def preview_csv(
    file: UploadFile = File(...),
    column_mapping: str = Form(...),
    date_format: str = Form("%m/%d/%Y"),
    account_id: str | None = Form(None),
    date_tolerance_days: int = Form(5),
    mapping_id: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CSVPreviewResponse:
    content = await file.read()
    mapping = json.loads(column_mapping)

    try:
        parsed = parse_csv(content, mapping, date_format)
    except CSVParseError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return await build_preview_response(
        db=db,
        user_id=current_user.id,
        parsed=parsed,
        account_id=account_id,
        date_tolerance_days=date_tolerance_days,
        mapping_id=mapping_id,
        column_mapping=mapping,
    )


@router.post("/confirm", response_model=CSVConfirmResponse, status_code=status.HTTP_201_CREATED)
async def confirm_import(
    data: CSVConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CSVConfirmResponse:
    try:
        return await process_import(
            db=db,
            user_id=current_user.id,
            account_id=data.account_id,
            rows=data.rows,
            mapping_id=data.mapping_id,
            save_mapping=data.save_mapping,
            institution_name=data.institution_name,
            column_mapping=data.column_mapping,
            date_format=data.date_format,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e


@router.get("/mappings", response_model=list[CSVMappingResponse])
async def list_mappings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[CSVMapping]:
    result = await db.execute(
        select(CSVMapping).where(or_(CSVMapping.user_id == current_user.id, CSVMapping.user_id.is_(None)))
    )
    return list(result.scalars().all())


@router.delete("/mappings/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mapping(
    mapping_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(CSVMapping).where(CSVMapping.id == mapping_id, CSVMapping.user_id == current_user.id)
    )
    mapping = result.scalar_one_or_none()
    if mapping is None:
        raise HTTPException(status_code=404, detail="Mapping not found")
    await db.delete(mapping)
    await db.commit()
