import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.bike_repo import BikeRepository
from app.services.bike_service import BikeService
from app.schemas.bike import (
    BikeCreate,
    FuelLogCreate,
    BikeMaintenanceCreate,
    BikeExpenseCreate,
)

@pytest.mark.asyncio
async def test_bike_lifecycle_and_mileage_calculation(db_session: AsyncSession, test_user):
    repo = BikeRepository(db_session)
    service = BikeService(repo, session=db_session)

    # 1. List bikes auto-creates default bike
    bikes = await service.list_bikes(test_user.id)
    assert len(bikes) == 1
    bike = bikes[0]
    assert bike.name == "My Bike"
    assert bike.initial_odometer == Decimal("0.0")

    # Update bike details
    bike_custom = await service.create_bike(
        test_user.id,
        BikeCreate(
            name="Hunter 350 Dapper Ash",
            make="Royal Enfield",
            model="Hunter 350",
            initial_odometer=Decimal("1000.0"),
            fuel_tank_capacity=Decimal("13.0"),
            fuel_type="PETROL",
        ),
    )
    assert bike_custom.initial_odometer == Decimal("1000.0")
    assert bike_custom.current_odometer == Decimal("1000.0")

    # 2. Refill 1 (Initial full tank at 1000 km)
    log1 = await service.record_fuel_log(
        test_user.id,
        bike_custom.id,
        FuelLogCreate(
            fuel_date=date(2026, 3, 1),
            odometer_reading=Decimal("1000.0"),
            fuel_amount_liters=Decimal("10.0"),
            cost_per_liter=Decimal("102.50"),
            total_cost=Decimal("1025.00"),
            is_full_tank=True,
            fuel_station="HP Petrol Pump",
        ),
    )
    assert log1.calculated_mileage is None  # Baseline fill, cannot calculate mileage yet

    # 3. Refill 2 (Full tank at 1350 km, 10 Liters) -> 350 km / 10 L = 35 km/L
    log2 = await service.record_fuel_log(
        test_user.id,
        bike_custom.id,
        FuelLogCreate(
            fuel_date=date(2026, 3, 10),
            odometer_reading=Decimal("1350.0"),
            fuel_amount_liters=Decimal("10.0"),
            total_cost=Decimal("1030.00"),
            is_full_tank=True,
            fuel_station="Indian Oil",
        ),
    )
    assert log2.distance_traveled == Decimal("350.0")
    assert log2.calculated_mileage == Decimal("35.00")

    # Verify bike odometer auto-updated
    updated_bike = await service.get_bike(test_user.id, bike_custom.id)
    assert updated_bike.current_odometer == Decimal("1350.0")

    # 4. Record Maintenance
    maint = await service.record_maintenance(
        test_user.id,
        bike_custom.id,
        BikeMaintenanceCreate(
            service_date=date(2026, 3, 12),
            odometer_reading=Decimal("1350.0"),
            service_type="OIL_CHANGE",
            cost=Decimal("850.00"),
            workshop_name="RE Service Center",
            next_service_odometer=Decimal("1500.0"),  # 150 km left -> Should trigger warning!
        ),
    )
    assert maint.cost == Decimal("850.00")

    # 5. Record Vehicle Expense (PUC & Toll)
    exp = await service.record_expense(
        test_user.id,
        bike_custom.id,
        BikeExpenseCreate(
            expense_date=date(2026, 3, 12),
            expense_type="PUC",
            amount=Decimal("100.00"),
            notes="Annual PUC Certificate",
        ),
    )
    assert exp.amount == Decimal("100.00")

    # 6. Verify Dashboard Summary
    dash = await service.get_dashboard(test_user.id, bike_custom.id)
    # Total distance: 1350 - 1000 = 350 km
    assert dash.total_distance_km == Decimal("350.0")
    # Mileage: 35.00
    assert dash.average_mileage_kmpl == Decimal("35.00")
    assert dash.latest_mileage_kmpl == Decimal("35.00")
    # Total fuel: 1025 + 1030 = 2055
    assert dash.total_fuel_cost == Decimal("2055.00")
    # Total maintenance: 850
    assert dash.total_maintenance_cost == Decimal("850.00")
    # Total other: 100
    assert dash.total_other_cost == Decimal("100.00")
    # TCO: 2055 + 850 + 100 = 3005
    assert dash.total_cost_of_ownership == Decimal("3005.00")
    # Cost per km: 3005 / 350 = 8.59
    assert dash.cost_per_km == Decimal("8.59")
    # Reminders: due in 150 km (< 300 km threshold)
    assert len(dash.reminders) >= 1
    assert dash.reminders[0].severity == "WARNING"
    assert dash.reminders[0].due_km_remaining == Decimal("150.0")
