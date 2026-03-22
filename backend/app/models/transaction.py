import enum
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import String, Date, DateTime, Numeric, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"


class TransactionSource(str, enum.Enum):
    MANUAL = "manual"
    CSV_IMPORT = "csv_import"
    PLAID = "plaid"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("accounts.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    description: Mapped[str] = mapped_column(String(500))
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType))
    source: Mapped[TransactionSource] = mapped_column(Enum(TransactionSource), default=TransactionSource.MANUAL)
    transfer_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    account = relationship("Account", back_populates="transactions")
    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
