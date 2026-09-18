import uuid
from sqlalchemy import (
    Column,
    String,
    Numeric,
    DateTime,
    Date,
    ForeignKey,
    Uuid,
)
from sqlalchemy.sql import func
from app.db.base import Base

class Goal(Base):
    __tablename__ = "financial_goals"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), default="SAVINGS", nullable=False)  # EMERGENCY_FUND, VEHICLE, RETIREMENT, VACATION, GADGET, HOME, OTHER
    target_amount = Column(Numeric(12, 2), nullable=False)
    current_amount = Column(Numeric(12, 2), default=0.0, nullable=False)
    target_date = Column(Date, nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)  # ACTIVE, COMPLETED, PAUSED

    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)
