from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.goal import Goal
from app.schemas.goal import GoalCreate, GoalUpdate

class GoalRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_goals(self, user_id: UUID) -> List[Goal]:
        stmt = select(Goal).where(Goal.user_id == user_id).order_by(desc(Goal.created_at))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_goal(self, goal_id: UUID, user_id: UUID) -> Optional[Goal]:
        stmt = select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create_goal(self, user_id: UUID, data: GoalCreate) -> Goal:
        goal = Goal(
            user_id=user_id,
            name=data.name,
            category=data.category,
            target_amount=data.target_amount,
            current_amount=data.current_amount,
            target_date=data.target_date,
            status="ACTIVE",
        )
        self.session.add(goal)
        await self.session.commit()
        await self.session.refresh(goal)
        return goal

    async def update_goal(self, goal: Goal, data: GoalUpdate) -> Goal:
        for field, val in data.model_dump(exclude_unset=True).items():
            setattr(goal, field, val)
        await self.session.commit()
        await self.session.refresh(goal)
        return goal

    async def delete_goal(self, goal: Goal) -> bool:
        await self.session.delete(goal)
        await self.session.commit()
        return True
