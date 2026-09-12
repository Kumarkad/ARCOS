import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.investment_repo import InvestmentRepository
from app.providers.market_data import MarketDataProvider
from app.providers.llm_provider import LLMProvider
from app.services.investment_service import InvestmentService
from app.services.ipo_service import IPOService
from app.schemas.investment import (
    AccountCreate, TransactionCreate, WatchlistCreate,
    HoldingUpdate, IPOPromptCreate, IPOPromptUpdate, IPOAnalyzeRequest
)

@pytest.mark.asyncio
async def test_investment_portfolio_and_transactions(db_session: AsyncSession, test_user):
    repo = InvestmentRepository(db_session)
    market_data = MarketDataProvider()
    service = InvestmentService(repo, market_data, session=db_session)

    # 1. Create Demat Account
    acc = await service.create_account(
        test_user.id,
        AccountCreate(name="Zerodha Kite", broker_name="Zerodha", account_type="DEMAT")
    )
    assert acc.name == "Zerodha Kite"

    # 2. Buy 10 shares of RELIANCE at ₹2,500
    tx1 = await service.record_transaction(
        test_user.id,
        TransactionCreate(
            account_id=acc.id,
            symbol="RELIANCE.NS",
            name="Reliance Industries Ltd",
            asset_type="STOCK",
            transaction_type="BUY",
            quantity=Decimal("10"),
            price=Decimal("2500.00"),
            charges=Decimal("20.00"),
            transaction_date=date.today()
        )
    )
    assert tx1.quantity == Decimal("10")
    assert tx1.amount == Decimal("25020.00")

    # Verify holding
    summary1 = await service.get_portfolio_summary(test_user.id)
    assert len(summary1.holdings) == 1
    h1 = summary1.holdings[0]
    assert h1.quantity == Decimal("10")
    assert h1.average_buy_price == Decimal("2500.00")
    assert h1.total_invested == Decimal("25000.00")

    # 3. Buy another 10 shares of RELIANCE at ₹2,700 -> weighted avg price should be ₹2,600
    await service.record_transaction(
        test_user.id,
        TransactionCreate(
            account_id=acc.id,
            symbol="RELIANCE.NS",
            asset_type="STOCK",
            transaction_type="BUY",
            quantity=Decimal("10"),
            price=Decimal("2700.00"),
            charges=Decimal("20.00"),
            transaction_date=date.today()
        )
    )

    summary2 = await service.get_portfolio_summary(test_user.id)
    h2 = summary2.holdings[0]
    assert h2.quantity == Decimal("20")
    assert h2.average_buy_price == Decimal("2600.00")
    assert h2.total_invested == Decimal("52000.00")

    # 4. Sell 5 shares
    await service.record_transaction(
        test_user.id,
        TransactionCreate(
            account_id=acc.id,
            symbol="RELIANCE.NS",
            asset_type="STOCK",
            transaction_type="SELL",
            quantity=Decimal("5"),
            price=Decimal("2800.00"),
            transaction_date=date.today()
        )
    )

    summary3 = await service.get_portfolio_summary(test_user.id)
    h3 = summary3.holdings[0]
    assert h3.quantity == Decimal("15")

    # 5. Directly update holding (e.g. adjust quantity and buy price)
    updated_h = await service.update_holding(
        test_user.id,
        h3.id,
        HoldingUpdate(quantity=Decimal("25"), average_buy_price=Decimal("2450.00"), notes="Manual adjustment")
    )
    assert updated_h.quantity == Decimal("25")
    assert updated_h.average_buy_price == Decimal("2450.00")

    # 6. Test stock suggestions
    suggestions = await service.get_stock_suggestions()
    assert len(suggestions) >= 10
    nifty_suggestions = await service.get_stock_suggestions("NIFTY 50")
    assert len(nifty_suggestions) >= 5
    assert all(s.category == "NIFTY 50" for s in nifty_suggestions)

    # 7. Delete holding
    deleted = await service.delete_holding(test_user.id, h3.id)
    assert deleted is True
    summary4 = await service.get_portfolio_summary(test_user.id)
    assert len(summary4.holdings) == 0

@pytest.mark.asyncio
async def test_watchlist_operations(db_session: AsyncSession, test_user):
    repo = InvestmentRepository(db_session)
    market_data = MarketDataProvider()
    service = InvestmentService(repo, market_data, session=db_session)

    # Add to watchlist
    item = await service.add_to_watchlist(
        test_user.id,
        WatchlistCreate(symbol="TCS.NS", name="Tata Consultancy Services", target_price=Decimal("4000.00"))
    )
    assert item.target_price == Decimal("4000.00")

    # List
    items = await service.list_watchlist(test_user.id)
    assert len(items) == 1
    assert items[0].asset.symbol == "TCS.NS"

    # Remove
    removed = await service.remove_from_watchlist(test_user.id, item.id)
    assert removed is True
    items_after = await service.list_watchlist(test_user.id)
    assert len(items_after) == 0

@pytest.mark.asyncio
async def test_ipo_prompts_and_ai_analysis(db_session: AsyncSession, test_user):
    repo = InvestmentRepository(db_session)
    llm = LLMProvider()
    service = IPOService(repo, llm, session=db_session)

    # 1. List prompts (seeds defaults)
    prompts = await service.list_prompts(test_user.id)
    assert len(prompts) >= 3
    default_prompt = next(p for p in prompts if p.is_default)
    assert "Comprehensive Valuation" in default_prompt.name

    # 2. Create custom user prompt
    custom = await service.create_prompt(
        test_user.id,
        IPOPromptCreate(
            name="Tech Startup Scalability Check",
            prompt_content="Focus on Customer Acquisition Cost (CAC), Lifetime Value (LTV), and cash runway.",
            is_default=False
        )
    )
    assert custom.name == "Tech Startup Scalability Check"

    # 3. Update prompt
    updated = await service.update_prompt(
        test_user.id,
        custom.id,
        IPOPromptUpdate(name="Tech Growth Scalability Check")
    )
    assert updated.name == "Tech Growth Scalability Check"

    # 4. Analyze IPO with custom prompt
    analysis = await service.analyze_ipo(
        test_user.id,
        IPOAnalyzeRequest(
            ipo_name="Swiggy Ltd",
            prompt_id=custom.id,
            details="Price band: 371-390, Issue size: 11,327 Cr, Fresh issue: 4,499 Cr"
        )
    )
    assert analysis.ipo_name == "Swiggy Ltd"
    assert analysis.used_prompt_name == "Tech Growth Scalability Check"
    assert len(analysis.analysis_markdown) > 0

    # 5. Delete prompt
    deleted = await service.delete_prompt(test_user.id, custom.id)
    assert deleted is True
