import apiClient from './client';
import { APIResponse } from '../types/api';
import { Income, IncomeCreate } from '../types/expense';

export const incomeApi = {
  getIncome: async (params?: {
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ data: Income[]; total: number }> => {
    const response = await apiClient.get<{ data: Income[]; total: number }>('/income', { params });
    return response.data;
  },

  createIncome: async (data: IncomeCreate): Promise<APIResponse<Income>> => {
    const response = await apiClient.post<APIResponse<Income>>('/income', data);
    return response.data;
  },

  deleteIncome: async (id: string): Promise<APIResponse<boolean>> => {
    const response = await apiClient.delete<APIResponse<boolean>>(`/income/${id}`);
    return response.data;
  },
};
