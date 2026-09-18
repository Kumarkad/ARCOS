from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.budget_repo import BudgetRepository
from app.repositories.category_repo import CategoryRepository
from app.models.budget import Budget, BudgetCategory
from app.schemas.budget import (
    BudgetCreate, BudgetUpdate, BudgetResponse, BudgetCategoryStatus
)
from app.core.exceptions import NotFoundError, ValidationError

class BudgetService:
    def __init__(
        self,
        budget_repo: BudgetRepository,
        category_repo: CategoryRepository,
        session: AsyncSession = None
    ):
        self.budget_repo = budget_repo
        self.category_repo = category_repo
        self.session = session

    async def _populate_budget_status(self, budget: Budget, user_id: UUID) -> BudgetResponse:
        total_spent = await self.budget_repo.get_total_spent_for_period(
            user_id=user_id,
            start_date=budget.start_date,
            end_date=budget.end_date
        )

        category_statuses: List[BudgetCategoryStatus] = []
        for bc in budget.categories:
            spent = await self.budget_repo.get_spent_for_category(
                user_id=user_id,
                category_id=bc.category_id,
                start_date=budget.start_date,
                end_date=budget.end_date
            )
            alloc = bc.allocated_amount
            remaining = alloc - spent
            pct = round(float(spent / alloc * 100), 1) if alloc > 0 else 0.0

            if pct >= 100.0:
                status = "EXCEEDED"
                warning = f"🚨 Exceeded by ₹{abs(remaining):,.2f}!"
            elif pct >= 80.0:
                status = "WARNING"
                warning = f"⚠️ You have used {pct}% of your {bc.category.name if bc.category else 'Category'} budget."
            else:
                status = "NORMAL"
                warning = None

            category_statuses.append(
                BudgetCategoryStatus(
                    category_id=bc.category_id,
                    category_name=bc.category.name if bc.category else "Category",
                    category_icon=bc.category.icon if bc.category else None,
                    category_color=bc.category.color if bc.category else None,
                    allocated_amount=alloc,
                    spent_amount=spent,
                    remaining_amount=remaining,
                    utilization_pct=pct,
                    status=status,
                    warning_message=warning
                )
            )

        overall_alloc = budget.total_amount
        total_rem = overall_alloc - total_spent
        overall_pct = round(float(total_spent / overall_alloc * 100), 1) if overall_alloc > 0 else 0.0
        overall_status = "NORMAL"
        if overall_pct >= 100.0:
            overall_status = "EXCEEDED"
        elif overall_pct >= 80.0:
            overall_status = "WARNING"

        return BudgetResponse(
            id=budget.id,
            user_id=budget.user_id,
            name=budget.name,
            total_amount=budget.total_amount,
            period=budget.period,
            start_date=budget.start_date,
            end_date=budget.end_date,
            is_active=budget.is_active,
            created_at=budget.created_at,
            total_spent=total_spent,
            total_remaining=total_rem,
            total_utilization_pct=overall_pct,
            overall_status=overall_status,
            categories=category_statuses
        )

    async def create_budget(self, user_id: UUID, data: BudgetCreate) -> BudgetResponse:
        budget = Budget(
            user_id=user_id,
            name=data.name,
            total_amount=data.total_amount,
            period=data.period,
            start_date=data.start_date,
            end_date=data.end_date,
            is_active=True
        )

        # Add category allocations
        for c in data.categories:
            cat = await self.category_repo.get_by_id(c.category_id)
            if not cat:
                raise NotFoundError(f"Category {c.category_id} not found")
            bc = BudgetCategory(
                category_id=c.category_id,
                allocated_amount=c.allocated_amount
            )
            budget.categories.append(bc)

        created = await self.budget_repo.create(budget)
        if self.session:
            await self.session.commit()
            created = await self.budget_repo.get_user_budget(created.id, user_id)

        return await self._populate_budget_status(created, user_id)

    async def get_budget(self, user_id: UUID, budget_id: UUID) -> BudgetResponse:
        budget = await self.budget_repo.get_user_budget(budget_id, user_id)
        if not budget:
            raise NotFoundError("Budget not found")
        return await self._populate_budget_status(budget, user_id)

    async def list_budgets(self, user_id: UUID, active_only: bool = False) -> List[BudgetResponse]:
        budgets = await self.budget_repo.list_user_budgets(user_id, active_only)
        results = []
        for b in budgets:
            results.append(await self._populate_budget_status(b, user_id))
        return results

    async def delete_budget(self, user_id: UUID, budget_id: UUID) -> bool:
        success = await self.budget_repo.delete_user_budget(budget_id, user_id)
        if not success:
            raise NotFoundError("Budget not found")
        if self.session:
            await self.session.commit()
        return True
