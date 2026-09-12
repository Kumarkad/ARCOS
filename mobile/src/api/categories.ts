import apiClient from './client';
import { APIResponse } from '../types/api';
import { Category } from '../types/expense';

export const categoriesApi = {
  getCategories: async (): Promise<APIResponse<Category[]>> => {
    const response = await apiClient.get<APIResponse<Category[]>>('/categories');
    return response.data;
  },

  createCategory: async (data: {
    name: string;
    icon?: string;
    color?: string;
    type?: string;
  }): Promise<APIResponse<Category>> => {
    const response = await apiClient.post<APIResponse<Category>>('/categories', data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<APIResponse<boolean>> => {
    const response = await apiClient.delete<APIResponse<boolean>>(`/categories/${id}`);
    return response.data;
  },
};
