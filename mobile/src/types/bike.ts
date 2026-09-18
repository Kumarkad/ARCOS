export interface Bike {
  id: string;
  user_id: string;
  name: string;
  make: string;
  model: string;
  year?: number;
  registration_number?: string;
  initial_odometer: number;
  current_odometer: number;
  fuel_tank_capacity?: number;
  fuel_type: string;
  is_primary: boolean;
  created_at: string;
}

export interface FuelLog {
  id: string;
  user_id: string;
  bike_id: string;
  fuel_date: string;
  odometer_reading: number;
  fuel_amount_liters: number;
  cost_per_liter?: number;
  total_cost: number;
  is_full_tank: boolean;
  distance_traveled?: number;
  calculated_mileage?: number;
  fuel_station?: string;
  notes?: string;
  created_at: string;
}

export interface FuelLogCreatePayload {
  fuel_date: string;
  odometer_reading: number;
  fuel_amount_liters: number;
  cost_per_liter?: number;
  total_cost: number;
  is_full_tank: boolean;
  fuel_station?: string;
  notes?: string;
}

export interface BikeMaintenance {
  id: string;
  user_id: string;
  bike_id: string;
  service_date: string;
  odometer_reading: number;
  service_type: string;
  cost: number;
  workshop_name?: string;
  notes?: string;
  next_service_odometer?: number;
  next_service_date?: string;
  created_at: string;
}

export interface BikeMaintenanceCreatePayload {
  service_date: string;
  odometer_reading: number;
  service_type: string;
  cost: number;
  workshop_name?: string;
  notes?: string;
  next_service_odometer?: number;
  next_service_date?: string;
}

export interface BikeExpense {
  id: string;
  user_id: string;
  bike_id: string;
  expense_date: string;
  expense_type: string;
  amount: number;
  notes?: string;
  created_at: string;
}

export interface BikeExpenseCreatePayload {
  expense_date: string;
  expense_type: string;
  amount: number;
  notes?: string;
}

export interface ServiceReminder {
  service_type: string;
  description: string;
  due_km_remaining?: number;
  due_date?: string;
  is_overdue: boolean;
  severity: 'INFO' | 'WARNING' | 'URGENT';
}

export interface BikeDashboardSummary {
  bike: Bike;
  total_distance_km: number;
  average_mileage_kmpl: number;
  latest_mileage_kmpl?: number;
  total_fuel_cost: number;
  total_maintenance_cost: number;
  total_other_cost: number;
  total_cost_of_ownership: number;
  cost_per_km: number;
  reminders: ServiceReminder[];
  recent_fuel_logs: FuelLog[];
  recent_maintenance: BikeMaintenance[];
}
