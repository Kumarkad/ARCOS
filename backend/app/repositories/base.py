from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

T = TypeVar("T")

class BaseRepository(Generic[T]):
    def __init__(self, model_cls: Type[T], session: AsyncSession):
        self.model_cls = model_cls
        self.session = session

    async def get_by_id(self, id: UUID) -> Optional[T]:
        result = await self.session.execute(select(self.model_cls).filter_by(id=id))
        return result.scalars().first()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        result = await self.session.execute(select(self.model_cls).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, obj: T) -> T:
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, obj: T) -> T:
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def delete(self, id: UUID) -> bool:
        obj = await self.get_by_id(id)
        if obj:
            await self.session.delete(obj)
            await self.session.flush()
            return True
        return False
