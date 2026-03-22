from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Date, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"), index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    month: Mapped[date] = mapped_column(Date)

    user: Mapped[User] = relationship(back_populates="budgets")
    category: Mapped[Category] = relationship(back_populates="budgets")
