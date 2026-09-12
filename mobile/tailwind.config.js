module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6C63FF', light: '#8B83FF', dark: '#4B42CC' },
        background: { DEFAULT: '#0f0f23', card: '#1a1a2e', elevated: '#25253e' },
        success: '#00C48C',
        danger: '#FF6B6B',
        warning: '#FFB946',
        muted: '#6b7280',
        border: '#2a2a4a',
      },
    },
  },
  plugins: [],
};
