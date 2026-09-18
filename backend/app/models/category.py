import uuid
from sqlalchemy import String, Boolean, ForeignKey, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TimestampMixin

class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str] = mapped_column(String(10), nullable=True)
    color: Mapped[str] = mapped_column(String(7), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    type: Mapped[str] = mapped_column(String(20), default="expense")

    __table_args__ = (
        UniqueConstraint("user_id", "name", "type", name="uq_category_user_name_type"),
    )
