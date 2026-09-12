import apiClient from './client';
import { APIResponse } from '../types/api';
import { SpendingAnalytics } from '../types/analytics';

export const analyticsApi = {
  getAnalytics: async (
    period: string = '1m',
    startDate?: string,
    endDate?: string
  ): Promise<APIResponse<SpendingAnalytics>> => {
    const params: Record<string, string> = { period };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await apiClient.get<APIResponse<SpendingAnalytics>>('/analytics', { params });
    return response.data;
  },
};
