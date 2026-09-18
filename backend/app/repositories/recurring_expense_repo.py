from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.recurring_expense import RecurringExpense

class RecurringExpenseRepository(BaseRepository[RecurringExpense]):
    def __init__(self, session: AsyncSession):
        super().__init__(RecurringExpense, session)

    async def get_user_recurring(self, rec_id: UUID, user_id: UUID) -> Optional[RecurringExpense]:
        query = select(RecurringExpense).where(
            and_(
                RecurringExpense.id == rec_id,
                RecurringExpense.user_id == user_id
            )
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def list_user_recurring(self, user_id: UUID, active_only: bool = False) -> List[RecurringExpense]:
        conditions = [RecurringExpense.user_id == user_id]
        if active_only:
            conditions.append(RecurringExpense.is_active == True)

        query = (
            select(RecurringExpense)
            .where(and_(*conditions))
            .order_by(RecurringExpense.next_due_date.asc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def toggle_active(self, rec_id: UUID, user_id: UUID) -> Optional[RecurringExpense]:
        rec = await self.get_user_recurring(rec_id, user_id)
        if not rec:
            return None
        rec.is_active = not rec.is_active
        await self.session.flush()
        return rec

    async def delete_user_recurring(self, rec_id: UUID, user_id: UUID) -> bool:
        rec = await self.get_user_recurring(rec_id, user_id)
        if not rec:
            return False
        await self.session.delete(rec)
        await self.session.flush()
        return True
