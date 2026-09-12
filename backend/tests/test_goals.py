import pytest
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.goal_repo import GoalRepository
from app.services.goal_service import GoalService
from app.schemas.goal import GoalCreate, GoalUpdate, GoalContribute

@pytest.mark.asyncio
async def test_financial_goals_lifecycle(db_session: AsyncSession, test_user):
    repo = GoalRepository(db_session)
    service = GoalService(repo)

    # 1. Create a goal: "Emergency Fund" ₹1,00,000, target in 10 months
    target_dt = date.today() + timedelta(days=300)
    goal = await service.create_goal(
        test_user.id,
        GoalCreate(
            name="Emergency Fund",
            category="EMERGENCY_FUND",
            target_amount=Decimal("100000.00"),
            current_amount=Decimal("20000.00"),
            target_date=target_dt,
        ),
    )

    assert goal.name == "Emergency Fund"
    assert goal.target_amount == Decimal("100000.00")
    assert goal.current_amount == Decimal("20000.00")
    assert goal.progress_pct == 20.0
    assert goal.remaining_amount == Decimal("80000.00")
    assert goal.days_remaining >= 299
    # ~10 months remaining -> ~8000/month needed
    assert goal.monthly_contribution_needed > Decimal("7000.00")
    assert goal.status == "ACTIVE"

    # 2. Contribute to goal (+₹30,000)
    c1 = await service.contribute_to_goal(
        test_user.id, goal.id, GoalContribute(amount=Decimal("30000.00"))
    )
    assert c1.current_amount == Decimal("50000.00")
    assert c1.progress_pct == 50.0
    assert c1.remaining_amount == Decimal("50000.00")

    # 3. Complete the goal (+₹50,000)
    c2 = await service.contribute_to_goal(
        test_user.id, goal.id, GoalContribute(amount=Decimal("50000.00"))
    )
    assert c2.current_amount == Decimal("100000.00")
    assert c2.progress_pct == 100.0
    assert c2.remaining_amount == Decimal("0.00")
    assert c2.status == "COMPLETED"

    # 4. List goals
    all_goals = await service.list_goals(test_user.id)
    assert len(all_goals) == 1

    # 5. Delete goal
    deleted = await service.delete_goal(test_user.id, goal.id)
    assert deleted is True

    remaining_goals = await service.list_goals(test_user.id)
    assert len(remaining_goals) == 0
