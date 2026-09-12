import csv
import io
from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.repositories.expense_repo import ExpenseRepository
from app.repositories.bike_repo import BikeRepository

router = APIRouter(prefix="/export", tags=["Data Export"])

@router.get("/expenses.csv")
async def export_expenses_csv(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    repo = ExpenseRepository(db)
    expenses = await repo.list_expenses(user.id, limit=5000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Category", "Amount (INR)", "Payment Method", "Merchant", "Description"
    ])

    for e in expenses:
        cat_name = e.category.name if e.category else "Uncategorized"
        writer.writerow([
            e.expense_date.isoformat(),
            cat_name,
            str(e.amount),
            e.payment_method,
            e.merchant or "",
            e.description or "",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=expenses.csv"},
    )

@router.get("/bike-fuel.csv")
async def export_bike_fuel_csv(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bike_repo = BikeRepository(db)
    bike = await bike_repo.get_primary_bike(user.id)
    if not bike:
        return Response(content="No bike found", media_type="text/plain")

    logs = await bike_repo.get_fuel_logs(bike.id, limit=1000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Odometer (km)", "Fuel (L)", "Total Cost (INR)", "Cost/Liter", "Mileage (km/L)", "Station"
    ])

    for l in logs:
        writer.writerow([
            l.fuel_date.isoformat(),
            str(l.odometer_reading),
            str(l.fuel_amount_liters),
            str(l.total_cost),
            str(l.cost_per_liter or ""),
            str(l.calculated_mileage or ""),
            l.fuel_station or "",
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bike_fuel_logs.csv"},
    )
