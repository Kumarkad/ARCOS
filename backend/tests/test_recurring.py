import pytest
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.category_repo import CategoryRepository
from app.repositories.recurring_expense_repo import RecurringExpenseRepository
from app.services.category_service import CategoryService
from app.services.recurring_expense_service import RecurringExpenseService
from app.schemas.recurring_expense import RecurringExpenseCreate, RecurringExpenseUpdate

@pytest.mark.asyncio
async def test_recurring_expense_lifecycle(db_session: AsyncSession, test_user):
    cat_repo = CategoryRepository(db_session)
    rec_repo = RecurringExpenseRepository(db_session)
    cat_service = CategoryService(cat_repo, session=db_session)
    rec_service = RecurringExpenseService(rec_repo, cat_repo, session=db_session)

    categories = await cat_service.list_categories(test_user.id)
    rent_cat = next(c for c in categories if c.name == "Rent")

    data = RecurringExpenseCreate(
        amount=Decimal("15000.00"),
        currency="INR",
        category_id=rent_cat.id,
        description="Flat Rent",
        payment_method="NET_BANKING",
        frequency="MONTHLY",
        start_date=date.today(),
        next_due_date=date.today() + timedelta(days=30),
        is_active=True,
        auto_create=True
    )

    created = await rec_service.create_recurring(test_user.id, data)
    assert created.amount == Decimal("15000.00")
    assert created.frequency == "MONTHLY"
    assert created.is_active is True

    # Toggle active
    toggled = await rec_service.toggle_active(test_user.id, created.id)
    assert toggled.is_active is False

    # List active only
    active_items = await rec_service.list_recurring(test_user.id, active_only=True)
    assert len(active_items) == 0

    # Delete
    deleted = await rec_service.delete_recurring(test_user.id, created.id)
    assert deleted is True

    all_items = await rec_service.list_recurring(test_user.id, active_only=False)
    assert len(all_items) == 0
