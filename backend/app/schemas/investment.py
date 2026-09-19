from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

# Account Schemas
class AccountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    broker_name: str = Field(..., min_length=1, max_length=100)
    account_type: str = Field("DEMAT", max_length=50)

class AccountResponse(AccountCreate):
    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Asset Schemas
class AssetCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    asset_type: str = Field("STOCK", pattern="^(STOCK|MUTUAL_FUND|ETF|SGB)$")
    exchange: str = Field("NSE", max_length=20)
    current_price: Decimal = Field(..., ge=0)

class AssetResponse(BaseModel):
    id: UUID
    symbol: str
    name: str
    asset_type: str
    exchange: str
    currency: str
    current_price: Decimal
    previous_close: Optional[Decimal] = None
    day_change: Optional[Decimal] = None
    day_change_pct: Optional[Decimal] = None
    last_price_update: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# Transaction Schemas
class TransactionCreate(BaseModel):
    account_id: UUID
    symbol: str  # e.g. "RELIANCE.NS"
    name: Optional[str] = None
    asset_type: str = "STOCK"
    transaction_type: str = Field("BUY", pattern="^(BUY|SELL|DIVIDEND|SIP)$")
    quantity: Decimal = Field(..., gt=0)
    price: Decimal = Field(..., gt=0)
    charges: Decimal = Field(Decimal("0.00"), ge=0)
    transaction_date: date
    notes: Optional[str] = None
    idempotency_key: Optional[UUID] = None

class TransactionResponse(BaseModel):
    id: UUID
    user_id: UUID
    account_id: UUID
    asset_id: UUID
    transaction_type: str
    quantity: Decimal
    price: Decimal
    amount: Decimal
    charges: Decimal
    transaction_date: date
    notes: Optional[str] = None
    asset: Optional[AssetResponse] = None

    model_config = ConfigDict(from_attributes=True)

# Holding Schemas
class HoldingResponse(BaseModel):
    id: UUID
    account_id: UUID
    account_name: str
    asset: AssetResponse
    quantity: Decimal
    average_buy_price: Decimal
    total_invested: Decimal
    current_value: Decimal
    unrealized_pnl: Decimal
    unrealized_pnl_pct: float
    day_pnl: Decimal

    model_config = ConfigDict(from_attributes=True)

class HoldingUpdate(BaseModel):
    quantity: Optional[Decimal] = Field(None, gt=0)
    average_buy_price: Optional[Decimal] = Field(None, gt=0)
    notes: Optional[str] = None

class StockSuggestion(BaseModel):
    symbol: str
    name: str
    exchange: str = "NSE"
    sector: str
    category: str
    current_price: Decimal
    day_change_pct: Optional[Decimal] = None
    tag: str
    rationale: str

class StockSearchItem(BaseModel):
    symbol: str
    name: str
    exchange: str = "NSE"
    asset_type: str = "STOCK"
    current_price: Optional[Decimal] = None
    day_change_pct: Optional[Decimal] = None

class PortfolioSummaryResponse(BaseModel):
    total_current_value: Decimal
    total_invested: Decimal
    total_unrealized_pnl: Decimal
    total_unrealized_pnl_pct: float
    total_day_pnl: Decimal
    holdings: List[HoldingResponse] = []

# Watchlist Schemas
class WatchlistCreate(BaseModel):
    symbol: str
    name: Optional[str] = None
    asset_type: str = "STOCK"
    target_price: Optional[Decimal] = None
    notes: Optional[str] = None

class WatchlistResponse(BaseModel):
    id: UUID
    user_id: UUID
    asset_id: UUID
    target_price: Optional[Decimal] = None
    notes: Optional[str] = None
    created_at: datetime
    asset: AssetResponse

    model_config = ConfigDict(from_attributes=True)

# IPO Custom Prompts Schemas (User Request)
class IPOPromptCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    prompt_content: str = Field(..., min_length=10)
    is_default: bool = False

class IPOPromptUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    prompt_content: Optional[str] = Field(None, min_length=10)
    is_default: Optional[bool] = None

class IPOPromptResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    prompt_content: str
    is_default: bool
    sort_order: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class IPOAnalyzeRequest(BaseModel):
    ipo_name: str = Field(..., min_length=1)
    prompt_id: Optional[UUID] = None
    details: Optional[str] = None  # Price band, Issue size, P/E ratio, GMP, etc.

class IPOAnalyzeResponse(BaseModel):
    ipo_name: str
    used_prompt_name: str
    analysis_markdown: str

class UpcomingIPOItem(BaseModel):
    id: str
    company_name: str
    symbol_tentative: Optional[str] = None
    symbol: Optional[str] = None
    issue_size: Optional[str] = "TBA"
    fresh_issue: Optional[str] = None
    offer_for_sale: Optional[str] = None
    price_band: Optional[str] = "TBA"
    open_date: Optional[str] = "Upcoming"
    close_date: Optional[str] = "Upcoming"
    allotment_date: Optional[str] = None
    listing_date: Optional[str] = None
    status: str = "Upcoming"  # Open, Upcoming, Closed
    gmp_pct: Optional[float] = None
    expected_listing_gain: Optional[str] = None
    expected_gmp: Optional[str] = None
    lot_size: Optional[int] = 1
    retail_quota: Optional[str] = "35%"
    qib_quota: Optional[str] = "50%"
    nii_quota: Optional[str] = "15%"
    listing_exchange: Optional[str] = "BSE, NSE"
    category: Optional[str] = "Mainboard"
    sector: Optional[str] = "Mainboard Issue"
    description: Optional[str] = None

