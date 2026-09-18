import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import String, Numeric, Date, Boolean, ForeignKey, Uuid, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin

class RecurringExpense(Base, TimestampMixin):
    __tablename__ = "recurring_expenses"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), default="UPI", nullable=False)
    frequency: Mapped[str] = mapped_column(String(20), default="MONTHLY", nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    next_due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    auto_create: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    category: Mapped["Category"] = relationship("Category", lazy="joined")

    __table_args__ = (
        Index("idx_rec_expenses_user_active", "user_id", "is_active"),
    )
