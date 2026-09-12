from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

# Bike Schemas
class BikeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    make: str = Field(..., min_length=1, max_length=50)
    model: str = Field(..., min_length=1, max_length=50)
    year: Optional[int] = Field(None, ge=1970, le=2100)
    registration_number: Optional[str] = Field(None, max_length=20)
    initial_odometer: Decimal = Field(Decimal("0.0"), ge=0)
    fuel_tank_capacity: Optional[Decimal] = Field(None, gt=0)
    fuel_type: str = Field("PETROL", max_length=20)

class BikeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    make: Optional[str] = Field(None, min_length=1, max_length=50)
    model: Optional[str] = Field(None, min_length=1, max_length=50)
    year: Optional[int] = Field(None, ge=1970, le=2100)
    registration_number: Optional[str] = Field(None, max_length=20)
    fuel_tank_capacity: Optional[Decimal] = Field(None, gt=0)
    fuel_type: Optional[str] = Field(None, max_length=20)

class BikeResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    make: str
    model: str
    year: Optional[int] = None
    registration_number: Optional[str] = None
    initial_odometer: Decimal
    current_odometer: Decimal
    fuel_tank_capacity: Optional[Decimal] = None
    fuel_type: str
    is_primary: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Fuel Log Schemas
class FuelLogCreate(BaseModel):
    fuel_date: date
    odometer_reading: Decimal = Field(..., ge=0)
    fuel_amount_liters: Decimal = Field(..., gt=0)
    cost_per_liter: Optional[Decimal] = Field(None, gt=0)
    total_cost: Decimal = Field(..., gt=0)
    is_full_tank: bool = True
    fuel_station: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None

class FuelLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    bike_id: UUID
    fuel_date: date
    odometer_reading: Decimal
    fuel_amount_liters: Decimal
    cost_per_liter: Optional[Decimal] = None
    total_cost: Decimal
    is_full_tank: bool
    distance_traveled: Optional[Decimal] = None
    calculated_mileage: Optional[Decimal] = None
    fuel_station: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Maintenance Schemas
class BikeMaintenanceCreate(BaseModel):
    service_date: date
    odometer_reading: Decimal = Field(..., ge=0)
    service_type: str = Field("GENERAL_SERVICE", max_length=50)
    cost: Decimal = Field(Decimal("0.0"), ge=0)
    workshop_name: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    next_service_odometer: Optional[Decimal] = Field(None, ge=0)
    next_service_date: Optional[date] = None

class BikeMaintenanceResponse(BaseModel):
    id: UUID
    user_id: UUID
    bike_id: UUID
    service_date: date
    odometer_reading: Decimal
    service_type: str
    cost: Decimal
    workshop_name: Optional[str] = None
    notes: Optional[str] = None
    next_service_odometer: Optional[Decimal] = None
    next_service_date: Optional[date] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Expense Schemas
class BikeExpenseCreate(BaseModel):
    expense_date: date
    expense_type: str = Field("OTHER", max_length=50)
    amount: Decimal = Field(..., gt=0)
    notes: Optional[str] = None

class BikeExpenseResponse(BaseModel):
    id: UUID
    user_id: UUID
    bike_id: UUID
    expense_date: date
    expense_type: str
    amount: Decimal
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Reminders & Dashboard
class ServiceReminder(BaseModel):
    service_type: str
    description: str
    due_km_remaining: Optional[Decimal] = None
    due_date: Optional[date] = None
    is_overdue: bool
    severity: str  # "INFO", "WARNING", "URGENT"

class BikeDashboardSummary(BaseModel):
    bike: BikeResponse
    total_distance_km: Decimal
    average_mileage_kmpl: Decimal
    latest_mileage_kmpl: Optional[Decimal] = None
    total_fuel_cost: Decimal
    total_maintenance_cost: Decimal
    total_other_cost: Decimal
    total_cost_of_ownership: Decimal
    cost_per_km: Decimal
    reminders: List[ServiceReminder] = []
    recent_fuel_logs: List[FuelLogResponse] = []
    recent_maintenance: List[BikeMaintenanceResponse] = []
