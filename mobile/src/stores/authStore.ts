import { create } from 'zustand';
import { storage } from '../utils/storage';
import { authApi } from '../api/auth';
import { User } from '../types/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<User>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login(email, password);
      if (response.success && response.data) {
        await storage.setItemAsync('access_token', response.data.tokens.access_token);
        await storage.setItemAsync('refresh_token', response.data.tokens.refresh_token);
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email, password, fullName) => {
    set({ isLoading: true });
    try {
      const response = await authApi.register(email, password, fullName);
      if (response.success && response.data) {
        await storage.setItemAsync('access_token', response.data.tokens.access_token);
        await storage.setItemAsync('refresh_token', response.data.tokens.refresh_token);
        set({
          user: response.data.user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await storage.deleteItemAsync('access_token');
    await storage.deleteItemAsync('refresh_token');
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  initialize: async () => {
    try {
      const token = await storage.getItemAsync('access_token');
      if (token) {
        const response = await authApi.getMe();
        if (response.success && response.data) {
          set({
            user: response.data,
            isAuthenticated: true,
          });
        }
      }
    } catch (error) {
      // If getMe fails (e.g., 401), interceptor will try to refresh.
      // If refresh fails, it will delete tokens. We can just ensure state is clean.
      await storage.deleteItemAsync('access_token');
      await storage.deleteItemAsync('refresh_token');
      set({
        user: null,
        isAuthenticated: false,
      });
    } finally {
      set({ isInitialized: true });
    }
  },

  refreshUser: async () => {
    try {
      const response = await authApi.getMe();
      if (response.success && response.data) {
        set({ user: response.data });
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  },

  updateProfile: async (data: Partial<User>) => {
    set({ isLoading: true });
    try {
      const response = await authApi.updateProfile(data);
      if (response.success && response.data) {
        set({ user: response.data, isLoading: false });
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
