from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class IncomeBase(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2, max_digits=12)
    currency: str = Field("INR", min_length=3, max_length=3)
    source: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    income_date: date
    is_recurring: bool = False
    recurrence_period: Optional[str] = Field(None, max_length=20)

class IncomeCreate(IncomeBase):
    pass

class IncomeUpdate(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2, max_digits=12)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    source: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    income_date: Optional[date] = None
    is_recurring: Optional[bool] = None
    recurrence_period: Optional[str] = Field(None, max_length=20)

class IncomeResponse(IncomeBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class IncomeSummaryResponse(BaseModel):
    this_month_total: Decimal
    total_records: int
