import pytest
from datetime import date
from decimal import Decimal
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.category_repo import CategoryRepository
from app.repositories.expense_repo import ExpenseRepository
from app.services.category_service import CategoryService
from app.services.expense_service import ExpenseService
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseBulkCreate
from app.core.exceptions import NotFoundError

@pytest.mark.asyncio
async def test_expense_crud_and_idempotency(db_session: AsyncSession, test_user):
    cat_repo = CategoryRepository(db_session)
    exp_repo = ExpenseRepository(db_session)
    cat_service = CategoryService(cat_repo, session=db_session)
    exp_service = ExpenseService(exp_repo, cat_repo, session=db_session)

    categories = await cat_service.list_categories(test_user.id)
    food_cat = next(c for c in categories if c.name == "Food")

    idem_key = uuid4()
    create_data = ExpenseCreate(
        amount=Decimal("250.50"),
        currency="INR",
        category_id=food_cat.id,
        description="Dinner at restaurant",
        merchant="Biryani Palace",
        payment_method="UPI",
        expense_date=date.today(),
        notes="Delicious meal",
        idempotency_key=idem_key
    )

    # 1. Create expense
    expense = await exp_service.create_expense(test_user.id, create_data)
    assert expense.amount == Decimal("250.50")
    assert expense.description == "Dinner at restaurant"
    assert expense.merchant == "Biryani Palace"
    assert expense.category is not None
    assert expense.category.name == "Food"

    # 2. Idempotent re-submission with same idempotency_key must return same expense without creating duplicate
    duplicate_try = await exp_service.create_expense(test_user.id, create_data)
    assert duplicate_try.id == expense.id

    # 3. Read single expense
    fetched = await exp_service.get_expense(test_user.id, expense.id)
    assert fetched.id == expense.id

    # 4. Update expense
    update_data = ExpenseUpdate(amount=Decimal("300.00"), description="Dinner with friends")
    updated = await exp_service.update_expense(test_user.id, expense.id, update_data)
    assert updated.amount == Decimal("300.00")
    assert updated.description == "Dinner with friends"

    # 5. Summary metrics
    summary = await exp_service.get_summary(test_user.id)
    assert summary.today_total == Decimal("300.00")
    assert summary.this_month_total == Decimal("300.00")
    assert summary.total_expenses_count == 1
    assert len(summary.category_breakdown) == 1
    assert summary.category_breakdown[0].category_name == "Food"
    assert summary.category_breakdown[0].percentage == 100.0

    # 6. Soft delete
    deleted = await exp_service.delete_expense(test_user.id, expense.id)
    assert deleted is True

    # After soft delete, expense is not found in get_expense or list
    with pytest.raises(NotFoundError):
        await exp_service.get_expense(test_user.id, expense.id)

    items, total = await exp_service.list_expenses(test_user.id)
    assert total == 0
    assert len(items) == 0

@pytest.mark.asyncio
async def test_bulk_create_expenses(db_session: AsyncSession, test_user):
    cat_repo = CategoryRepository(db_session)
    exp_repo = ExpenseRepository(db_session)
    cat_service = CategoryService(cat_repo, session=db_session)
    exp_service = ExpenseService(exp_repo, cat_repo, session=db_session)

    categories = await cat_service.list_categories(test_user.id)
    fuel_cat = next(c for c in categories if c.name == "Fuel")

    bulk_data = ExpenseBulkCreate(
        expenses=[
            ExpenseCreate(
                amount=Decimal("500.00"),
                currency="INR",
                category_id=fuel_cat.id,
                description="Petrol 1",
                payment_method="UPI",
                expense_date=date.today(),
                idempotency_key=uuid4()
            ),
            ExpenseCreate(
                amount=Decimal("700.00"),
                currency="INR",
                category_id=fuel_cat.id,
                description="Petrol 2",
                payment_method="UPI",
                expense_date=date.today(),
                idempotency_key=uuid4()
            ),
        ]
    )

    created = await exp_service.bulk_create_expenses(test_user.id, bulk_data)
    assert len(created) == 2
    items, total = await exp_service.list_expenses(test_user.id)
    assert total == 2
