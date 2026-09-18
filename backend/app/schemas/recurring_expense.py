from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.category import CategoryResponse

class RecurringExpenseBase(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2, max_digits=12)
    currency: str = Field("INR", min_length=3, max_length=3)
    category_id: UUID
    description: str = Field(..., min_length=1, max_length=255)
    payment_method: str = Field("UPI", max_length=50)
    frequency: str = Field("MONTHLY", pattern="^(DAILY|WEEKLY|MONTHLY|YEARLY)$")
    start_date: date
    next_due_date: date
    is_active: bool = True
    auto_create: bool = False

class RecurringExpenseCreate(RecurringExpenseBase):
    pass

class RecurringExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2, max_digits=12)
    category_id: Optional[UUID] = None
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    payment_method: Optional[str] = None
    frequency: Optional[str] = Field(None, pattern="^(DAILY|WEEKLY|MONTHLY|YEARLY)$")
    next_due_date: Optional[date] = None
    is_active: Optional[bool] = None
    auto_create: Optional[bool] = None

class RecurringExpenseResponse(RecurringExpenseBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None

    model_config = ConfigDict(from_attributes=True)
