from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class GoalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: str = Field("SAVINGS", max_length=50)
    target_amount: Decimal = Field(..., gt=0)
    current_amount: Decimal = Field(Decimal("0.0"), ge=0)
    target_date: date

class GoalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, max_length=50)
    target_amount: Optional[Decimal] = Field(None, gt=0)
    current_amount: Optional[Decimal] = Field(None, ge=0)
    target_date: Optional[date] = None
    status: Optional[str] = Field(None, pattern="^(ACTIVE|COMPLETED|PAUSED)$")

class GoalContribute(BaseModel):
    amount: Decimal = Field(..., gt=0)

class GoalResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    category: str
    target_amount: Decimal
    current_amount: Decimal
    target_date: date
    status: str
    progress_pct: float
    remaining_amount: Decimal
    monthly_contribution_needed: Decimal
    days_remaining: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
