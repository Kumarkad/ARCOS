from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.investment_repo import InvestmentRepository
from app.providers.market_data import MarketDataProvider
from app.models.investment import InvestmentHolding, InvestmentTransaction
from app.schemas.investment import (
    AccountCreate, AccountResponse, TransactionCreate, TransactionResponse,
    HoldingResponse, PortfolioSummaryResponse, AssetResponse,
    WatchlistCreate, WatchlistResponse
)
from app.core.exceptions import NotFoundError, ValidationError

class InvestmentService:
    def __init__(
        self,
        repo: InvestmentRepository,
        market_data: MarketDataProvider,
        session: AsyncSession = None
    ):
        self.repo = repo
        self.market_data = market_data
        self.session = session

    # Accounts
    async def create_account(self, user_id: UUID, data: AccountCreate) -> AccountResponse:
        acc = await self.repo.create_account(user_id, data.name, data.broker_name, data.account_type)
        if self.session:
            await self.session.commit()
            await self.session.refresh(acc)
        return AccountResponse.model_validate(acc)

    async def list_accounts(self, user_id: UUID) -> List[AccountResponse]:
        accs = await self.repo.list_accounts(user_id)
        return [AccountResponse.model_validate(a) for a in accs]

    # Transactions & Holdings
    async def record_transaction(self, user_id: UUID, data: TransactionCreate) -> TransactionResponse:
        acc = await self.repo.get_account(data.account_id, user_id)
        if not acc:
            raise NotFoundError("Investment account not found")

        # Fetch live quote if available
        quote = await self.market_data.get_quote(data.symbol, data.asset_type)
        current_price = data.price
        prev_close = None
        day_change = None
        day_change_pct = None

        if quote:
            current_price = quote["current_price"]
            prev_close = quote.get("previous_close")
            day_change = quote.get("day_change")
            day_change_pct = quote.get("day_change_pct")

        asset = await self.repo.get_or_create_asset(
            symbol=data.symbol,
            name=data.name or (quote.get("name") if quote else data.symbol),
            asset_type=data.asset_type,
            current_price=current_price
        )
        if quote:
            asset.current_price = current_price
            asset.previous_close = prev_close
            asset.day_change = day_change
            asset.day_change_pct = day_change_pct
            asset.last_price_update = datetime.now(timezone.utc)

        amount = (data.quantity * data.price) + data.charges

        tx = InvestmentTransaction(
            user_id=user_id,
            account_id=data.account_id,
            asset_id=asset.id,
            transaction_type=data.transaction_type,
            quantity=data.quantity,
            price=data.price,
            amount=amount,
            charges=data.charges,
            transaction_date=data.transaction_date,
            notes=data.notes,
            idempotency_key=data.idempotency_key
        )
        await self.repo.create_transaction(tx)

        # Update Holding
        holding = await self.repo.get_holding(user_id, data.account_id, asset.id)
        if data.transaction_type in ("BUY", "SIP"):
            if holding:
                new_qty = holding.quantity + data.quantity
                new_invested = holding.total_invested + (data.quantity * data.price)
                new_avg = Decimal(str(round(new_invested / new_qty, 2))) if new_qty > 0 else data.price
                holding.quantity = new_qty
                holding.total_invested = new_invested
                holding.average_buy_price = new_avg
            else:
                holding = InvestmentHolding(
                    user_id=user_id,
                    account_id=data.account_id,
                    asset_id=asset.id,
                    quantity=data.quantity,
                    average_buy_price=data.price,
                    total_invested=data.quantity * data.price
                )
                self.repo.session.add(holding)
        elif data.transaction_type == "SELL":
            if not holding or holding.quantity < data.quantity:
                raise ValidationError("Insufficient holding quantity to sell")
            holding.quantity -= data.quantity
            holding.total_invested = holding.quantity * holding.average_buy_price

        if self.session:
            await self.session.commit()
            await self.session.refresh(tx)

        return TransactionResponse.model_validate(tx)

    async def list_transactions(self, user_id: UUID) -> List[TransactionResponse]:
        txs = await self.repo.list_transactions(user_id)
        return [TransactionResponse.model_validate(t) for t in txs]

    async def get_portfolio_summary(self, user_id: UUID) -> PortfolioSummaryResponse:
        holdings = await self.repo.list_holdings(user_id)
        holding_responses: List[HoldingResponse] = []

        total_value = Decimal("0.00")
        total_invested = Decimal("0.00")
        total_day_pnl = Decimal("0.00")

        for h in holdings:
            # Refresh price
            quote = await self.market_data.get_quote(h.asset.symbol, h.asset.asset_type)
            if quote:
                h.asset.current_price = quote["current_price"]
                h.asset.previous_close = quote.get("previous_close")
                h.asset.day_change = quote.get("day_change")
                h.asset.day_change_pct = quote.get("day_change_pct")

            curr_val = Decimal(str(round(h.quantity * h.asset.current_price, 2)))
            invested = h.total_invested
            unrealized = curr_val - invested
            pct = round(float(unrealized / invested * 100), 2) if invested > 0 else 0.0
            day_pnl = Decimal(str(round(h.quantity * (h.asset.day_change or Decimal("0.00")), 2)))

            total_value += curr_val
            total_invested += invested
            total_day_pnl += day_pnl

            holding_responses.append(
                HoldingResponse(
                    id=h.id,
                    account_id=h.account_id,
                    account_name=h.account.name if h.account else "Account",
                    asset=AssetResponse.model_validate(h.asset),
                    quantity=h.quantity,
                    average_buy_price=h.average_buy_price,
                    total_invested=invested,
                    current_value=curr_val,
                    unrealized_pnl=unrealized,
                    unrealized_pnl_pct=pct,
                    day_pnl=day_pnl
                )
            )

        total_unrealized = total_value - total_invested
        total_unrealized_pct = round(float(total_unrealized / total_invested * 100), 2) if total_invested > 0 else 0.0

        if self.session:
            await self.session.commit()

        return PortfolioSummaryResponse(
            total_current_value=total_value,
            total_invested=total_invested,
            total_unrealized_pnl=total_unrealized,
            total_unrealized_pnl_pct=total_unrealized_pct,
            total_day_pnl=total_day_pnl,
            holdings=holding_responses
        )

    # Watchlist
    async def add_to_watchlist(self, user_id: UUID, data: WatchlistCreate) -> WatchlistResponse:
        quote = await self.market_data.get_quote(data.symbol, data.asset_type)
        asset = await self.repo.get_or_create_asset(
            symbol=data.symbol,
            name=data.name or (quote.get("name") if quote else data.symbol),
            asset_type=data.asset_type,
            current_price=quote["current_price"] if quote else Decimal("0.00")
        )
        item = await self.repo.add_to_watchlist(user_id, asset.id, data.target_price)
        if self.session:
            await self.session.commit()
            await self.session.refresh(item)
        return WatchlistResponse.model_validate(item)

    async def list_watchlist(self, user_id: UUID) -> List[WatchlistResponse]:
        items = await self.repo.list_watchlist(user_id)
        # Refresh quotes
        for it in items:
            q = await self.market_data.get_quote(it.asset.symbol, it.asset.asset_type)
            if q:
                it.asset.current_price = q["current_price"]
                it.asset.day_change_pct = q.get("day_change_pct")
        if self.session:
            await self.session.commit()
        return [WatchlistResponse.model_validate(i) for i in items]

    async def remove_from_watchlist(self, user_id: UUID, item_id: UUID) -> bool:
        res = await self.repo.remove_from_watchlist(user_id, item_id)
        if self.session:
            await self.session.commit()
        return res
