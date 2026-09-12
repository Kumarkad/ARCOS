import pytest
from datetime import date
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.category import Category
from app.models.expense import Expense

@pytest.mark.asyncio
async def test_csv_export_endpoints(db_session: AsyncSession, test_user: User):
    # Override dependencies with test fixtures
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_current_user] = lambda: test_user

    try:
        cat = Category(name="Groceries", user_id=test_user.id, is_system=False, icon="cart", color="#4CAF50")
        db_session.add(cat)
        await db_session.commit()
        await db_session.refresh(cat)

        exp = Expense(
            user_id=test_user.id,
            category_id=cat.id,
            amount=Decimal("450.00"),
            expense_date=date(2026, 3, 10),
            merchant="Supermarket",
            payment_method="UPI",
            description="Weekly grocery supplies",
        )
        db_session.add(exp)
        await db_session.commit()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.get("/api/v1/export/expenses.csv")
            assert resp.status_code == 200
            assert "text/csv" in resp.headers["content-type"]
            content = resp.text
            assert "Date,Category,Amount (INR),Payment Method,Merchant,Description" in content
            assert "450.00" in content
            assert "Supermarket" in content
            assert "Weekly grocery supplies" in content
    finally:
        app.dependency_overrides.clear()
