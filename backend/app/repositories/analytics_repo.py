from datetime import date
from decimal import Decimal
from typing import List, Dict, Any
from uuid import UUID
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.expense import Expense
from app.models.category import Category

class AnalyticsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_total_spend_and_count(
        self,
        user_id: UUID,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        query = select(
            func.coalesce(func.sum(Expense.amount), Decimal("0.00")).label("total"),
            func.count(Expense.id).label("count")
        ).where(
            and_(
                Expense.user_id == user_id,
                Expense.deleted_at.is_(None),
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date
            )
        )
        result = await self.session.execute(query)
        row = result.one()
        return {
            "total": Decimal(str(row.total)),
            "count": int(row.count)
        }

    async def get_top_merchants(
        self,
        user_id: UUID,
        start_date: date,
        end_date: date,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        query = (
            select(
                Expense.merchant,
                func.sum(Expense.amount).label("total_amount"),
                func.count(Expense.id).label("count")
            )
            .where(
                and_(
                    Expense.user_id == user_id,
                    Expense.deleted_at.is_(None),
                    Expense.merchant.is_not(None),
                    Expense.merchant != "",
                    Expense.expense_date >= start_date,
                    Expense.expense_date <= end_date
                )
            )
            .group_by(Expense.merchant)
            .order_by(func.sum(Expense.amount).desc())
            .limit(limit)
        )
        result = await self.session.execute(query)
        return [
            {
                "merchant": row.merchant,
                "total_amount": Decimal(str(row.total_amount)),
                "count": int(row.count)
            }
            for row in result.all()
        ]

    async def get_payment_methods(
        self,
        user_id: UUID,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        query = (
            select(
                Expense.payment_method,
                func.sum(Expense.amount).label("total_amount")
            )
            .where(
                and_(
                    Expense.user_id == user_id,
                    Expense.deleted_at.is_(None),
                    Expense.expense_date >= start_date,
                    Expense.expense_date <= end_date
                )
            )
            .group_by(Expense.payment_method)
            .order_by(func.sum(Expense.amount).desc())
        )
        result = await self.session.execute(query)
        rows = result.all()
        total_all = sum((row.total_amount for row in rows), Decimal("0.00"))
        
        breakdown = []
        for r in rows:
            pct = round(float(r.total_amount / total_all) * 100, 2) if total_all > 0 else 0.0
            breakdown.append({
                "payment_method": r.payment_method,
                "total_amount": Decimal(str(r.total_amount)),
                "percentage": pct
            })
        return breakdown

    async def get_category_spending(
        self,
        user_id: UUID,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        query = (
            select(
                Category.name.label("category_name"),
                Category.color.label("color"),
                Category.icon.label("icon"),
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
            .group_by(Category.name, Category.color, Category.icon)
            .order_by(func.sum(Expense.amount).desc())
        )
        result = await self.session.execute(query)
        return [
            {
                "category_name": row.category_name,
                "color": row.color or "#6C63FF",
                "icon": row.icon or "pricetag-outline",
                "total_amount": Decimal(str(row.total_amount))
            }
            for row in result.all()
        ]

    async def get_daily_spending(
        self,
        user_id: UUID,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        query = (
            select(
                Expense.expense_date.label("expense_date"),
                func.sum(Expense.amount).label("total_amount")
            )
            .where(
                and_(
                    Expense.user_id == user_id,
                    Expense.deleted_at.is_(None),
                    Expense.expense_date >= start_date,
                    Expense.expense_date <= end_date
                )
            )
            .group_by(Expense.expense_date)
            .order_by(Expense.expense_date.asc())
        )
        result = await self.session.execute(query)
        return [
            {
                "expense_date": row.expense_date,
                "total_amount": Decimal(str(row.total_amount))
            }
            for row in result.all()
        ]
