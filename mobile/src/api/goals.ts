import api from './client';
import { ApiResponse } from '../types/api';
import {
  Goal,
  GoalCreatePayload,
  GoalUpdatePayload,
  GoalContributePayload,
} from '../types/goal';

export const goalApi = {
  getGoals: async (): Promise<Goal[]> => {
    const res = await api.get<ApiResponse<Goal[]>>('/goals');
    return res.data.data;
  },

  createGoal: async (payload: GoalCreatePayload): Promise<Goal> => {
    const res = await api.post<ApiResponse<Goal>>('/goals', payload);
    return res.data.data;
  },

  getGoal: async (goalId: string): Promise<Goal> => {
    const res = await api.get<ApiResponse<Goal>>(`/goals/${goalId}`);
    return res.data.data;
  },

  updateGoal: async (goalId: string, payload: GoalUpdatePayload): Promise<Goal> => {
    const res = await api.put<ApiResponse<Goal>>(`/goals/${goalId}`, payload);
    return res.data.data;
  },

  contribute: async (goalId: string, payload: GoalContributePayload): Promise<Goal> => {
    const res = await api.post<ApiResponse<Goal>>(`/goals/${goalId}/contribute`, payload);
    return res.data.data;
  },

  deleteGoal: async (goalId: string): Promise<boolean> => {
    const res = await api.delete<ApiResponse<boolean>>(`/goals/${goalId}`);
    return res.data.data;
  },
};
