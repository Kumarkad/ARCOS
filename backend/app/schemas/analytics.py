from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel

class PeriodTrend(BaseModel):
    period: str  # e.g. "2026-04", "2026-05"
    total_amount: Decimal
    expense_count: int

class MerchantSpend(BaseModel):
    merchant: str
    total_amount: Decimal
    count: int

class PaymentMethodSpend(BaseModel):
    payment_method: str
    total_amount: Decimal
    percentage: float

class SpendingInsight(BaseModel):
    type: str  # anomaly, warning, tip, milestone
    title: str
    message: str
    icon: str

class CategoryBreakdownItem(BaseModel):
    category_name: str
    total_amount: Decimal
    percentage: float
    color: str
    icon: str

class DailyTrendItem(BaseModel):
    date: str
    day_label: str
    total_amount: Decimal

class SpendingAnalyticsResponse(BaseModel):
    daily_average: Decimal
    weekly_average: Decimal
    monthly_average: Decimal
    this_month_total: Decimal
    last_month_total: Decimal
    month_over_month_change_pct: float
    monthly_trends: List[PeriodTrend]
    top_merchants: List[MerchantSpend]
    payment_methods: List[PaymentMethodSpend]
    insights: List[SpendingInsight]
    category_breakdown: Optional[List[CategoryBreakdownItem]] = []
    daily_trends: Optional[List[DailyTrendItem]] = []
    period: Optional[str] = "1m"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    period_total: Optional[Decimal] = None
    period_days: Optional[int] = 30
    period_transaction_count: Optional[int] = 0

