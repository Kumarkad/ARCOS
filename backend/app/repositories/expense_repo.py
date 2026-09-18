from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
from uuid import UUID
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.expense import Expense
from app.models.category import Category

class ExpenseRepository(BaseRepository[Expense]):
    def __init__(self, session: AsyncSession):
        super().__init__(Expense, session)

    async def get_by_idempotency_key(self, idempotency_key: UUID, user_id: UUID) -> Optional[Expense]:
        query = select(Expense).where(
            and_(
                Expense.idempotency_key == idempotency_key,
                Expense.user_id == user_id,
                Expense.deleted_at.is_(None)
            )
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def get_user_expense(self, expense_id: UUID, user_id: UUID) -> Optional[Expense]:
        query = select(Expense).where(
            and_(
                Expense.id == expense_id,
                Expense.user_id == user_id,
                Expense.deleted_at.is_(None)
            )
        )
        result = await self.session.execute(query)
        return result.scalars().first()

    async def list_expenses(
        self,
        user_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[UUID] = None,
        payment_method: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Expense]:
        conditions = [
            Expense.user_id == user_id,
            Expense.deleted_at.is_(None)
        ]
        if start_date:
            conditions.append(Expense.expense_date >= start_date)
        if end_date:
            conditions.append(Expense.expense_date <= end_date)
        if category_id:
            conditions.append(Expense.category_id == category_id)
        if payment_method:
            conditions.append(Expense.payment_method == payment_method)

        query = (
            select(Expense)
            .where(and_(*conditions))
            .order_by(Expense.expense_date.desc(), Expense.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def count_expenses(
        self,
        user_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[UUID] = None,
        payment_method: Optional[str] = None
    ) -> int:
        conditions = [
            Expense.user_id == user_id,
            Expense.deleted_at.is_(None)
        ]
        if start_date:
            conditions.append(Expense.expense_date >= start_date)
        if end_date:
            conditions.append(Expense.expense_date <= end_date)
        if category_id:
            conditions.append(Expense.category_id == category_id)
        if payment_method:
            conditions.append(Expense.payment_method == payment_method)

        query = select(func.count(Expense.id)).where(and_(*conditions))
        result = await self.session.execute(query)
        return result.scalar() or 0

    async def soft_delete(self, expense_id: UUID, user_id: UUID) -> bool:
        expense = await self.get_user_expense(expense_id, user_id)
        if not expense:
            return False
        expense.deleted_at = datetime.now(timezone.utc)
        await self.session.flush()
        return True

    async def get_period_total(
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

    async def get_category_breakdown(
        self,
        user_id: UUID,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        query = (
            select(
                Category.id.label("category_id"),
                Category.name.label("category_name"),
                Category.icon.label("category_icon"),
                Category.color.label("category_color"),
                func.sum(Expense.amount).label("total_amount")
            )
            .join(Category, Expense.category_id == Category.id)
            .where(
                and_(
                    Expense.user_id == user_id,
                    Expense.deleted_at.is_(None),
                    Expense.expense_date >= start_date,
                    Expense.expense_date <= end_date
                )
            )
            .group_by(Category.id, Category.name, Category.icon, Category.color)
            .order_by(func.sum(Expense.amount).desc())
        )
        result = await self.session.execute(query)
        breakdown = []
        for row in result.all():
            breakdown.append({
                "category_id": row.category_id,
                "category_name": row.category_name,
                "category_icon": row.category_icon,
                "category_color": row.category_color,
                "total_amount": Decimal(str(row.total_amount))
            })
        return breakdown
