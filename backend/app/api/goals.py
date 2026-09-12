from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.goal import GoalCreate, GoalUpdate, GoalContribute, GoalResponse
from app.schemas.common import APIResponse
from app.repositories.goal_repo import GoalRepository
from app.services.goal_service import GoalService

router = APIRouter(prefix="/goals", tags=["Financial Goals"])

def get_goal_service(db: AsyncSession = Depends(get_db)) -> GoalService:
    repo = GoalRepository(db)
    return GoalService(repo)

@router.get("", response_model=APIResponse[List[GoalResponse]])
async def list_goals(
    user: User = Depends(get_current_user),
    service: GoalService = Depends(get_goal_service),
):
    goals = await service.list_goals(user.id)
    return APIResponse(data=goals)

@router.post("", response_model=APIResponse[GoalResponse])
async def create_goal(
    data: GoalCreate,
    user: User = Depends(get_current_user),
    service: GoalService = Depends(get_goal_service),
):
    goal = await service.create_goal(user.id, data)
    return APIResponse(data=goal, message="Financial goal created")

@router.get("/{goal_id}", response_model=APIResponse[GoalResponse])
async def get_goal(
    goal_id: UUID,
    user: User = Depends(get_current_user),
    service: GoalService = Depends(get_goal_service),
):
    goal = await service.get_goal(user.id, goal_id)
    return APIResponse(data=goal)

@router.put("/{goal_id}", response_model=APIResponse[GoalResponse])
async def update_goal(
    goal_id: UUID,
    data: GoalUpdate,
    user: User = Depends(get_current_user),
    service: GoalService = Depends(get_goal_service),
):
    goal = await service.update_goal(user.id, goal_id, data)
    return APIResponse(data=goal, message="Financial goal updated")

@router.post("/{goal_id}/contribute", response_model=APIResponse[GoalResponse])
async def contribute_to_goal(
    goal_id: UUID,
    data: GoalContribute,
    user: User = Depends(get_current_user),
    service: GoalService = Depends(get_goal_service),
):
    goal = await service.contribute_to_goal(user.id, goal_id, data)
    return APIResponse(data=goal, message="Contribution recorded")

@router.delete("/{goal_id}", response_model=APIResponse[bool])
async def delete_goal(
    goal_id: UUID,
    user: User = Depends(get_current_user),
    service: GoalService = Depends(get_goal_service),
):
    success = await service.delete_goal(user.id, goal_id)
    return APIResponse(data=success, message="Financial goal deleted")
