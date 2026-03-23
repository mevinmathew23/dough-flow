from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.database import Base

if TYPE_CHECKING:
    from api.models.user import User


class CSVMapping(Base):
    __tablename__ = "csv_mappings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    institution_name: Mapped[str] = mapped_column(String(255))
    column_mapping: Mapped[dict[str, str]] = mapped_column(JSON)
    date_format: Mapped[str] = mapped_column(String(50), default="%m/%d/%Y")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user: Mapped[User] = relationship(back_populates="csv_mappings")
