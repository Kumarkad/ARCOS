import { create } from 'zustand';

interface UIState {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isDarkMode: true,
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));
