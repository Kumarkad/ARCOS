import apiClient from './client';
import { APIResponse } from '../types/api';
import { SpendingAnalytics } from '../types/analytics';

export const analyticsApi = {
  getAnalytics: async (): Promise<APIResponse<SpendingAnalytics>> => {
    const response = await apiClient.get<APIResponse<SpendingAnalytics>>('/analytics');
    return response.data;
  },
};
