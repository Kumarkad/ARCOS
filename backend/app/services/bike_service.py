from datetime import date
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.repositories.bike_repo import BikeRepository
from app.models.bike import Bike
from app.schemas.bike import (
    BikeCreate,
    BikeUpdate,
    BikeResponse,
    FuelLogCreate,
    FuelLogResponse,
    BikeMaintenanceCreate,
    BikeMaintenanceResponse,
    BikeExpenseCreate,
    BikeExpenseResponse,
    ServiceReminder,
    BikeDashboardSummary,
)

class BikeService:
    def __init__(self, repo: BikeRepository, session: Optional[AsyncSession] = None):
        self.repo = repo
        self.session = session

    async def list_bikes(self, user_id: UUID) -> List[BikeResponse]:
        bikes = await self.repo.list_bikes(user_id)
        if not bikes:
            # Auto-create initial bike
            default_bike = await self.repo.create_bike(
                user_id,
                BikeCreate(
                    name="My Bike",
                    make="Royal Enfield",
                    model="Hunter 350",
                    initial_odometer=Decimal("0.0"),
                    fuel_tank_capacity=Decimal("13.0"),
                    fuel_type="PETROL",
                ),
            )
            bikes = [default_bike]
        return [BikeResponse.model_validate(b) for b in bikes]

    async def get_bike(self, user_id: UUID, bike_id: UUID) -> Bike:
        bike = await self.repo.get_bike(bike_id, user_id)
        if not bike:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bike not found")
        return bike

    async def create_bike(self, user_id: UUID, data: BikeCreate) -> BikeResponse:
        bike = await self.repo.create_bike(user_id, data)
        return BikeResponse.model_validate(bike)

    async def update_bike(self, user_id: UUID, bike_id: UUID, data: BikeUpdate) -> BikeResponse:
        bike = await self.get_bike(user_id, bike_id)
        updated = await self.repo.update_bike(bike, data)
        return BikeResponse.model_validate(updated)

    async def delete_bike(self, user_id: UUID, bike_id: UUID) -> bool:
        bike = await self.get_bike(user_id, bike_id)
        return await self.repo.delete_bike(bike)

    # Fuel Logs & Mileage Algorithm
    async def record_fuel_log(
        self, user_id: UUID, bike_id: UUID, data: FuelLogCreate
    ) -> FuelLogResponse:
        bike = await self.get_bike(user_id, bike_id)

        # Look up previous log to calculate trip distance and mileage
        prev_log = await self.repo.get_latest_fuel_log(bike_id)
        distance: Optional[Decimal] = None
        mileage: Optional[Decimal] = None

        if prev_log and data.odometer_reading > prev_log.odometer_reading:
            distance = data.odometer_reading - prev_log.odometer_reading
            if data.is_full_tank and prev_log.is_full_tank and data.fuel_amount_liters > 0:
                mileage = round(distance / data.fuel_amount_liters, 2)
        elif not prev_log and data.odometer_reading > bike.initial_odometer:
            distance = data.odometer_reading - bike.initial_odometer

        log = await self.repo.create_fuel_log(
            user_id=user_id,
            bike_id=bike_id,
            data=data,
            distance_traveled=distance,
            calculated_mileage=mileage,
        )

        # Update current odometer on the bike if newer
        if data.odometer_reading > bike.current_odometer:
            bike.current_odometer = data.odometer_reading
            if self.session:
                await self.session.commit()

        return FuelLogResponse.model_validate(log)

    async def list_fuel_logs(self, user_id: UUID, bike_id: UUID) -> List[FuelLogResponse]:
        await self.get_bike(user_id, bike_id)
        logs = await self.repo.get_fuel_logs(bike_id)
        return [FuelLogResponse.model_validate(l) for l in logs]

    # Maintenance
    async def record_maintenance(
        self, user_id: UUID, bike_id: UUID, data: BikeMaintenanceCreate
    ) -> BikeMaintenanceResponse:
        bike = await self.get_bike(user_id, bike_id)
        record = await self.repo.create_maintenance(user_id, bike_id, data)

        if data.odometer_reading > bike.current_odometer:
            bike.current_odometer = data.odometer_reading
            if self.session:
                await self.session.commit()

        return BikeMaintenanceResponse.model_validate(record)

    async def list_maintenance(self, user_id: UUID, bike_id: UUID) -> List[BikeMaintenanceResponse]:
        await self.get_bike(user_id, bike_id)
        records = await self.repo.get_maintenance_records(bike_id)
        return [BikeMaintenanceResponse.model_validate(r) for r in records]

    # Other Expenses
    async def record_expense(
        self, user_id: UUID, bike_id: UUID, data: BikeExpenseCreate
    ) -> BikeExpenseResponse:
        await self.get_bike(user_id, bike_id)
        exp = await self.repo.create_expense(user_id, bike_id, data)
        return BikeExpenseResponse.model_validate(exp)

    async def list_expenses(self, user_id: UUID, bike_id: UUID) -> List[BikeExpenseResponse]:
        await self.get_bike(user_id, bike_id)
        expenses = await self.repo.get_expenses(bike_id)
        return [BikeExpenseResponse.model_validate(e) for e in expenses]

    # Dashboard & Cost Calculations
    async def get_dashboard(self, user_id: UUID, bike_id: UUID) -> BikeDashboardSummary:
        bike = await self.get_bike(user_id, bike_id)
        fuel_logs = await self.repo.get_fuel_logs(bike_id, limit=100)
        maintenance = await self.repo.get_maintenance_records(bike_id, limit=50)
        expenses = await self.repo.get_expenses(bike_id, limit=50)

        # Distance
        total_distance = max(Decimal("0.0"), bike.current_odometer - bike.initial_odometer)

        # Fuel stats
        total_fuel_cost = sum((l.total_cost for l in fuel_logs), Decimal("0.0"))
        
        # Calculate weighted average mileage for all segments with calculated_mileage
        total_mileage_distance = Decimal("0.0")
        total_mileage_fuel = Decimal("0.0")
        latest_mileage: Optional[Decimal] = None

        for l in fuel_logs:
            if l.calculated_mileage is not None:
                if latest_mileage is None:
                    latest_mileage = l.calculated_mileage
                if l.distance_traveled is not None:
                    total_mileage_distance += l.distance_traveled
                    total_mileage_fuel += l.fuel_amount_liters

        avg_mileage = (
            round(total_mileage_distance / total_mileage_fuel, 2)
            if total_mileage_fuel > 0
            else Decimal("0.0")
        )

        # Maintenance & Other expenses
        total_maint_cost = sum((m.cost for m in maintenance), Decimal("0.0"))
        total_other_cost = sum((e.amount for e in expenses), Decimal("0.0"))
        total_tco = total_fuel_cost + total_maint_cost + total_other_cost

        cost_per_km = (
            round(total_tco / total_distance, 2)
            if total_distance > 0
            else Decimal("0.0")
        )

        # Service Reminders
        today = date.today()
        reminders: List[ServiceReminder] = []

        for m in maintenance:
            if m.next_service_odometer:
                diff_km = m.next_service_odometer - bike.current_odometer
                if diff_km <= 0:
                    reminders.append(
                        ServiceReminder(
                            service_type=m.service_type,
                            description=f"{m.service_type.replace('_', ' ').title()} is overdue by {abs(diff_km)} km!",
                            due_km_remaining=diff_km,
                            is_overdue=True,
                            severity="URGENT",
                        )
                    )
                elif diff_km <= 300:
                    reminders.append(
                        ServiceReminder(
                            service_type=m.service_type,
                            description=f"{m.service_type.replace('_', ' ').title()} due in {diff_km} km",
                            due_km_remaining=diff_km,
                            is_overdue=False,
                            severity="WARNING",
                        )
                    )

            if m.next_service_date:
                days_left = (m.next_service_date - today).days
                if days_left <= 0:
                    reminders.append(
                        ServiceReminder(
                            service_type=m.service_type,
                            description=f"{m.service_type.replace('_', ' ').title()} service date passed ({abs(days_left)} days ago)",
                            due_date=m.next_service_date,
                            is_overdue=True,
                            severity="URGENT",
                        )
                    )
                elif days_left <= 15:
                    reminders.append(
                        ServiceReminder(
                            service_type=m.service_type,
                            description=f"{m.service_type.replace('_', ' ').title()} due in {days_left} days",
                            due_date=m.next_service_date,
                            is_overdue=False,
                            severity="WARNING",
                        )
                    )

        return BikeDashboardSummary(
            bike=BikeResponse.model_validate(bike),
            total_distance_km=total_distance,
            average_mileage_kmpl=avg_mileage,
            latest_mileage_kmpl=latest_mileage,
            total_fuel_cost=total_fuel_cost,
            total_maintenance_cost=total_maint_cost,
            total_other_cost=total_other_cost,
            total_cost_of_ownership=total_tco,
            cost_per_km=cost_per_km,
            reminders=reminders[:5],
            recent_fuel_logs=[FuelLogResponse.model_validate(l) for l in fuel_logs[:5]],
            recent_maintenance=[BikeMaintenanceResponse.model_validate(m) for m in maintenance[:5]],
        )
