from datetime import date
from decimal import Decimal
from typing import List, Optional, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.income_repo import IncomeRepository
from app.schemas.income import IncomeCreate, IncomeUpdate, IncomeResponse, IncomeSummaryResponse
from app.models.income import Income
from app.core.exceptions import NotFoundError

class IncomeService:
    def __init__(self, income_repo: IncomeRepository, session: AsyncSession = None):
        self.income_repo = income_repo
        self.session = session

    async def create_income(self, user_id: UUID, data: IncomeCreate) -> IncomeResponse:
        income = Income(
            user_id=user_id,
            amount=data.amount,
            currency=data.currency,
            source=data.source,
            description=data.description,
            income_date=data.income_date,
            is_recurring=data.is_recurring,
            recurrence_period=data.recurrence_period
        )
        created = await self.income_repo.create(income)
        if self.session:
            await self.session.commit()
            await self.session.refresh(created)
        return IncomeResponse.model_validate(created)

    async def list_income(
        self,
        user_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[IncomeResponse], int]:
        skip = (page - 1) * page_size
        items = await self.income_repo.list_income(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            skip=skip,
            limit=page_size
        )
        total = await self.income_repo.count_income(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )
        return [IncomeResponse.model_validate(i) for i in items], total

    async def update_income(self, user_id: UUID, income_id: UUID, data: IncomeUpdate) -> IncomeResponse:
        income = await self.income_repo.get_user_income(income_id, user_id)
        if not income:
            raise NotFoundError("Income record not found")

        if data.amount is not None:
            income.amount = data.amount
        if data.currency is not None:
            income.currency = data.currency
        if data.source is not None:
            income.source = data.source
        if data.description is not None:
            income.description = data.description
        if data.income_date is not None:
            income.income_date = data.income_date
        if data.is_recurring is not None:
            income.is_recurring = data.is_recurring
        if data.recurrence_period is not None:
            income.recurrence_period = data.recurrence_period

        await self.income_repo.update(income)
        if self.session:
            await self.session.commit()
            await self.session.refresh(income)
        return IncomeResponse.model_validate(income)

    async def delete_income(self, user_id: UUID, income_id: UUID) -> bool:
        success = await self.income_repo.delete_user_income(income_id, user_id)
        if not success:
            raise NotFoundError("Income record not found")
        if self.session:
            await self.session.commit()
        return True

    async def get_summary(self, user_id: UUID) -> IncomeSummaryResponse:
        today = date.today()
        first_of_month = today.replace(day=1)
        month_total = await self.income_repo.get_period_total(user_id, first_of_month, today)
        total_records = await self.income_repo.count_income(user_id, first_of_month, today)
        return IncomeSummaryResponse(
            this_month_total=month_total,
            total_records=total_records
        )
