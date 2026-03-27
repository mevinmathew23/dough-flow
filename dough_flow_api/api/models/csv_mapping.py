from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.database import Base
from api.schemas.csv_import import CategoryMappingDict

if TYPE_CHECKING:
    from api.models.user import User


class CSVMapping(Base):
    __tablename__ = "csv_mappings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    institution_name: Mapped[str] = mapped_column(String(255))
    column_mapping: Mapped[dict[str, str]] = mapped_column(JSON)
    date_format: Mapped[str] = mapped_column(String(50), default="%m/%d/%Y")
    category_mapping: Mapped[CategoryMappingDict | None] = mapped_column(JSON, nullable=True, default=None)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user: Mapped[User | None] = relationship(back_populates="csv_mappings")
