from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.recurring_expense_repo import RecurringExpenseRepository
from app.repositories.category_repo import CategoryRepository
from app.schemas.recurring_expense import (
    RecurringExpenseCreate, RecurringExpenseUpdate, RecurringExpenseResponse
)
from app.models.recurring_expense import RecurringExpense
from app.core.exceptions import NotFoundError

class RecurringExpenseService:
    def __init__(
        self,
        recurring_repo: RecurringExpenseRepository,
        category_repo: CategoryRepository,
        session: AsyncSession = None
    ):
        self.recurring_repo = recurring_repo
        self.category_repo = category_repo
        self.session = session

    async def create_recurring(self, user_id: UUID, data: RecurringExpenseCreate) -> RecurringExpenseResponse:
        cat = await self.category_repo.get_by_id(data.category_id)
        if not cat:
            raise NotFoundError("Category not found")

        rec = RecurringExpense(
            user_id=user_id,
            category_id=data.category_id,
            amount=data.amount,
            currency=data.currency,
            description=data.description,
            payment_method=data.payment_method,
            frequency=data.frequency,
            start_date=data.start_date,
            next_due_date=data.next_due_date,
            is_active=data.is_active,
            auto_create=data.auto_create
        )
        created = await self.recurring_repo.create(rec)
        if self.session:
            await self.session.commit()
            created = await self.recurring_repo.get_user_recurring(created.id, user_id)
        return RecurringExpenseResponse.model_validate(created)

    async def list_recurring(self, user_id: UUID, active_only: bool = False) -> List[RecurringExpenseResponse]:
        items = await self.recurring_repo.list_user_recurring(user_id, active_only)
        return [RecurringExpenseResponse.model_validate(i) for i in items]

    async def update_recurring(
        self,
        user_id: UUID,
        rec_id: UUID,
        data: RecurringExpenseUpdate
    ) -> RecurringExpenseResponse:
        rec = await self.recurring_repo.get_user_recurring(rec_id, user_id)
        if not rec:
            raise NotFoundError("Recurring expense not found")

        if data.category_id is not None:
            cat = await self.category_repo.get_by_id(data.category_id)
            if not cat:
                raise NotFoundError("Category not found")
            rec.category_id = data.category_id

        if data.amount is not None:
            rec.amount = data.amount
        if data.description is not None:
            rec.description = data.description
        if data.payment_method is not None:
            rec.payment_method = data.payment_method
        if data.frequency is not None:
            rec.frequency = data.frequency
        if data.next_due_date is not None:
            rec.next_due_date = data.next_due_date
        if data.is_active is not None:
            rec.is_active = data.is_active
        if data.auto_create is not None:
            rec.auto_create = data.auto_create

        await self.recurring_repo.update(rec)
        if self.session:
            await self.session.commit()
            rec = await self.recurring_repo.get_user_recurring(rec_id, user_id)
        return RecurringExpenseResponse.model_validate(rec)

    async def toggle_active(self, user_id: UUID, rec_id: UUID) -> RecurringExpenseResponse:
        rec = await self.recurring_repo.toggle_active(rec_id, user_id)
        if not rec:
            raise NotFoundError("Recurring expense not found")
        if self.session:
            await self.session.commit()
            rec = await self.recurring_repo.get_user_recurring(rec_id, user_id)
        return RecurringExpenseResponse.model_validate(rec)

    async def delete_recurring(self, user_id: UUID, rec_id: UUID) -> bool:
        success = await self.recurring_repo.delete_user_recurring(rec_id, user_id)
        if not success:
            raise NotFoundError("Recurring expense not found")
        if self.session:
            await self.session.commit()
        return True
