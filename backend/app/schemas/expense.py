from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.category import CategoryResponse

class ExpenseBase(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2, max_digits=12)
    currency: str = Field("INR", min_length=3, max_length=3)
    category_id: UUID
    description: str = Field(..., min_length=1, max_length=255)
    merchant: Optional[str] = Field(None, max_length=255)
    payment_method: str = Field("UPI", max_length=50)
    expense_date: date
    notes: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    idempotency_key: Optional[UUID] = None

class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2, max_digits=12)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    category_id: Optional[UUID] = None
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    merchant: Optional[str] = Field(None, max_length=255)
    payment_method: Optional[str] = Field(None, max_length=50)
    expense_date: Optional[date] = None
    notes: Optional[str] = None

class ExpenseBulkCreate(BaseModel):
    expenses: List[ExpenseCreate]

class ExpenseResponse(ExpenseBase):
    id: UUID
    user_id: UUID
    idempotency_key: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None

    model_config = ConfigDict(from_attributes=True)

class CategorySpend(BaseModel):
    category_id: UUID
    category_name: str
    category_icon: Optional[str] = None
    category_color: Optional[str] = None
    total_amount: Decimal
    percentage: float

class ExpenseSummaryResponse(BaseModel):
    today_total: Decimal
    this_month_total: Decimal
    total_expenses_count: int
    category_breakdown: List[CategorySpend]
