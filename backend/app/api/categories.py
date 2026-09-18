from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse
from app.schemas.common import APIResponse
from app.repositories.category_repo import CategoryRepository
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["Categories"])

def get_category_service(db: AsyncSession = Depends(get_db)) -> CategoryService:
    repo = CategoryRepository(db)
    return CategoryService(repo, session=db)

@router.get("", response_model=APIResponse[List[CategoryResponse]])
async def list_categories(
    user: User = Depends(get_current_user),
    service: CategoryService = Depends(get_category_service)
):
    categories = await service.list_categories(user.id)
    return APIResponse(data=categories)

@router.post("", response_model=APIResponse[CategoryResponse])
async def create_category(
    data: CategoryCreate,
    user: User = Depends(get_current_user),
    service: CategoryService = Depends(get_category_service)
):
    category = await service.create_custom_category(user.id, data)
    return APIResponse(data=category, message="Category created successfully")

@router.delete("/{category_id}", response_model=APIResponse[bool])
async def delete_category(
    category_id: UUID,
    user: User = Depends(get_current_user),
    service: CategoryService = Depends(get_category_service)
):
    success = await service.delete_custom_category(user.id, category_id)
    return APIResponse(data=success, message="Category deleted successfully")
