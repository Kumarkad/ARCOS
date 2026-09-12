from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.budget import Budget, BudgetCategory
from app.models.expense import Expense

class BudgetRepository(BaseRepository[Budget]):
    def __init__(self, session: AsyncSession):
        super().__init__(Budget, session)

    async def get_user_budget(self, budget_id: UUID, user_id: UUID) -> Optional[Budget]:
        query = select(Budget).where(
            and_(
                Budget.id == budget_id,
                Budget.user_id == user_id
            )
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def list_user_budgets(self, user_id: UUID, active_only: bool = False) -> List[Budget]:
        conditions = [Budget.user_id == user_id]
        if active_only:
            conditions.append(Budget.is_active == True)

        query = (
            select(Budget)
            .where(and_(*conditions))
            .order_by(Budget.created_at.desc())
        )
        result = await self.session.execute(query)
        # Use unique() because Budget has a joined load of categories
        return list(result.scalars().unique().all())

    async def get_spent_for_category(
        self,
        user_id: UUID,
        category_id: UUID,
        start_date: date,
        end_date: date
    ) -> Decimal:
        query = select(
            func.coalesce(func.sum(Expense.amount), Decimal("0.00"))
        ).where(
            and_(
                Expense.user_id == user_id,
                Expense.category_id == category_id,
                Expense.deleted_at.is_(None),
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date
            )
        )
        result = await self.session.execute(query)
        return Decimal(str(result.scalar() or "0.00"))

    async def get_total_spent_for_period(
        self,
        user_id: UUID,
        start_date: date,
        end_date: date
    ) -> Decimal:
        query = select(
            func.coalesce(func.sum(Expense.amount), Decimal("0.00"))
        ).where(
            and_(
                Expense.user_id == user_id,
                Expense.deleted_at.is_(None),
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date
            )
        )
        result = await self.session.execute(query)
        return Decimal(str(result.scalar() or "0.00"))

    async def delete_user_budget(self, budget_id: UUID, user_id: UUID) -> bool:
        budget = await self.get_user_budget(budget_id, user_id)
        if not budget:
            return False
        await self.session.delete(budget)
        await self.session.flush()
        return True
