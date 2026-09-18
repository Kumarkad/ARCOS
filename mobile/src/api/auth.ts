import apiClient from './client';
import { User, AuthResponse, TokenResponse, APIResponse } from '../types/api';

export const authApi = {
  register: async (email: string, password: string, fullName: string) => {
    const response = await apiClient.post<APIResponse<AuthResponse>>('/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post<APIResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post<APIResponse<TokenResponse>>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get<APIResponse<User>>('/auth/me');
    return response.data;
  },

  updateProfile: async (data: Partial<User>) => {
    const response = await apiClient.put<APIResponse<User>>('/auth/me', data);
    return response.data;
  },
};
