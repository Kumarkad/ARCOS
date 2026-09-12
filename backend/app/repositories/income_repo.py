from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.income import Income

class IncomeRepository(BaseRepository[Income]):
    def __init__(self, session: AsyncSession):
        super().__init__(Income, session)

    async def get_user_income(self, income_id: UUID, user_id: UUID) -> Optional[Income]:
        query = select(Income).where(
            and_(
                Income.id == income_id,
                Income.user_id == user_id
            )
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def list_income(
        self,
        user_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Income]:
        conditions = [Income.user_id == user_id]
        if start_date:
            conditions.append(Income.income_date >= start_date)
        if end_date:
            conditions.append(Income.income_date <= end_date)

        query = (
            select(Income)
            .where(and_(*conditions))
            .order_by(Income.income_date.desc(), Income.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def count_income(
        self,
        user_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> int:
        conditions = [Income.user_id == user_id]
        if start_date:
            conditions.append(Income.income_date >= start_date)
        if end_date:
            conditions.append(Income.income_date <= end_date)

        query = select(func.count(Income.id)).where(and_(*conditions))
        result = await self.session.execute(query)
        return result.scalar() or 0

    async def get_period_total(
        self,
        user_id: UUID,
        start_date: date,
        end_date: date
    ) -> Decimal:
        query = select(
            func.coalesce(func.sum(Income.amount), Decimal("0.00"))
        ).where(
            and_(
                Income.user_id == user_id,
                Income.income_date >= start_date,
                Income.income_date <= end_date
            )
        )
        result = await self.session.execute(query)
        return Decimal(str(result.scalar() or "0.00"))

    async def delete_user_income(self, income_id: UUID, user_id: UUID) -> bool:
        income = await self.get_user_income(income_id, user_id)
        if not income:
            return False
        await self.session.delete(income)
        await self.session.flush()
        return True
