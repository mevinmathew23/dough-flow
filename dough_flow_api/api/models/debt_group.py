from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, DateTime, ForeignKey, String, Table, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.database import Base

if TYPE_CHECKING:
    from api.models.debt import Debt
    from api.models.user import User

debt_group_members = Table(
    "debt_group_members",
    Base.metadata,
    Column("debt_group_id", ForeignKey("debt_groups.id", ondelete="CASCADE"), primary_key=True),
    Column("debt_id", ForeignKey("debts.id", ondelete="CASCADE"), primary_key=True),
)


class DebtGroup(Base):
    __tablename__ = "debt_groups"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship()
    debts: Mapped[list[Debt]] = relationship(secondary=debt_group_members)
