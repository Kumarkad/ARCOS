import api from './client';
import { ApiResponse } from '../types/api';
import {
  Bike,
  FuelLog,
  FuelLogCreatePayload,
  BikeMaintenance,
  BikeMaintenanceCreatePayload,
  BikeExpense,
  BikeExpenseCreatePayload,
  BikeDashboardSummary,
} from '../types/bike';

export const bikeApi = {
  getBikes: async (): Promise<Bike[]> => {
    const res = await api.get<ApiResponse<Bike[]>>('/bikes');
    return res.data.data;
  },

  createBike: async (payload: {
    name: string;
    make: string;
    model: string;
    year?: number;
    registration_number?: string;
    initial_odometer?: number;
    fuel_tank_capacity?: number;
    fuel_type?: string;
  }): Promise<Bike> => {
    const res = await api.post<ApiResponse<Bike>>('/bikes', payload);
    return res.data.data;
  },

  updateBike: async (bikeId: string, payload: Partial<Bike>): Promise<Bike> => {
    const res = await api.put<ApiResponse<Bike>>(`/bikes/${bikeId}`, payload);
    return res.data.data;
  },

  deleteBike: async (bikeId: string): Promise<boolean> => {
    const res = await api.delete<ApiResponse<boolean>>(`/bikes/${bikeId}`);
    return res.data.data;
  },

  getDashboard: async (bikeId: string): Promise<BikeDashboardSummary> => {
    const res = await api.get<ApiResponse<BikeDashboardSummary>>(`/bikes/${bikeId}/dashboard`);
    return res.data.data;
  },

  // Fuel Logs
  getFuelLogs: async (bikeId: string): Promise<FuelLog[]> => {
    const res = await api.get<ApiResponse<FuelLog[]>>(`/bikes/${bikeId}/fuel`);
    return res.data.data;
  },

  recordFuelLog: async (bikeId: string, payload: FuelLogCreatePayload): Promise<FuelLog> => {
    const res = await api.post<ApiResponse<FuelLog>>(`/bikes/${bikeId}/fuel`, payload);
    return res.data.data;
  },

  // Maintenance
  getMaintenance: async (bikeId: string): Promise<BikeMaintenance[]> => {
    const res = await api.get<ApiResponse<BikeMaintenance[]>>(`/bikes/${bikeId}/maintenance`);
    return res.data.data;
  },

  recordMaintenance: async (bikeId: string, payload: BikeMaintenanceCreatePayload): Promise<BikeMaintenance> => {
    const res = await api.post<ApiResponse<BikeMaintenance>>(`/bikes/${bikeId}/maintenance`, payload);
    return res.data.data;
  },

  // Expenses
  getExpenses: async (bikeId: string): Promise<BikeExpense[]> => {
    const res = await api.get<ApiResponse<BikeExpense[]>>(`/bikes/${bikeId}/expenses`);
    return res.data.data;
  },

  recordExpense: async (bikeId: string, payload: BikeExpenseCreatePayload): Promise<BikeExpense> => {
    const res = await api.post<ApiResponse<BikeExpense>>(`/bikes/${bikeId}/expenses`, payload);
    return res.data.data;
  },
};
