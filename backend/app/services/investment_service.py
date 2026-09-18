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
    HoldingResponse, HoldingUpdate, PortfolioSummaryResponse, AssetResponse,
    WatchlistCreate, WatchlistResponse, StockSuggestion, StockSearchItem
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

    # Holding Management (Update / Delete)
    async def update_holding(self, user_id: UUID, holding_id: UUID, data: HoldingUpdate) -> HoldingResponse:
        holding = await self.repo.get_holding_by_id(holding_id, user_id)
        if not holding:
            raise NotFoundError("Investment holding not found")

        if data.quantity is not None:
            holding.quantity = data.quantity
        if data.average_buy_price is not None:
            holding.average_buy_price = data.average_buy_price
        if data.notes is not None:
            holding.notes = data.notes

        holding.total_invested = Decimal(str(round(holding.quantity * holding.average_buy_price, 2)))

        if self.session:
            await self.session.commit()
            await self.session.refresh(holding)

        # Refresh quote
        quote = await self.market_data.get_quote(holding.asset.symbol, holding.asset.asset_type)
        if quote:
            holding.asset.current_price = quote["current_price"]
            holding.asset.previous_close = quote.get("previous_close")
            holding.asset.day_change = quote.get("day_change")
            holding.asset.day_change_pct = quote.get("day_change_pct")

        curr_val = Decimal(str(round(holding.quantity * holding.asset.current_price, 2)))
        invested = holding.total_invested
        unrealized = curr_val - invested
        pct = round(float(unrealized / invested * 100), 2) if invested > 0 else 0.0
        day_pnl = Decimal(str(round(holding.quantity * (holding.asset.day_change or Decimal("0.00")), 2)))

        return HoldingResponse(
            id=holding.id,
            account_id=holding.account_id,
            account_name=holding.account.name if holding.account else "Account",
            asset=AssetResponse.model_validate(holding.asset),
            quantity=holding.quantity,
            average_buy_price=holding.average_buy_price,
            total_invested=invested,
            current_value=curr_val,
            unrealized_pnl=unrealized,
            unrealized_pnl_pct=pct,
            day_pnl=day_pnl
        )

    async def delete_holding(self, user_id: UUID, holding_id: UUID) -> bool:
        holding = await self.repo.get_holding_by_id(holding_id, user_id)
        if not holding:
            raise NotFoundError("Investment holding not found")

        res = await self.repo.delete_holding(holding)
        if self.session:
            await self.session.commit()
        return res

    # Stock Suggestions & Search
    async def get_stock_suggestions(self, category: Optional[str] = None) -> List[StockSuggestion]:
        catalog = [
            {
                "symbol": "RELIANCE.NS",
                "name": "Reliance Industries Ltd",
                "sector": "Energy & Retail",
                "category": "NIFTY 50",
                "tag": "Bluechip Leader",
                "rationale": "Conglomerate dominating telecom (Jio), retail, oil-to-chemicals, and clean energy.",
                "default_price": Decimal("2980.50"),
            },
            {
                "symbol": "TCS.NS",
                "name": "Tata Consultancy Services",
                "sector": "IT & Software",
                "category": "NIFTY 50",
                "tag": "Cash Cow",
                "rationale": "Global IT consulting powerhouse with industry-leading ROE, zero debt, and consistent dividends.",
                "default_price": Decimal("4120.00"),
            },
            {
                "symbol": "HDFCBANK.NS",
                "name": "HDFC Bank Ltd",
                "sector": "Banking & Finance",
                "category": "NIFTY 50",
                "tag": "Credit Giant",
                "rationale": "India's largest private sector bank with unparalleled branch network and premium asset quality.",
                "default_price": Decimal("1640.20"),
            },
            {
                "symbol": "INFY.NS",
                "name": "Infosys Ltd",
                "sector": "IT & Software",
                "category": "NIFTY 50",
                "tag": "Tech Growth",
                "rationale": "Enterprise AI leader with strong recurring multi-year digital transformation contracts.",
                "default_price": Decimal("1925.00"),
            },
            {
                "symbol": "LT.NS",
                "name": "Larsen & Toubro Ltd",
                "sector": "Capital Goods & Infra",
                "category": "NIFTY 50",
                "tag": "Capex Supercycle",
                "rationale": "Prime beneficiary of national infrastructure spending, defense, and international EPC projects.",
                "default_price": Decimal("3620.00"),
            },
            {
                "symbol": "BHARTIARTL.NS",
                "name": "Bharti Airtel Ltd",
                "sector": "Telecom",
                "category": "NIFTY 50",
                "tag": "ARPU Expansion",
                "rationale": "Duopoly telecom player steadily compounding ARPU, enterprise cloud data, and 5G monetisation.",
                "default_price": Decimal("1540.00"),
            },
            {
                "symbol": "ITC.NS",
                "name": "ITC Ltd",
                "sector": "FMCG & Cigarettes",
                "category": "DIVIDEND",
                "tag": "Dividend King",
                "rationale": "Exceptional free cash flows, FMCG volume expansion, and upcoming hotels business demerger.",
                "default_price": Decimal("505.00"),
            },
            {
                "symbol": "TATAMOTORS.NS",
                "name": "Tata Motors Ltd",
                "sector": "Automotive",
                "category": "NIFTY 50",
                "tag": "EV Pioneer",
                "rationale": "Leading Indian passenger EV transition and commercial vehicle profitability.",
                "default_price": Decimal("975.00"),
            },
            {
                "symbol": "ZOMATO.NS",
                "name": "Zomato Ltd",
                "sector": "Consumer Tech",
                "category": "HIGH GROWTH",
                "tag": "Hypergrowth",
                "rationale": "Blinkit quick-commerce dominance turning profitable with rapid order volume expansion.",
                "default_price": Decimal("265.00"),
            },
            {
                "symbol": "TRENT.NS",
                "name": "Trent Ltd",
                "sector": "Retail & Apparel",
                "category": "HIGH GROWTH",
                "tag": "Retail Compounding",
                "rationale": "Zudio value fashion disrupting apparel retail with industry-best inventory turns.",
                "default_price": Decimal("7100.00"),
            },
            {
                "symbol": "DIXON.NS",
                "name": "Dixon Technologies",
                "sector": "Electronics Manufacturing",
                "category": "HIGH GROWTH",
                "tag": "Make In India",
                "rationale": "Top beneficiary of Indian electronics manufacturing PLI scheme across mobiles and laptops.",
                "default_price": Decimal("12850.00"),
            },
            {
                "symbol": "TATAPOWER.NS",
                "name": "Tata Power Company Ltd",
                "sector": "Clean Energy & Utilities",
                "category": "GREEN ENERGY",
                "tag": "Solar & EV Moat",
                "rationale": "Pivoting rapidly into utility solar EPC, PM Surya Ghar rooftop solar, and EV charging network.",
                "default_price": Decimal("440.00"),
            },
            {
                "symbol": "SUZLON.NS",
                "name": "Suzlon Energy Ltd",
                "sector": "Wind Energy",
                "category": "GREEN ENERGY",
                "tag": "Turnaround Play",
                "rationale": "Debt-free balance sheet with multi-gigawatt wind turbine orderbook backed by top C&I clients.",
                "default_price": Decimal("75.50"),
            },
            {
                "symbol": "COALINDIA.NS",
                "name": "Coal India Ltd",
                "sector": "Energy & Mining",
                "category": "DIVIDEND",
                "tag": "High Yield",
                "rationale": "Monopoly producer fueling India's power grid, delivering consistent 6-8% dividend yields.",
                "default_price": Decimal("490.00"),
            },
            {
                "symbol": "SUNPHARMA.NS",
                "name": "Sun Pharmaceutical Industries",
                "sector": "Healthcare & Pharma",
                "category": "DEFENSIVE",
                "tag": "Global Specialty",
                "rationale": "India's largest pharma company with high-margin global specialty dermatology portfolio.",
                "default_price": Decimal("1830.00"),
            },
        ]

        if category and category.upper() != "ALL":
            catalog = [s for s in catalog if s["category"].upper() == category.upper()]

        results: List[StockSuggestion] = []
        for item in catalog:
            q = await self.market_data.get_quote(item["symbol"])
            price = q["current_price"] if q else item["default_price"]
            change_pct = q.get("day_change_pct") if q else Decimal("0.00")

            results.append(
                StockSuggestion(
                    symbol=item["symbol"],
                    name=item["name"],
                    exchange="NSE",
                    sector=item["sector"],
                    category=item["category"],
                    current_price=price,
                    day_change_pct=change_pct,
                    tag=item["tag"],
                    rationale=item["rationale"],
                )
            )

        return results

    async def search_stocks(self, query: str) -> List[StockSearchItem]:
        q_clean = query.strip().upper()
        if not q_clean:
            return []

        # Common symbols index
        index = [
            ("RELIANCE.NS", "Reliance Industries Ltd", "NSE"),
            ("TCS.NS", "Tata Consultancy Services Ltd", "NSE"),
            ("HDFCBANK.NS", "HDFC Bank Ltd", "NSE"),
            ("INFY.NS", "Infosys Ltd", "NSE"),
            ("ICICIBANK.NS", "ICICI Bank Ltd", "NSE"),
            ("LT.NS", "Larsen & Toubro Ltd", "NSE"),
            ("BHARTIARTL.NS", "Bharti Airtel Ltd", "NSE"),
            ("SBIN.NS", "State Bank of India", "NSE"),
            ("ITC.NS", "ITC Ltd", "NSE"),
            ("TATAMOTORS.NS", "Tata Motors Ltd", "NSE"),
            ("ZOMATO.NS", "Zomato Ltd", "NSE"),
            ("TRENT.NS", "Trent Ltd", "NSE"),
            ("DIXON.NS", "Dixon Technologies Ltd", "NSE"),
            ("TATAPOWER.NS", "Tata Power Company Ltd", "NSE"),
            ("SUZLON.NS", "Suzlon Energy Ltd", "NSE"),
            ("COALINDIA.NS", "Coal India Ltd", "NSE"),
            ("SUNPHARMA.NS", "Sun Pharmaceutical Industries Ltd", "NSE"),
            ("WIPRO.NS", "Wipro Ltd", "NSE"),
            ("HCLTECH.NS", "HCL Technologies Ltd", "NSE"),
            ("BAJFINANCE.NS", "Bajaj Finance Ltd", "NSE"),
            ("MARUTI.NS", "Maruti Suzuki India Ltd", "NSE"),
            ("ASIANPAINT.NS", "Asian Paints Ltd", "NSE"),
            ("TITAN.NS", "Titan Company Ltd", "NSE"),
            ("AXISBANK.NS", "Axis Bank Ltd", "NSE"),
            ("KOTAKBANK.NS", "Kotak Mahindra Bank Ltd", "NSE"),
            ("NTPC.NS", "NTPC Ltd", "NSE"),
            ("ONGC.NS", "Oil & Natural Gas Corporation Ltd", "NSE"),
            ("POWERGRID.NS", "Power Grid Corporation of India", "NSE"),
            ("ADANIENT.NS", "Adani Enterprises Ltd", "NSE"),
            ("ADANIPORTS.NS", "Adani Ports & SEZ Ltd", "NSE"),
        ]

        matches = [
            item for item in index
            if q_clean in item[0] or q_clean in item[1].upper()
        ]

        # If user searched an exact ticker not in the static list, also include it
        if not any(q_clean == item[0].replace(".NS", "") or q_clean == item[0] for item in matches):
            symbol = f"{q_clean}.NS" if not q_clean.endswith((".NS", ".BO", ".US")) else q_clean
            matches.append((symbol, q_clean, "NSE"))

        results: List[StockSearchItem] = []
        for symbol, name, exchange in matches[:10]:
            q = await self.market_data.get_quote(symbol)
            results.append(
                StockSearchItem(
                    symbol=symbol,
                    name=q.get("name", name) if q else name,
                    exchange=exchange,
                    asset_type="STOCK",
                    current_price=q.get("current_price") if q else None,
                    day_change_pct=q.get("day_change_pct") if q else None,
                )
            )

        return results
