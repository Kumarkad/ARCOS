from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetResponse
from app.schemas.common import APIResponse
from app.repositories.budget_repo import BudgetRepository
from app.repositories.category_repo import CategoryRepository
from app.services.budget_service import BudgetService

router = APIRouter(prefix="/budgets", tags=["Budgets"])

def get_budget_service(db: AsyncSession = Depends(get_db)) -> BudgetService:
    budget_repo = BudgetRepository(db)
    category_repo = CategoryRepository(db)
    return BudgetService(budget_repo, category_repo, session=db)

@router.get("", response_model=APIResponse[List[BudgetResponse]])
async def list_budgets(
    active_only: bool = Query(False),
    user: User = Depends(get_current_user),
    service: BudgetService = Depends(get_budget_service)
):
    budgets = await service.list_budgets(user.id, active_only)
    return APIResponse(data=budgets)

@router.post("", response_model=APIResponse[BudgetResponse])
async def create_budget(
    data: BudgetCreate,
    user: User = Depends(get_current_user),
    service: BudgetService = Depends(get_budget_service)
):
    budget = await service.create_budget(user.id, data)
    return APIResponse(data=budget, message="Budget created successfully")

@router.get("/{budget_id}", response_model=APIResponse[BudgetResponse])
async def get_budget(
    budget_id: UUID,
    user: User = Depends(get_current_user),
    service: BudgetService = Depends(get_budget_service)
):
    budget = await service.get_budget(user.id, budget_id)
    return APIResponse(data=budget)

@router.delete("/{budget_id}", response_model=APIResponse[bool])
async def delete_budget(
    budget_id: UUID,
    user: User = Depends(get_current_user),
    service: BudgetService = Depends(get_budget_service)
):
    success = await service.delete_budget(user.id, budget_id)
    return APIResponse(data=success, message="Budget deleted successfully")
