import apiClient from './client';
import { APIResponse } from '../types/api';
import { Budget, BudgetCreate } from '../types/budget';

export const budgetsApi = {
  getBudgets: async (activeOnly: boolean = false): Promise<APIResponse<Budget[]>> => {
    const response = await apiClient.get<APIResponse<Budget[]>>('/budgets', {
      params: { active_only: activeOnly },
    });
    return response.data;
  },

  getBudget: async (id: string): Promise<APIResponse<Budget>> => {
    const response = await apiClient.get<APIResponse<Budget>>(`/budgets/${id}`);
    return response.data;
  },

  createBudget: async (data: BudgetCreate): Promise<APIResponse<Budget>> => {
    const response = await apiClient.post<APIResponse<Budget>>('/budgets', data);
    return response.data;
  },

  deleteBudget: async (id: string): Promise<APIResponse<boolean>> => {
    const response = await apiClient.delete<APIResponse<boolean>>(`/budgets/${id}`);
    return response.data;
  },
};
