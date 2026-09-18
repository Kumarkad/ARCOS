from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.bike import Bike, FuelLog, BikeMaintenance, BikeExpense
from app.schemas.bike import BikeCreate, BikeUpdate, FuelLogCreate, BikeMaintenanceCreate, BikeExpenseCreate

class BikeRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_bike(self, bike_id: UUID, user_id: UUID) -> Optional[Bike]:
        stmt = select(Bike).where(Bike.id == bike_id, Bike.user_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_primary_bike(self, user_id: UUID) -> Optional[Bike]:
        stmt = select(Bike).where(Bike.user_id == user_id).order_by(desc(Bike.is_primary), desc(Bike.created_at))
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_bikes(self, user_id: UUID) -> List[Bike]:
        stmt = select(Bike).where(Bike.user_id == user_id).order_by(desc(Bike.is_primary), desc(Bike.created_at))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_bike(self, user_id: UUID, data: BikeCreate) -> Bike:
        bike = Bike(
            user_id=user_id,
            name=data.name,
            make=data.make,
            model=data.model,
            year=data.year,
            registration_number=data.registration_number,
            initial_odometer=data.initial_odometer,
            current_odometer=data.initial_odometer,
            fuel_tank_capacity=data.fuel_tank_capacity,
            fuel_type=data.fuel_type,
            is_primary=True,
        )
        self.session.add(bike)
        await self.session.commit()
        await self.session.refresh(bike)
        return bike

    async def update_bike(self, bike: Bike, data: BikeUpdate) -> Bike:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(bike, field, value)
        await self.session.commit()
        await self.session.refresh(bike)
        return bike

    async def delete_bike(self, bike: Bike) -> bool:
        await self.session.delete(bike)
        await self.session.commit()
        return True

    # Fuel Logs
    async def get_fuel_logs(self, bike_id: UUID, limit: int = 50) -> List[FuelLog]:
        stmt = select(FuelLog).where(FuelLog.bike_id == bike_id).order_by(desc(FuelLog.odometer_reading), desc(FuelLog.fuel_date)).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_latest_fuel_log(self, bike_id: UUID) -> Optional[FuelLog]:
        stmt = select(FuelLog).where(FuelLog.bike_id == bike_id).order_by(desc(FuelLog.odometer_reading), desc(FuelLog.fuel_date)).limit(1)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create_fuel_log(
        self,
        user_id: UUID,
        bike_id: UUID,
        data: FuelLogCreate,
        distance_traveled: Optional[Decimal] = None,
        calculated_mileage: Optional[Decimal] = None,
    ) -> FuelLog:
        log = FuelLog(
            user_id=user_id,
            bike_id=bike_id,
            fuel_date=data.fuel_date,
            odometer_reading=data.odometer_reading,
            fuel_amount_liters=data.fuel_amount_liters,
            cost_per_liter=data.cost_per_liter or (data.total_cost / data.fuel_amount_liters),
            total_cost=data.total_cost,
            is_full_tank=data.is_full_tank,
            distance_traveled=distance_traveled,
            calculated_mileage=calculated_mileage,
            fuel_station=data.fuel_station,
            notes=data.notes,
        )
        self.session.add(log)
        await self.session.commit()
        await self.session.refresh(log)
        return log

    # Maintenance
    async def get_maintenance_records(self, bike_id: UUID, limit: int = 50) -> List[BikeMaintenance]:
        stmt = select(BikeMaintenance).where(BikeMaintenance.bike_id == bike_id).order_by(desc(BikeMaintenance.service_date)).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_maintenance(
        self,
        user_id: UUID,
        bike_id: UUID,
        data: BikeMaintenanceCreate,
    ) -> BikeMaintenance:
        m = BikeMaintenance(
            user_id=user_id,
            bike_id=bike_id,
            service_date=data.service_date,
            odometer_reading=data.odometer_reading,
            service_type=data.service_type,
            cost=data.cost,
            workshop_name=data.workshop_name,
            notes=data.notes,
            next_service_odometer=data.next_service_odometer,
            next_service_date=data.next_service_date,
        )
        self.session.add(m)
        await self.session.commit()
        await self.session.refresh(m)
        return m

    # Other Expenses
    async def get_expenses(self, bike_id: UUID, limit: int = 50) -> List[BikeExpense]:
        stmt = select(BikeExpense).where(BikeExpense.bike_id == bike_id).order_by(desc(BikeExpense.expense_date)).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_expense(
        self,
        user_id: UUID,
        bike_id: UUID,
        data: BikeExpenseCreate,
    ) -> BikeExpense:
        exp = BikeExpense(
            user_id=user_id,
            bike_id=bike_id,
            expense_date=data.expense_date,
            expense_type=data.expense_type,
            amount=data.amount,
            notes=data.notes,
        )
        self.session.add(exp)
        await self.session.commit()
        await self.session.refresh(exp)
        return exp
