import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.income_repo import IncomeRepository
from app.services.income_service import IncomeService
from app.schemas.income import IncomeCreate, IncomeUpdate

@pytest.mark.asyncio
async def test_income_lifecycle(db_session: AsyncSession, test_user):
    repo = IncomeRepository(db_session)
    service = IncomeService(repo, session=db_session)

    data = IncomeCreate(
        amount=Decimal("75000.00"),
        currency="INR",
        source="Salary",
        description="Monthly tech job salary",
        income_date=date.today(),
        is_recurring=True,
        recurrence_period="MONTHLY"
    )

    created = await service.create_income(test_user.id, data)
    assert created.amount == Decimal("75000.00")
    assert created.source == "Salary"
    assert created.is_recurring is True

    # List
    items, total = await service.list_income(test_user.id)
    assert total == 1
    assert items[0].id == created.id

    # Update
    updated = await service.update_income(
        test_user.id,
        created.id,
        IncomeUpdate(amount=Decimal("80000.00"), description="Salary with bonus")
    )
    assert updated.amount == Decimal("80000.00")

    # Summary
    summary = await service.get_summary(test_user.id)
    assert summary.this_month_total == Decimal("80000.00")
    assert summary.total_records == 1

    # Delete
    deleted = await service.delete_income(test_user.id, created.id)
    assert deleted is True

    items, total = await service.list_income(test_user.id)
    assert total == 0
