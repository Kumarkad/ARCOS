from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
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
    BikeDashboardSummary,
)
from app.schemas.common import APIResponse
from app.repositories.bike_repo import BikeRepository
from app.services.bike_service import BikeService

router = APIRouter(prefix="/bikes", tags=["Bike & Vehicle Tracker"])

def get_bike_service(db: AsyncSession = Depends(get_db)) -> BikeService:
    repo = BikeRepository(db)
    return BikeService(repo, session=db)

@router.get("", response_model=APIResponse[List[BikeResponse]])
async def list_bikes(
    user: User = Depends(get_current_user),
    service: BikeService = Depends(get_bike_service),
):
    bikes = await service.list_bikes(user.id)
    return APIResponse(data=bikes)

@router.post("", response_model=APIResponse[BikeResponse])
async def create_bike(
    data: BikeCreate,
    user: User = Depends(get_current_user),
    service: BikeService = Depends(get_bike_service),
):
    bike = await service.create_bike(user.id, data)
    return APIResponse(data=bike, message="Bike created successfully")

@router.put("/{bike_id}", response_model=APIResponse[BikeResponse])
async def update_bike(
    bike_id: UUID,
    data: BikeUpdate,
    user: User = Depends(get_current_user),
    service: BikeService = Depends(get_bike_service),
):
    bike = await service.update_bike(user.id, bike_id, data)
    return APIResponse(data=bike, message="Bike updated successfully")

@router.delete("/{bike_id}", response_model=APIResponse[bool])
async def delete_bike(
    bike_id: UUID,
    user: User = Depends(get_current_user),
    service: BikeService = Depends(get_bike_service),
):
    result = await service.delete_bike(user.id, bike_id)
    return APIResponse(data=result, message="Bike deleted successfully")

@router.get("/{bike_id}/dashboard", response_model=APIResponse[BikeDashboardSummary])
async def get_dashboard(
    bike_id: UUID,
    user: User = Depends(get_current_user),
    service: BikeService = Depends(get_bike_service),
):
    summary = await service.get_dashboard(user.id, bike_id)
    return APIResponse(data=summary)

# Fuel Endpoints
@router.get("/{bike_id}/fuel", response_model=APIResponse[List[FuelLogResponse]])
async def list_fuel_logs(
    bike_id: UUID,
    user: User = Depends(get_current_user),
    service: BikeService = Depends(get_bike_service),
):
    logs = await service.list_fuel_logs(user.id, bike_id)
    return APIResponse(data=logs)

@router.post("/{bike_id}/fuel", response_model=APIResponse[FuelLogResponse])
async def record_fuel_log(
    bike_id: UUID,
    data: FuelLogCreate,
    user: User = Depends(get_current_user),
    service: BikeService = Depends(get_bike_service),
):
    log = await service.record_fuel_log(user.id, bike_id, data)
    return APIResponse(data=log, message="Fuel refill logged")

# Maintenance Endpoints
@router.get("/{bike_id}/maintenance", response_model=APIResponse[List[BikeMaintenanceResponse]])
async def list_maintenance(
    bike_id: UUID,
    user: User = Depends(get_current_user),
    service: BikeService = Depends(get_bike_service),
):
    records = await service.list_maintenance(user.id, bike_id)
    return APIResponse(data=records)

@router.post("/{bike_id}/maintenance", response_model=APIResponse[BikeMaintenanceResponse])
async def record_maintenance(
    bike_id: UUID,
    data: BikeMaintenanceCreate,
    user: User = Depends(get_current_user),
    service: BikeService = Depends(get_bike_service),
):
    m = await service.record_maintenance(user.id, bike_id, data)
    return APIResponse(data=m, message="Maintenance logged")

# Expenses Endpoints
@router.get("/{bike_id}/expenses", response_model=APIResponse[List[BikeExpenseResponse]])
async def list_expenses(
    bike_id: UUID,
    user: User = Depends(get_current_user),
    service: BikeService = Depends(get_bike_service),
):
    expenses = await service.list_expenses(user.id, bike_id)
    return APIResponse(data=expenses)

@router.post("/{bike_id}/expenses", response_model=APIResponse[BikeExpenseResponse])
async def record_expense(
    bike_id: UUID,
    data: BikeExpenseCreate,
    user: User = Depends(get_current_user),
    service: BikeService = Depends(get_bike_service),
):
    exp = await service.record_expense(user.id, bike_id, data)
    return APIResponse(data=exp, message="Vehicle expense logged")
