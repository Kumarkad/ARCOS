from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.category import Category
from app.core.constants import DEFAULT_CATEGORIES

class CategoryRepository(BaseRepository[Category]):
    def __init__(self, session: AsyncSession):
        super().__init__(Category, session)

    async def get_all_for_user(self, user_id: UUID) -> List[Category]:
        """Fetch both system categories and custom categories for the given user."""
        query = select(Category).where(
            or_(
                Category.is_system == True,
                Category.user_id == user_id
            )
        ).order_by(Category.name.asc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_by_name(self, name: str, user_id: Optional[UUID] = None) -> Optional[Category]:
        """Find category by name (case-insensitive) either system or user-specific."""
        conditions = [Category.name.ilike(name)]
        if user_id:
            conditions.append(or_(Category.user_id == user_id, Category.is_system == True))
        else:
            conditions.append(Category.is_system == True)

        query = select(Category).where(and_(*conditions))
        result = await self.session.execute(query)
        return result.scalars().first()

    async def seed_system_categories(self) -> int:
        """Seed default system categories if not already existing."""
        created_count = 0
        for item in DEFAULT_CATEGORIES:
            existing = await self.session.execute(
                select(Category).where(
                    and_(
                        Category.name == item["name"],
                        Category.is_system == True
                    )
                )
            )
            if not existing.scalars().first():
                cat = Category(
                    name=item["name"],
                    icon=item["icon"],
                    color=item["color"],
                    is_system=True,
                    user_id=None,
                    type="expense"
                )
                self.session.add(cat)
                created_count += 1
        if created_count > 0:
            await self.session.flush()
        return created_count
