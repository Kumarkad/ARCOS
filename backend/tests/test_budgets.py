import pytest
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.category_repo import CategoryRepository
from app.repositories.budget_repo import BudgetRepository
from app.repositories.expense_repo import ExpenseRepository
from app.services.category_service import CategoryService
from app.services.budget_service import BudgetService
from app.services.expense_service import ExpenseService
from app.schemas.budget import BudgetCreate, BudgetCategoryInput
from app.schemas.expense import ExpenseCreate

@pytest.mark.asyncio
async def test_budget_utilization_and_threshold_warnings(db_session: AsyncSession, test_user):
    cat_repo = CategoryRepository(db_session)
    budget_repo = BudgetRepository(db_session)
    exp_repo = ExpenseRepository(db_session)

    cat_service = CategoryService(cat_repo, session=db_session)
    budget_service = BudgetService(budget_repo, cat_repo, session=db_session)
    exp_service = ExpenseService(exp_repo, cat_repo, session=db_session)

    categories = await cat_service.list_categories(test_user.id)
    food_cat = next(c for c in categories if c.name == "Food")
    fuel_cat = next(c for c in categories if c.name == "Fuel")

    today = date.today()
    start_date = today.replace(day=1)
    end_date = today + timedelta(days=25)

    # 1. Create a monthly budget
    create_data = BudgetCreate(
        name="Monthly Household",
        total_amount=Decimal("10000.00"),
        period="MONTHLY",
        start_date=start_date,
        end_date=end_date,
        categories=[
            BudgetCategoryInput(category_id=food_cat.id, allocated_amount=Decimal("5000.00")),
            BudgetCategoryInput(category_id=fuel_cat.id, allocated_amount=Decimal("3000.00")),
        ]
    )
    budget = await budget_service.create_budget(test_user.id, create_data)
    assert budget.total_amount == Decimal("10000.00")
    assert len(budget.categories) == 2
    assert budget.total_spent == Decimal("0.00")
    assert budget.overall_status == "NORMAL"

    # 2. Spend ₹4,200 on Food (84% of ₹5,000 allocation) -> triggers WARNING threshold (>= 80%)
    await exp_service.create_expense(
        test_user.id,
        ExpenseCreate(
            amount=Decimal("4200.00"),
            currency="INR",
            category_id=food_cat.id,
            description="Grocery bulk shopping",
            expense_date=today
        )
    )

    # 3. Spend ₹3,500 on Fuel (116.7% of ₹3,000 allocation) -> triggers EXCEEDED threshold (>= 100%)
    await exp_service.create_expense(
        test_user.id,
        ExpenseCreate(
            amount=Decimal("3500.00"),
            currency="INR",
            category_id=fuel_cat.id,
            description="Highway road trip fuel",
            expense_date=today
        )
    )

    # 4. Fetch budget and verify dynamic calculation
    updated_budget = await budget_service.get_budget(test_user.id, budget.id)
    assert updated_budget.total_spent == Decimal("7700.00")
    assert updated_budget.total_remaining == Decimal("2300.00")
    assert updated_budget.total_utilization_pct == 77.0

    food_status = next(c for c in updated_budget.categories if c.category_id == food_cat.id)
    assert food_status.spent_amount == Decimal("4200.00")
    assert food_status.utilization_pct == 84.0
    assert food_status.status == "WARNING"
    assert "84.0%" in food_status.warning_message

    fuel_status = next(c for c in updated_budget.categories if c.category_id == fuel_cat.id)
    assert fuel_status.spent_amount == Decimal("3500.00")
    assert fuel_status.utilization_pct == 116.7
    assert fuel_status.status == "EXCEEDED"
    assert "Exceeded by ₹500.00" in fuel_status.warning_message

    # 5. Delete budget
    deleted = await budget_service.delete_budget(test_user.id, budget.id)
    assert deleted is True
    budgets = await budget_service.list_budgets(test_user.id)
    assert len(budgets) == 0
