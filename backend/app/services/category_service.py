from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.category_repo import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryResponse
from app.models.category import Category
from app.core.exceptions import ConflictError, NotFoundError, AuthorizationError

class CategoryService:
    def __init__(self, category_repo: CategoryRepository, session: AsyncSession = None):
        self.category_repo = category_repo
        self.session = session

    async def list_categories(self, user_id: UUID) -> List[CategoryResponse]:
        # Ensure system categories are present
        await self.category_repo.seed_system_categories()
        if self.session:
            await self.session.commit()

        categories = await self.category_repo.get_all_for_user(user_id)
        return [CategoryResponse.model_validate(c) for c in categories]

    async def create_custom_category(self, user_id: UUID, data: CategoryCreate) -> CategoryResponse:
        existing = await self.category_repo.get_by_name(data.name, user_id)
        if existing:
            raise ConflictError(f"Category with name '{data.name}' already exists")

        category = Category(
            user_id=user_id,
            name=data.name,
            icon=data.icon,
            color=data.color,
            is_system=False,
            type=data.type
        )
        created = await self.category_repo.create(category)
        if self.session:
            await self.session.commit()
            await self.session.refresh(created)
        return CategoryResponse.model_validate(created)

    async def delete_custom_category(self, user_id: UUID, category_id: UUID) -> bool:
        category = await self.category_repo.get_by_id(category_id)
        if not category:
            raise NotFoundError("Category not found")
        if category.is_system:
            raise AuthorizationError("System categories cannot be deleted")
        if category.user_id != user_id:
            raise AuthorizationError("You cannot delete another user's category")

        result = await self.category_repo.delete(category_id)
        if self.session:
            await self.session.commit()
        return result
