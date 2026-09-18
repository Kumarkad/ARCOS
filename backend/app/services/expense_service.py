from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.expense_repo import ExpenseRepository
from app.repositories.category_repo import CategoryRepository
from app.schemas.expense import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    ExpenseBulkCreate, ExpenseSummaryResponse, CategorySpend
)
from app.models.expense import Expense
from app.core.exceptions import NotFoundError, ValidationError

class ExpenseService:
    def __init__(
        self,
        expense_repo: ExpenseRepository,
        category_repo: CategoryRepository,
        session: AsyncSession = None
    ):
        self.expense_repo = expense_repo
        self.category_repo = category_repo
        self.session = session

    async def create_expense(self, user_id: UUID, data: ExpenseCreate) -> ExpenseResponse:
        # Check idempotency
        if data.idempotency_key:
            existing = await self.expense_repo.get_by_idempotency_key(data.idempotency_key, user_id)
            if existing:
                return ExpenseResponse.model_validate(existing)

        # Validate category
        cat = await self.category_repo.get_by_id(data.category_id)
        if not cat:
            raise NotFoundError("Category not found")

        expense = Expense(
            user_id=user_id,
            category_id=data.category_id,
            amount=data.amount,
            currency=data.currency,
            description=data.description,
            merchant=data.merchant,
            payment_method=data.payment_method,
            expense_date=data.expense_date,
            notes=data.notes,
            idempotency_key=data.idempotency_key
        )
        created = await self.expense_repo.create(expense)
        if self.session:
            await self.session.commit()
            # Fetch with category joined
            created = await self.expense_repo.get_user_expense(created.id, user_id)
        return ExpenseResponse.model_validate(created)

    async def bulk_create_expenses(self, user_id: UUID, data: ExpenseBulkCreate) -> List[ExpenseResponse]:
        results: List[ExpenseResponse] = []
        for item in data.expenses:
            res = await self.create_expense(user_id, item)
            results.append(res)
        return results

    async def get_expense(self, user_id: UUID, expense_id: UUID) -> ExpenseResponse:
        expense = await self.expense_repo.get_user_expense(expense_id, user_id)
        if not expense:
            raise NotFoundError("Expense not found")
        return ExpenseResponse.model_validate(expense)

    async def list_expenses(
        self,
        user_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category_id: Optional[UUID] = None,
        payment_method: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[ExpenseResponse], int]:
        skip = (page - 1) * page_size
        expenses = await self.expense_repo.list_expenses(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            category_id=category_id,
            payment_method=payment_method,
            skip=skip,
            limit=page_size
        )
        total = await self.expense_repo.count_expenses(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            category_id=category_id,
            payment_method=payment_method
        )
        return [ExpenseResponse.model_validate(e) for e in expenses], total

    async def update_expense(self, user_id: UUID, expense_id: UUID, data: ExpenseUpdate) -> ExpenseResponse:
        expense = await self.expense_repo.get_user_expense(expense_id, user_id)
        if not expense:
            raise NotFoundError("Expense not found")

        if data.category_id is not None:
            cat = await self.category_repo.get_by_id(data.category_id)
            if not cat:
                raise NotFoundError("Category not found")
            expense.category_id = data.category_id

        if data.amount is not None:
            expense.amount = data.amount
        if data.currency is not None:
            expense.currency = data.currency
        if data.description is not None:
            expense.description = data.description
        if data.merchant is not None:
            expense.merchant = data.merchant
        if data.payment_method is not None:
            expense.payment_method = data.payment_method
        if data.expense_date is not None:
            expense.expense_date = data.expense_date
        if data.notes is not None:
            expense.notes = data.notes

        await self.expense_repo.update(expense)
        if self.session:
            await self.session.commit()
            expense = await self.expense_repo.get_user_expense(expense_id, user_id)
        return ExpenseResponse.model_validate(expense)

    async def delete_expense(self, user_id: UUID, expense_id: UUID) -> bool:
        success = await self.expense_repo.soft_delete(expense_id, user_id)
        if not success:
            raise NotFoundError("Expense not found")
        if self.session:
            await self.session.commit()
        return True

    async def get_summary(self, user_id: UUID) -> ExpenseSummaryResponse:
        today = date.today()
        first_of_month = today.replace(day=1)

        today_total = await self.expense_repo.get_period_total(user_id, today, today)
        month_total = await self.expense_repo.get_period_total(user_id, first_of_month, today)
        total_count = await self.expense_repo.count_expenses(user_id, first_of_month, today)

        raw_breakdown = await self.expense_repo.get_category_breakdown(user_id, first_of_month, today)
        category_spends: List[CategorySpend] = []

        total_breakdown_sum = sum((item["total_amount"] for item in raw_breakdown), Decimal("0.00"))

        for item in raw_breakdown:
            pct = 0.0
            if total_breakdown_sum > 0:
                pct = round(float(item["total_amount"] / total_breakdown_sum) * 100, 2)
            category_spends.append(CategorySpend(
                category_id=item["category_id"],
                category_name=item["category_name"],
                category_icon=item["category_icon"],
                category_color=item["category_color"],
                total_amount=item["total_amount"],
                percentage=pct
            ))

        return ExpenseSummaryResponse(
            today_total=today_total,
            this_month_total=month_total,
            total_expenses_count=total_count,
            category_breakdown=category_spends
        )
