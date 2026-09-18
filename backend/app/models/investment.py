import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import String, Numeric, Date, DateTime, Boolean, Integer, ForeignKey, Uuid, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin

class InvestmentAccount(Base, TimestampMixin):
    __tablename__ = "investment_accounts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    broker_name: Mapped[str] = mapped_column(String(100), nullable=False)
    account_type: Mapped[str] = mapped_column(String(50), default="DEMAT", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    holdings: Mapped[List["InvestmentHolding"]] = relationship("InvestmentHolding", back_populates="account", cascade="all, delete-orphan")

class InvestmentAsset(Base, TimestampMixin):
    __tablename__ = "investment_assets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    symbol: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(20), default="STOCK", nullable=False)  # STOCK, MUTUAL_FUND, ETF, SGB
    exchange: Mapped[str] = mapped_column(String(20), default="NSE", nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    current_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    previous_close: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    day_change: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    day_change_pct: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable=True)
    last_price_update: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

class InvestmentHolding(Base, TimestampMixin):
    __tablename__ = "investment_holdings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("investment_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("investment_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=Decimal("0.0000"), nullable=False)
    average_buy_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total_invested: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0.00"), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    account: Mapped["InvestmentAccount"] = relationship("InvestmentAccount", back_populates="holdings", lazy="joined")
    asset: Mapped["InvestmentAsset"] = relationship("InvestmentAsset", lazy="joined")

    __table_args__ = (
        Index("idx_holdings_user_asset", "user_id", "asset_id"),
    )

class InvestmentTransaction(Base, TimestampMixin):
    __tablename__ = "investment_transactions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("investment_accounts.id", ondelete="CASCADE"), nullable=False)
    asset_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("investment_assets.id", ondelete="CASCADE"), nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)  # BUY, SELL, DIVIDEND, SIP
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    charges: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, unique=True, nullable=True)

    # Relationships
    asset: Mapped["InvestmentAsset"] = relationship("InvestmentAsset", lazy="joined")
    account: Mapped["InvestmentAccount"] = relationship("InvestmentAccount", lazy="joined")

    __table_args__ = (
        Index("idx_inv_trans_user_date", "user_id", "transaction_date"),
    )

class WatchlistItem(Base, TimestampMixin):
    __tablename__ = "watchlist_items"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("investment_assets.id", ondelete="CASCADE"), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    target_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)

    asset: Mapped["InvestmentAsset"] = relationship("InvestmentAsset", lazy="joined")

    __table_args__ = (
        Index("idx_watchlist_user_asset", "user_id", "asset_id"),
    )

class IPOPrompt(Base, TimestampMixin):
    __tablename__ = "ipo_prompts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_content: Mapped[str] = mapped_column(Text, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    __table_args__ = (
        Index("idx_ipo_prompts_user", "user_id", "sort_order"),
    )
