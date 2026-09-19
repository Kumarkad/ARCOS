import React, { createContext, useContext, useEffect } from 'react';
import { colorScheme } from 'nativewind';
import { useUIStore } from '../stores/uiStore';
import { DARK_COLORS, LIGHT_COLORS } from '../utils/constants';

interface ThemeContextType {
  isDarkMode: boolean;
  colors: typeof DARK_COLORS;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: true,
  colors: DARK_COLORS,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDarkMode, colors, toggleTheme, setTheme } = useUIStore();

  useEffect(() => {
    try {
      if (colorScheme && typeof colorScheme.set === 'function') {
        colorScheme.set(isDarkMode ? 'dark' : 'light');
      }
    } catch {
      // safe fallback
    }
  }, [isDarkMode]);

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
