import math
from datetime import date
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.expense import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    ExpenseBulkCreate, ExpenseSummaryResponse
)
from app.schemas.common import APIResponse, PaginatedResponse
from app.repositories.expense_repo import ExpenseRepository
from app.repositories.category_repo import CategoryRepository
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/expenses", tags=["Expenses"])

def get_expense_service(db: AsyncSession = Depends(get_db)) -> ExpenseService:
    exp_repo = ExpenseRepository(db)
    cat_repo = CategoryRepository(db)
    return ExpenseService(exp_repo, cat_repo, session=db)

@router.get("/summary", response_model=APIResponse[ExpenseSummaryResponse])
async def get_expense_summary(
    user: User = Depends(get_current_user),
    service: ExpenseService = Depends(get_expense_service)
):
    summary = await service.get_summary(user.id)
    return APIResponse(data=summary)

@router.get("", response_model=PaginatedResponse[ExpenseResponse])
async def list_expenses(
    start_date: Optional[date] = Query(None, description="Filter from date"),
    end_date: Optional[date] = Query(None, description="Filter to date"),
    category_id: Optional[UUID] = Query(None, description="Filter by category"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    service: ExpenseService = Depends(get_expense_service)
):
    items, total = await service.list_expenses(
        user_id=user.id,
        start_date=start_date,
        end_date=end_date,
        category_id=category_id,
        payment_method=payment_method,
        page=page,
        page_size=page_size
    )
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return PaginatedResponse(
        data=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.post("", response_model=APIResponse[ExpenseResponse])
async def create_expense(
    data: ExpenseCreate,
    user: User = Depends(get_current_user),
    service: ExpenseService = Depends(get_expense_service)
):
    expense = await service.create_expense(user.id, data)
    return APIResponse(data=expense, message="Expense added successfully")

@router.post("/bulk", response_model=APIResponse[List[ExpenseResponse]])
async def bulk_create_expenses(
    data: ExpenseBulkCreate,
    user: User = Depends(get_current_user),
    service: ExpenseService = Depends(get_expense_service)
):
    expenses = await service.bulk_create_expenses(user.id, data)
    return APIResponse(data=expenses, message=f"Successfully synced {len(expenses)} expenses")

@router.get("/{expense_id}", response_model=APIResponse[ExpenseResponse])
async def get_expense(
    expense_id: UUID,
    user: User = Depends(get_current_user),
    service: ExpenseService = Depends(get_expense_service)
):
    expense = await service.get_expense(user.id, expense_id)
    return APIResponse(data=expense)

@router.put("/{expense_id}", response_model=APIResponse[ExpenseResponse])
async def update_expense(
    expense_id: UUID,
    data: ExpenseUpdate,
    user: User = Depends(get_current_user),
    service: ExpenseService = Depends(get_expense_service)
):
    updated = await service.update_expense(user.id, expense_id, data)
    return APIResponse(data=updated, message="Expense updated successfully")

@router.delete("/{expense_id}", response_model=APIResponse[bool])
async def delete_expense(
    expense_id: UUID,
    user: User = Depends(get_current_user),
    service: ExpenseService = Depends(get_expense_service)
):
    success = await service.delete_expense(user.id, expense_id)
    return APIResponse(data=success, message="Expense deleted successfully")
