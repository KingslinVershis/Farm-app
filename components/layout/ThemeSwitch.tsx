'use client';

import React from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';

interface ThemeSwitchProps {
  id?: string;
  className?: string;
}

export const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ id = 'theme-toggle-switch', className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      onClick={(e) => {
        e.preventDefault();
        console.log('[ThemeSwitch] Clicked! Current theme:', theme);
        toggleTheme();
      }}
      className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border-2 transition-all duration-300 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
        isDark
          ? 'bg-slate-950 border-white/70 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]'
          : 'bg-slate-200 border-slate-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]'
      } ${className}`}
    >
      {/* Sun icon on Left */}
      <span
        className={`pointer-events-none absolute left-1.5 flex h-4 w-4 items-center justify-center transition-opacity duration-200 ${
          isDark ? 'opacity-70 text-white' : 'opacity-0'
        }`}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </span>

      {/* Moon icon on Right */}
      <span
        className={`pointer-events-none absolute right-1.5 flex h-4 w-4 items-center justify-center transition-opacity duration-200 ${
          isDark ? 'opacity-0' : 'opacity-70 text-slate-700'
        }`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>

      {/* Sliding Circular Thumb */}
      <span
        className={`pointer-events-none inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
          isDark ? 'translate-x-7 text-slate-950' : 'translate-x-0.5 text-amber-500'
        }`}
      >
        {isDark ? (
          /* Crescent moon icon inside thumb in dark mode */
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          /* Sun icon inside thumb in light mode */
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        )}
      </span>
    </button>
  );
};

export default ThemeSwitch;
