'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

import { ConfigProvider, theme as antdTheme } from 'antd';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState<boolean>(false);

  const applyTheme = (t: Theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', t);
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(t);
      if (document.body) {
        document.body.setAttribute('data-theme', t);
        document.body.classList.remove('dark', 'light');
        document.body.classList.add(t);
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    try {
      const saved = (localStorage.getItem('farmhub_theme') || localStorage.getItem('agripulse_theme')) as Theme;
      if (saved === 'dark' || saved === 'light') {
        setThemeState(saved);
        applyTheme(saved);
      } else {
        applyTheme('dark');
      }
    } catch {
      applyTheme('dark');
    }
  }, []);

  const isPublicRoute = () =>
    typeof window !== 'undefined' &&
    ['/signin', '/signup', '/forgot-password'].some(
      (route) => window.location.pathname === route || window.location.pathname.startsWith(`${route}/`)
    );

  const persistThemePreference = (nextTheme: Theme) => {
    if (isPublicRoute()) return;
    try {
      fetch('/api/user/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: nextTheme }),
      }).catch(() => {});
    } catch {}
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    try {
      localStorage.setItem('farmhub_theme', newTheme);
      localStorage.setItem('agripulse_theme', newTheme);
    } catch {
      // Ignore
    }

    persistThemePreference(newTheme);
  };

  const toggleTheme = () => {
    const current = (typeof document !== 'undefined' ? (document.documentElement.getAttribute('data-theme') as Theme) : theme) || theme || 'dark';
    const nextTheme: Theme = current === 'dark' ? 'light' : 'dark';
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    try {
      localStorage.setItem('farmhub_theme', nextTheme);
      localStorage.setItem('agripulse_theme', nextTheme);
    } catch {
      // Ignore
    }

    persistThemePreference(nextTheme);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__toggleTheme = toggleTheme;
      (window as any).__setTheme = setTheme;
    }
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <ConfigProvider
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#10b981',
            colorInfo: '#06b6d4',
            borderRadius: 12,
            fontFamily: 'inherit',
            colorBgContainer: isDark ? '#121c2d' : '#ffffff',
            colorBgElevated: isDark ? '#0f182a' : '#ffffff',
            colorBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1',
            colorText: isDark ? '#f1f5f9' : '#0f172a',
            colorTextPlaceholder: isDark ? '#94a3b8' : '#64748b',
            colorTextDisabled: isDark ? '#64748b' : '#64748b',
            colorBgContainerDisabled: isDark ? 'rgba(15, 23, 42, 0.5)' : '#f8fafc',
          },
          components: {
            Select: {
              selectorBg: isDark ? 'transparent' : '#ffffff',
              colorBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1',
              colorText: isDark ? '#f1f5f9' : '#0f172a',
              colorTextPlaceholder: isDark ? '#94a3b8' : '#64748b',
              colorTextDisabled: '#64748b',
              colorBgContainerDisabled: isDark ? 'rgba(15, 23, 42, 0.45)' : '#f8fafc',
              optionSelectedBg: isDark ? 'rgba(16, 185, 129, 0.25)' : '#ecfdf5',
              optionSelectedColor: isDark ? '#34d399' : '#059669',
              optionActiveBg: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9',
            },
            Input: {
              colorBgContainer: isDark ? 'transparent' : '#ffffff',
              colorBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1',
              colorText: isDark ? '#f1f5f9' : '#0f172a',
              colorTextPlaceholder: isDark ? '#94a3b8' : '#64748b',
              activeBorderColor: '#10b981',
              hoverBorderColor: '#10b981',
            },
            InputNumber: {
              colorBgContainer: isDark ? 'transparent' : '#ffffff',
              colorBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1',
              colorText: isDark ? '#f1f5f9' : '#0f172a',
              colorTextPlaceholder: isDark ? '#94a3b8' : '#64748b',
              activeBorderColor: '#10b981',
              hoverBorderColor: '#10b981',
            },
            DatePicker: {
              colorBgContainer: isDark ? 'transparent' : '#ffffff',
              colorBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : '#cbd5e1',
              colorText: isDark ? '#f1f5f9' : '#0f172a',
              colorTextPlaceholder: isDark ? '#94a3b8' : '#64748b',
              activeBorderColor: '#10b981',
              hoverBorderColor: '#10b981',
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
