'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BellIcon,
  CloudSunIcon,
  MenuIcon,
  LanguagesIcon,
} from '../icons/Icons';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';

import { ThemeSwitch } from './ThemeSwitch';

interface TopbarProps {
  onOpenMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const { locale, setLocale, messages } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="app-topbar sticky top-0 z-40 flex h-[70px] w-full items-center justify-between border-b border-border-subtle bg-topbar text-text-main px-4 transition-all lg:px-8">
      {/* Left Section: Menu Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileMenu}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-light bg-surface text-text-secondary transition-colors hover:text-text-main lg:hidden"
          aria-label="Open navigation menu"
        >
          <MenuIcon size={20} />
        </button>
      </div>

      {/* Right Section: Language Switcher, Telemetry, Live Clock & Profile */}
      <div className="flex items-center gap-3">
        {/* DYNAMIC LANGUAGE SWITCHER (English / தமிழ்) */}
        <div className="flex items-center rounded-lg border border-border-light bg-surface/80 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
              locale === 'en'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-text-secondary hover:text-text-main'
            }`}
            title="Switch to English"
          >
            <span>EN</span>
            <span className="hidden sm:inline font-medium">English</span>
          </button>
          <button
            type="button"
            onClick={() => setLocale('ta')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
              locale === 'ta'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-text-secondary hover:text-text-main'
            }`}
            title="தமிழுக்கு மாற்றுக"
          >
            <span>த</span>
            <span className="hidden sm:inline font-medium">தமிழ்</span>
          </button>
        </div>

        {/* APPLICATION THEME SWITCHER TOGGLE PILL (Sun/Moon Switch) */}
        <div className="flex items-center">
          <ThemeSwitch id="btn-toggle-theme" />
        </div>

        {/* Weather Telemetry Pill */}
        <div className="hidden items-center gap-2 rounded-lg border border-border-subtle bg-card/60 px-3 py-1.5 text-xs text-text-secondary xl:flex">
          <CloudSunIcon size={16} className="text-amber-400" />
          <span className="font-medium text-text-main">31.5°C</span>
          <span className="opacity-40">|</span>
          <span>{locale === 'ta' ? 'ஈரப்பதம் 78%' : '78% Humidity'}</span>
        </div>

        {/* Live Clock / Status */}
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border-subtle bg-surface/50 px-3 py-1.5 text-xs font-semibold text-text-secondary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="font-mono">{timeStr || '12:00:00 PM'}</span>
        </div>

        {/* Notifications */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border-light bg-surface text-text-secondary transition-colors hover:text-text-main"
          aria-label="Notifications"
        >
          <BellIcon size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
        </button>

        {/* User Profile / Sign In Link */}
        <Link
          href="/signin"
          className="hidden items-center gap-2.5 pl-2 sm:flex p-1.5 rounded-xl hover:bg-surface/60 transition-all cursor-pointer group"
          title="Account / Sign In"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-extrabold text-emerald-400 ring-1 ring-emerald-500/30 group-hover:scale-105 transition-transform">
            MS
          </div>
          <div className="flex flex-col text-left text-xs leading-tight">
            <span className="font-bold text-text-main group-hover:text-emerald-400 transition-colors">
              {messages.sidebar.profileName}
            </span>
            <span className="text-[11px] text-text-muted">{messages.sidebar.profileTitle}</span>
          </div>
        </Link>
      </div>
    </header>
  );
};
