import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        sidebar: 'var(--bg-sidebar)',
        topbar: 'var(--bg-topbar)',
        card: 'var(--bg-card)',
        'card-hover': 'var(--bg-card-hover)',
        surface: 'var(--bg-surface)',
        'surface-glass': 'var(--bg-surface-glass)',
        'text-main': 'var(--text-main)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        main: 'var(--text-main)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        'border-subtle': 'var(--border-subtle)',
        'border-light': 'var(--border-light)',
        'border-highlight': 'var(--border-highlight)',
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(16, 185, 129, 0.18)',
        'glow-cyan': '0 0 25px rgba(6, 182, 212, 0.2)',
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
