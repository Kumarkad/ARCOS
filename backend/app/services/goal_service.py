from datetime import date
from decimal import Decimal
from typing import List
from uuid import UUID
from fastapi import HTTPException, status
from app.repositories.goal_repo import GoalRepository
from app.models.goal import Goal
from app.schemas.goal import GoalCreate, GoalUpdate, GoalContribute, GoalResponse

class GoalService:
    def __init__(self, repo: GoalRepository):
        self.repo = repo

    def _to_response(self, goal: Goal) -> GoalResponse:
        today = date.today()
        target = goal.target_amount
        current = goal.current_amount
        
        progress = round(float((current / target) * 100), 1) if target > 0 else 0.0
        remaining = max(Decimal("0.0"), target - current)
        days_left = max(0, (goal.target_date - today).days)
        
        # Calculate monthly savings required
        months_left = max(1, (days_left + 29) // 30)
        monthly_needed = round(remaining / months_left, 2) if remaining > 0 else Decimal("0.0")

        current_status = goal.status
        if current >= target and current_status != "COMPLETED":
            current_status = "COMPLETED"

        return GoalResponse(
            id=goal.id,
            user_id=goal.user_id,
            name=goal.name,
            category=goal.category,
            target_amount=goal.target_amount,
            current_amount=goal.current_amount,
            target_date=goal.target_date,
            status=current_status,
            progress_pct=min(100.0, progress),
            remaining_amount=remaining,
            monthly_contribution_needed=monthly_needed,
            days_remaining=days_left,
            created_at=goal.created_at,
        )

    async def list_goals(self, user_id: UUID) -> List[GoalResponse]:
        goals = await self.repo.list_goals(user_id)
        return [self._to_response(g) for g in goals]

    async def get_goal(self, user_id: UUID, goal_id: UUID) -> GoalResponse:
        goal = await self.repo.get_goal(goal_id, user_id)
        if not goal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
        return self._to_response(goal)

    async def create_goal(self, user_id: UUID, data: GoalCreate) -> GoalResponse:
        goal = await self.repo.create_goal(user_id, data)
        return self._to_response(goal)

    async def update_goal(self, user_id: UUID, goal_id: UUID, data: GoalUpdate) -> GoalResponse:
        goal = await self.repo.get_goal(goal_id, user_id)
        if not goal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
        updated = await self.repo.update_goal(goal, data)
        return self._to_response(updated)

    async def contribute_to_goal(
        self, user_id: UUID, goal_id: UUID, data: GoalContribute
    ) -> GoalResponse:
        goal = await self.repo.get_goal(goal_id, user_id)
        if not goal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
        
        goal.current_amount += data.amount
        if goal.current_amount >= goal.target_amount:
            goal.status = "COMPLETED"
        
        await self.repo.session.commit()
        await self.repo.session.refresh(goal)
        return self._to_response(goal)

    async def delete_goal(self, user_id: UUID, goal_id: UUID) -> bool:
        goal = await self.repo.get_goal(goal_id, user_id)
        if not goal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
        return await self.repo.delete_goal(goal)
