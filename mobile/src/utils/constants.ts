export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://arcos-9zh1ub7va-kumars-projects-430e6b6c.vercel.app/api/v1';

export const DARK_COLORS = {
  primary: '#6C63FF',
  primaryLight: '#8B83FF',
  primaryDark: '#4B42CC',
  background: '#0f0f23',
  card: '#1a1a2e',
  elevated: '#25253e',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  muted: '#94A3B8',
  border: '#2a2a4a',
  text: '#FFFFFF',
  textSecondary: '#CBD5E1', // Elevated high-contrast text
};

export const LIGHT_COLORS = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  background: '#F8FAFC',
  card: '#FFFFFF',
  elevated: '#F1F5F9',
  success: '#059669',
  danger: '#DC2626',
  warning: '#D97706',
  muted: '#64748B',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569', // High-contrast slate text
};

export const COLORS = DARK_COLORS;

export const getThemeColors = (isDarkMode: boolean) => (isDarkMode ? DARK_COLORS : LIGHT_COLORS);
