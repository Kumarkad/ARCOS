from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.recurring_expense import (
    RecurringExpenseCreate, RecurringExpenseUpdate, RecurringExpenseResponse
)
from app.schemas.common import APIResponse
from app.repositories.recurring_expense_repo import RecurringExpenseRepository
from app.repositories.category_repo import CategoryRepository
from app.services.recurring_expense_service import RecurringExpenseService

router = APIRouter(prefix="/recurring-expenses", tags=["Recurring Expenses"])

def get_recurring_service(db: AsyncSession = Depends(get_db)) -> RecurringExpenseService:
    rec_repo = RecurringExpenseRepository(db)
    cat_repo = CategoryRepository(db)
    return RecurringExpenseService(rec_repo, cat_repo, session=db)

@router.get("", response_model=APIResponse[List[RecurringExpenseResponse]])
async def list_recurring(
    active_only: bool = Query(False),
    user: User = Depends(get_current_user),
    service: RecurringExpenseService = Depends(get_recurring_service)
):
    items = await service.list_recurring(user.id, active_only)
    return APIResponse(data=items)

@router.post("", response_model=APIResponse[RecurringExpenseResponse])
async def create_recurring(
    data: RecurringExpenseCreate,
    user: User = Depends(get_current_user),
    service: RecurringExpenseService = Depends(get_recurring_service)
):
    item = await service.create_recurring(user.id, data)
    return APIResponse(data=item, message="Recurring expense scheduled")

@router.put("/{rec_id}", response_model=APIResponse[RecurringExpenseResponse])
async def update_recurring(
    rec_id: UUID,
    data: RecurringExpenseUpdate,
    user: User = Depends(get_current_user),
    service: RecurringExpenseService = Depends(get_recurring_service)
):
    item = await service.update_recurring(user.id, rec_id, data)
    return APIResponse(data=item, message="Recurring expense updated")

@router.put("/{rec_id}/toggle", response_model=APIResponse[RecurringExpenseResponse])
async def toggle_recurring(
    rec_id: UUID,
    user: User = Depends(get_current_user),
    service: RecurringExpenseService = Depends(get_recurring_service)
):
    item = await service.toggle_active(user.id, rec_id)
    return APIResponse(data=item, message="Recurring expense status changed")

@router.delete("/{rec_id}", response_model=APIResponse[bool])
async def delete_recurring(
    rec_id: UUID,
    user: User = Depends(get_current_user),
    service: RecurringExpenseService = Depends(get_recurring_service)
):
    success = await service.delete_recurring(user.id, rec_id)
    return APIResponse(data=success, message="Recurring expense deleted")
