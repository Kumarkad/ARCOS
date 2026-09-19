import { create } from 'zustand';
import { getThemeColors, DARK_COLORS } from '../utils/constants';

interface UIState {
  isDarkMode: boolean;
  colors: typeof DARK_COLORS;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isDarkMode: true,
  colors: getThemeColors(true),
  toggleTheme: () =>
    set((state) => {
      const next = !state.isDarkMode;
      return { isDarkMode: next, colors: getThemeColors(next) };
    }),
  setTheme: (isDark: boolean) =>
    set(() => ({
      isDarkMode: isDark,
      colors: getThemeColors(isDark),
    })),
}));
