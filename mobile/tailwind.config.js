module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6C63FF', light: '#8B83FF', dark: '#4B42CC' },
        accent: { DEFAULT: '#8B83FF', light: '#A59EFF', dark: '#6C63FF' },
        background: { DEFAULT: '#0f0f23', card: '#1a1a2e', elevated: '#25253e' },
        card: '#1a1a2e',
        elevated: '#25253e',
        surface: '#1a1a2e',
        border: '#334155',
        text: '#FFFFFF',
        textSecondary: '#CBD5E1',
        muted: '#94A3B8',
        success: '#00C48C',
        danger: '#FF6B6B',
        warning: '#FFB946',
      },
    },
  },
  plugins: [],
};
