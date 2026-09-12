import math
from datetime import date
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.income import (
    IncomeCreate, IncomeUpdate, IncomeResponse, IncomeSummaryResponse
)
from app.schemas.common import APIResponse, PaginatedResponse
from app.repositories.income_repo import IncomeRepository
from app.services.income_service import IncomeService

router = APIRouter(prefix="/income", tags=["Income"])

def get_income_service(db: AsyncSession = Depends(get_db)) -> IncomeService:
    repo = IncomeRepository(db)
    return IncomeService(repo, session=db)

@router.get("/summary", response_model=APIResponse[IncomeSummaryResponse])
async def get_income_summary(
    user: User = Depends(get_current_user),
    service: IncomeService = Depends(get_income_service)
):
    summary = await service.get_summary(user.id)
    return APIResponse(data=summary)

@router.get("", response_model=PaginatedResponse[IncomeResponse])
async def list_income(
    start_date: Optional[date] = Query(None, description="Filter from date"),
    end_date: Optional[date] = Query(None, description="Filter to date"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    service: IncomeService = Depends(get_income_service)
):
    items, total = await service.list_income(
        user_id=user.id,
        start_date=start_date,
        end_date=end_date,
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

@router.post("", response_model=APIResponse[IncomeResponse])
async def create_income(
    data: IncomeCreate,
    user: User = Depends(get_current_user),
    service: IncomeService = Depends(get_income_service)
):
    income = await service.create_income(user.id, data)
    return APIResponse(data=income, message="Income recorded successfully")

@router.put("/{income_id}", response_model=APIResponse[IncomeResponse])
async def update_income(
    income_id: UUID,
    data: IncomeUpdate,
    user: User = Depends(get_current_user),
    service: IncomeService = Depends(get_income_service)
):
    updated = await service.update_income(user.id, income_id, data)
    return APIResponse(data=updated, message="Income updated successfully")

@router.delete("/{income_id}", response_model=APIResponse[bool])
async def delete_income(
    income_id: UUID,
    user: User = Depends(get_current_user),
    service: IncomeService = Depends(get_income_service)
):
    success = await service.delete_income(user.id, income_id)
    return APIResponse(data=success, message="Income deleted successfully")
