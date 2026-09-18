import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.category_repo import CategoryRepository
from app.repositories.expense_repo import ExpenseRepository
from app.repositories.budget_repo import BudgetRepository
from app.repositories.analytics_repo import AnalyticsRepository
from app.services.category_service import CategoryService
from app.services.expense_service import ExpenseService
from app.services.analytics_service import AnalyticsService
from app.schemas.expense import ExpenseCreate

@pytest.mark.asyncio
async def test_spending_analytics_and_insights(db_session: AsyncSession, test_user):
    cat_repo = CategoryRepository(db_session)
    exp_repo = ExpenseRepository(db_session)
    budget_repo = BudgetRepository(db_session)
    analytics_repo = AnalyticsRepository(db_session)

    cat_service = CategoryService(cat_repo, session=db_session)
    exp_service = ExpenseService(exp_repo, cat_repo, session=db_session)
    analytics_service = AnalyticsService(analytics_repo, budget_repo, session=db_session)

    categories = await cat_service.list_categories(test_user.id)
    food_cat = next(c for c in categories if c.name == "Food")
    travel_cat = next(c for c in categories if c.name == "Travel")

    today = date.today()

    # Add expenses with merchants and payment methods
    await exp_service.create_expense(
        test_user.id,
        ExpenseCreate(
            amount=Decimal("1200.00"),
            currency="INR",
            category_id=food_cat.id,
            description="Dinner",
            merchant="Swiggy",
            payment_method="UPI",
            expense_date=today
        )
    )
    await exp_service.create_expense(
        test_user.id,
        ExpenseCreate(
            amount=Decimal("800.00"),
            currency="INR",
            category_id=travel_cat.id,
            description="Cab ride",
            merchant="Uber",
            payment_method="CREDIT_CARD",
            expense_date=today
        )
    )

    analytics = await analytics_service.get_analytics(test_user.id)

    assert analytics.this_month_total == Decimal("2000.00")
    assert analytics.daily_average > Decimal("0.00")
    assert len(analytics.monthly_trends) == 6

    # Verify merchant ranking
    merchants = [m.merchant for m in analytics.top_merchants]
    assert "Swiggy" in merchants
    assert "Uber" in merchants
    swiggy_spend = next(m for m in analytics.top_merchants if m.merchant == "Swiggy")
    assert swiggy_spend.total_amount == Decimal("1200.00")

    # Verify payment method breakdown
    pm_names = [p.payment_method for p in analytics.payment_methods]
    assert "UPI" in pm_names
    assert "CREDIT_CARD" in pm_names

    # Verify insights generated
    assert len(analytics.insights) > 0
