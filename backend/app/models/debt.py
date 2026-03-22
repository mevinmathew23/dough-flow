from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Integer, Date, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Debt(Base):
    __tablename__ = "debts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("accounts.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    original_amount: Mapped[float] = mapped_column(Numeric(12, 2))
    current_balance: Mapped[float] = mapped_column(Numeric(12, 2))
    interest_rate: Mapped[float] = mapped_column(Numeric(5, 4))
    minimum_payment: Mapped[float] = mapped_column(Numeric(12, 2))
    priority_order: Mapped[int] = mapped_column(Integer, default=0)
    target_payoff_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    account: Mapped[Account] = relationship(back_populates="debts")
    user: Mapped[User] = relationship(back_populates="debts")
