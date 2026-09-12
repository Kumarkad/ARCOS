import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
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
        await SecureStore.setItemAsync('access_token', response.data.tokens.access_token);
        await SecureStore.setItemAsync('refresh_token', response.data.tokens.refresh_token);
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
        await SecureStore.setItemAsync('access_token', response.data.tokens.access_token);
        await SecureStore.setItemAsync('refresh_token', response.data.tokens.refresh_token);
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
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
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
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      set({
        user: null,
        isAuthenticated: false,
      });
    } finally {
      set({ isInitialized: true });
    }
  },
}));
