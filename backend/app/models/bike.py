import uuid
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Numeric,
    DateTime,
    Date,
    Integer,
    Text,
    ForeignKey,
    Uuid,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Bike(Base):
    __tablename__ = "bikes"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    make = Column(String(50), nullable=False)
    model = Column(String(50), nullable=False)
    year = Column(Integer, nullable=True)
    registration_number = Column(String(20), nullable=True)
    initial_odometer = Column(Numeric(10, 2), default=0.0, nullable=False)
    current_odometer = Column(Numeric(10, 2), default=0.0, nullable=False)
    fuel_tank_capacity = Column(Numeric(5, 2), nullable=True)
    fuel_type = Column(String(20), default="PETROL", nullable=False)
    is_primary = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    fuel_logs = relationship("FuelLog", back_populates="bike", cascade="all, delete-orphan", lazy="selectin", order_by="desc(FuelLog.fuel_date)")
    maintenance_records = relationship("BikeMaintenance", back_populates="bike", cascade="all, delete-orphan", lazy="selectin", order_by="desc(BikeMaintenance.service_date)")
    expenses = relationship("BikeExpense", back_populates="bike", cascade="all, delete-orphan", lazy="selectin", order_by="desc(BikeExpense.expense_date)")


class FuelLog(Base):
    __tablename__ = "fuel_logs"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bike_id = Column(Uuid, ForeignKey("bikes.id", ondelete="CASCADE"), nullable=False, index=True)
    fuel_date = Column(Date, nullable=False, index=True)
    odometer_reading = Column(Numeric(10, 2), nullable=False)
    fuel_amount_liters = Column(Numeric(6, 2), nullable=False)
    cost_per_liter = Column(Numeric(6, 2), nullable=True)
    total_cost = Column(Numeric(10, 2), nullable=False)
    is_full_tank = Column(Boolean, default=True, nullable=False)
    distance_traveled = Column(Numeric(10, 2), nullable=True)  # km traveled since previous fuel log
    calculated_mileage = Column(Numeric(6, 2), nullable=True)  # km/L for full tank fill
    fuel_station = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

    bike = relationship("Bike", back_populates="fuel_logs")


class BikeMaintenance(Base):
    __tablename__ = "bike_maintenance"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bike_id = Column(Uuid, ForeignKey("bikes.id", ondelete="CASCADE"), nullable=False, index=True)
    service_date = Column(Date, nullable=False, index=True)
    odometer_reading = Column(Numeric(10, 2), nullable=False)
    service_type = Column(String(50), nullable=False)  # GENERAL_SERVICE, OIL_CHANGE, BRAKES, CHAIN, TYRE, BATTERY, REPAIR, OTHER
    cost = Column(Numeric(10, 2), default=0.0, nullable=False)
    workshop_name = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    next_service_odometer = Column(Numeric(10, 2), nullable=True)
    next_service_date = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

    bike = relationship("Bike", back_populates="maintenance_records")


class BikeExpense(Base):
    __tablename__ = "bike_expenses"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bike_id = Column(Uuid, ForeignKey("bikes.id", ondelete="CASCADE"), nullable=False, index=True)
    expense_date = Column(Date, nullable=False, index=True)
    expense_type = Column(String(50), nullable=False)  # INSURANCE, PUC, TOLL, PARKING, ACCESSORY, FINE, WASH, OTHER
    amount = Column(Numeric(10, 2), nullable=False)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)

    bike = relationship("Bike", back_populates="expenses")
