from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class BudgetCategoryInput(BaseModel):
    category_id: UUID
    allocated_amount: Decimal = Field(..., gt=0, decimal_places=2, max_digits=12)

class BudgetCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    total_amount: Decimal = Field(..., gt=0, decimal_places=2, max_digits=12)
    period: str = Field("MONTHLY", pattern="^(WEEKLY|MONTHLY|YEARLY)$")
    start_date: date
    end_date: date
    categories: List[BudgetCategoryInput] = []

class BudgetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    total_amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2, max_digits=12)
    period: Optional[str] = Field(None, pattern="^(WEEKLY|MONTHLY|YEARLY)$")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None
    categories: Optional[List[BudgetCategoryInput]] = None

class BudgetCategoryStatus(BaseModel):
    category_id: UUID
    category_name: str
    category_icon: Optional[str] = None
    category_color: Optional[str] = None
    allocated_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    utilization_pct: float
    status: str  # NORMAL, WARNING, EXCEEDED
    warning_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class BudgetResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    total_amount: Decimal
    period: str
    start_date: date
    end_date: date
    is_active: bool
    created_at: datetime
    total_spent: Decimal = Decimal("0.00")
    total_remaining: Decimal = Decimal("0.00")
    total_utilization_pct: float = 0.0
    overall_status: str = "NORMAL"
    categories: List[BudgetCategoryStatus] = []

    model_config = ConfigDict(from_attributes=True)
