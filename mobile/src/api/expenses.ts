import apiClient from './client';
import { APIResponse } from '../types/api';
import {
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
  ExpenseSummary,
  PaginatedExpenses
} from '../types/expense';

export const expensesApi = {
  getExpenses: async (params?: {
    start_date?: string;
    end_date?: string;
    category_id?: string;
    payment_method?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedExpenses> => {
    const response = await apiClient.get<PaginatedExpenses>('/expenses', { params });
    return response.data;
  },

  getExpenseSummary: async (): Promise<APIResponse<ExpenseSummary>> => {
    const response = await apiClient.get<APIResponse<ExpenseSummary>>('/expenses/summary');
    return response.data;
  },

  getExpense: async (id: string): Promise<APIResponse<Expense>> => {
    const response = await apiClient.get<APIResponse<Expense>>(`/expenses/${id}`);
    return response.data;
  },

  createExpense: async (data: ExpenseCreate): Promise<APIResponse<Expense>> => {
    const response = await apiClient.post<APIResponse<Expense>>('/expenses', data);
    return response.data;
  },

  bulkCreateExpenses: async (expenses: ExpenseCreate[]): Promise<APIResponse<Expense[]>> => {
    const response = await apiClient.post<APIResponse<Expense[]>>('/expenses/bulk', { expenses });
    return response.data;
  },

  updateExpense: async (id: string, data: ExpenseUpdate): Promise<APIResponse<Expense>> => {
    const response = await apiClient.put<APIResponse<Expense>>(`/expenses/${id}`, data);
    return response.data;
  },

  deleteExpense: async (id: string): Promise<APIResponse<boolean>> => {
    const response = await apiClient.delete<APIResponse<boolean>>(`/expenses/${id}`);
    return response.data;
  },
};
