'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  BellIcon,
  MenuIcon,
  XIcon,
  SproutIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  FlaskConicalIcon,
  WavesIcon,
} from '../icons/Icons';
import {
  ChevronDown,
  LogOut,
  Clock,
  CloudSun,
  Globe,
  Sparkles,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { ThemeSwitch } from './ThemeSwitch';
import type { TopbarProps } from '@/types/components';

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [timeStr, setTimeStr] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const { locale, setLocale, messages } = useLanguage();
  const { theme } = useTheme();

  // Navigation Items (migrated from Sidebar)
  const navItems = [
    { key: 'dashboard', title: messages.sidebar.dashboard, href: '/', icon: LayoutDashboardIcon },
    { key: 'fertilizer', title: messages.sidebar.fertilizer, href: '/fertilizer', icon: FlaskConicalIcon, badge: (messages.sidebar as any).fertilizerBadge || '5 Phases' },
    { key: 'reservoirs', title: messages.sidebar.reservoirs, href: '/reservoirs', icon: WavesIcon, badge: (messages.sidebar as any).reservoirsBadge || 'Live Level' },
    { key: 'seeds', title: (messages.sidebar as any).seeds || 'TNAU Seeds', href: '/seeds', icon: SproutIcon, badge: (messages.sidebar as any).seedsBadge || 'Govt Rates' },
    { key: 'settings', title: messages.sidebar.settings, href: '/settings', icon: SettingsIcon },
  ];

  // User state loaded dynamically from active session
  const [currentUser, setCurrentUser] = useState<{
    name: string;
    email: string;
    role: string;
  }>({
    name: '',
    email: '',
    role: '',
  });

  useEffect(() => {
    const applyUser = (userData: { name?: string; username?: string; email?: string; role?: string }) => {
      if (!userData) return;
      const resolvedName = userData.username || userData.name || (userData.email ? userData.email.split('@')[0] : '');
      const resolvedRole = userData.role || (locale === 'ta' ? 'விவசாயி' : 'Farmer');
      const resolvedEmail = userData.email || '';
      if (resolvedName || resolvedEmail) {
        setCurrentUser({
          name: resolvedName,
          email: resolvedEmail,
          role: resolvedRole,
        });
      }
    };

    try {
      // 1. Check localStorage first
      const stored = localStorage.getItem('agripulse_user');
      if (stored) {
        applyUser(JSON.parse(stored));
      }

      // 2. Decode from JWT token cookie if available
      if (typeof document !== 'undefined') {
        const tokenMatch = document.cookie.match(/agripulse_token=([^;]+)/);
        if (tokenMatch && tokenMatch[1]) {
          const parts = tokenMatch[1].split('.');
          if (parts.length === 3) {
            let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4) b64 += '=';
            const decodedPayload = JSON.parse(decodeURIComponent(escape(atob(b64))));
            applyUser(decodedPayload);
          }
        }
      }

      // 3. Authoritative sync from /api/user
      fetch('/api/user')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && data?.user) {
            applyUser(data.user);
            localStorage.setItem('agripulse_user', JSON.stringify(data.user));
          }
        })
        .catch(() => {});
    } catch (e) {
      console.error('Failed to load user info in Topbar:', e);
    }
  }, [locale]);

  // Live ticking clock
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

  // Click outside and escape key listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (mobileNavRef.current && !mobileNavRef.current.contains(event.target as Node)) {
        setMobileNavOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setMobileNavOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Logout handler: clears cookie + localStorage, redirects to /signin
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (e) {}

    if (typeof window !== 'undefined') {
      document.cookie = 'agripulse_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      localStorage.removeItem('agripulse_user');
      localStorage.removeItem('farm_app_saved_plans');
      localStorage.removeItem('farm_app_current_user_id');
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('farm_app_saved_plans') || key.startsWith('agripulse_'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (_) {}
    }

    setIsDropdownOpen(false);
    setMobileNavOpen(false);
    router.push('/signin');
    router.refresh();
  };

  const initials =
    currentUser.name
      ? currentUser.name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase())
          .join('')
      : currentUser.email
      ? currentUser.email[0]?.toUpperCase()
      : 'U';

  return (
    <header className="app-topbar sticky top-0 z-40 flex h-[72px] w-full items-center justify-between border-b border-border-subtle bg-topbar text-text-main px-3 sm:px-5 lg:px-7 transition-all backdrop-blur-xl">
      {/* Left Section: Brand Logo & Title */}
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group" onClick={() => setMobileNavOpen(false)}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <SproutIcon size={22} />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-base sm:text-lg font-black tracking-tight text-text-main group-hover:text-emerald-400 transition-colors">
              {messages.common.brandName}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 hidden sm:inline-block leading-tight">
              {messages.common.brandSubtitle}
            </span>
          </div>
        </Link>
      </div>

      {/* Center Section: Main Desktop Navigation Tabs */}
      <nav className="hidden lg:flex items-center gap-1 xl:gap-2 px-2" aria-label="Main Navigation">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-2 rounded-xl px-3 py-2 text-xs xl:text-sm font-bold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/15 text-emerald-800 dark:text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.22)] border border-emerald-500/40 dark:border-emerald-400/35 ring-1 ring-emerald-500/30'
                  : 'text-slate-600 dark:text-text-secondary hover:bg-slate-500/10 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-text-main'
              }`}
            >
              <Icon
                size={17}
                className={`transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-text-muted group-hover:text-slate-800 dark:group-hover:text-text-main'
                }`}
              />
              <span className="whitespace-nowrap">{item.title}</span>
              {item.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] xl:text-[10px] font-black tracking-tight ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-emerald-600/10 dark:bg-white/10 text-emerald-800 dark:text-emerald-300 border border-emerald-600/25 dark:border-white/10 group-hover:bg-emerald-600/20 dark:group-hover:bg-white/15'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right Section: Theme Switch, Notifications, User Profile & Mobile Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Global Theme Switch */}
        <ThemeSwitch id="topbar-theme-switch" />

        {/* Notifications Button */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 glass-surface text-text-secondary transition-colors hover:text-text-main cursor-pointer shadow-sm"
          aria-label="Notifications"
        >
          <BellIcon size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
        </button>

        {/* USER PROFILE DROPDOWN TRIGGER */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            id="user-profile-dropdown-btn"
            className="flex items-center gap-2 sm:gap-2.5 p-1.5 pr-2.5 rounded-2xl border border-emerald-500/25 glass-surface hover:border-emerald-500/50 transition-all cursor-pointer group shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {/* Avatar Circle with Online Pulse */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-xs font-black text-slate-950 shadow-md group-hover:scale-105 transition-transform">
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-black" />
            </div>

            {/* Profile Info (hidden on mobile, shown on sm+) */}
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="font-extrabold text-xs text-text-main group-hover:text-emerald-400 transition-colors truncate max-w-[130px]">
                {currentUser.name || currentUser.email || (locale === 'ta' ? 'பயனர்' : 'User')}
              </span>
              <span className="text-[10px] font-semibold text-emerald-400/90 truncate max-w-[130px]">
                {currentUser.role || (locale === 'ta' ? 'விவசாயி' : 'Farmer')}
              </span>
            </div>

            <ChevronDown
              size={14}
              className={`text-text-muted transition-transform duration-200 ${
                isDropdownOpen ? 'rotate-180 text-emerald-400' : ''
              }`}
            />
          </button>

          {/* DROPDOWN MENU */}
          {isDropdownOpen && (
            <div
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="user-profile-dropdown-btn"
              className="absolute right-0 top-full mt-2 w-80 sm:w-88 rounded-3xl border dark:border-emerald-500/30 border-emerald-500/40 dark:bg-[#060f0a]/95 bg-white/95 dark:text-white text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.18),0_0_25px_rgba(16,185,129,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(16,185,129,0.18)] backdrop-blur-2xl z-50 p-4 transition-all"
            >
              {/* SECTION 1: User Profile Header */}
              <div className="flex items-center gap-3 pb-3.5 border-b dark:border-white/10 border-slate-200">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-sm font-black text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                  {initials}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm dark:text-white text-slate-900 truncate">
                      {currentUser.name || currentUser.email || (locale === 'ta' ? 'பயனர்' : 'User')}
                    </span>
                    <ShieldCheck size={14} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                  </div>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold truncate">
                    {currentUser.role || (locale === 'ta' ? 'விவசாயி' : 'Farmer')}
                  </span>
                  {currentUser.email && (
                    <span className="text-[11px] dark:text-white/50 text-slate-500 truncate">
                      {currentUser.email}
                    </span>
                  )}
                </div>
              </div>

              {/* SECTION 2: Live Clock & Status */}
              <div className="py-3 border-b dark:border-white/10 border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 dark:text-white/70 text-slate-600">
                    <Clock size={14} className="text-emerald-500 dark:text-emerald-400" />
                    <span className="font-bold">{locale === 'ta' ? 'நேரம்' : 'Local Time'}</span>
                  </div>
                  <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/25">
                    {timeStr || '12:00:00 PM'}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] dark:text-white/60 text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{locale === 'ta' ? 'டெல்டா மெஷ் இயங்குகிறது' : 'IoT Delta Mesh Online'}</span>
                  </div>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">99.4% Uptime</span>
                </div>
              </div>

              {/* SECTION 3: Weather & Telemetry */}
              <div className="py-3 border-b dark:border-white/10 border-slate-200">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2 dark:text-white/70 text-slate-600">
                    <CloudSun size={15} className="text-amber-500 dark:text-amber-400" />
                    <span className="font-bold">{locale === 'ta' ? 'வானிலை தரவு' : 'Weather Telemetry'}</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/25">
                    31.5°C
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-xl dark:bg-white/5 bg-slate-100 p-2 border dark:border-white/5 border-slate-200">
                    <span className="block dark:text-white/50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      {locale === 'ta' ? 'ஈரப்பதம்' : 'Humidity'}
                    </span>
                    <span className="font-extrabold dark:text-white text-slate-900">78% RH</span>
                  </div>
                  <div className="rounded-xl dark:bg-white/5 bg-slate-100 p-2 border dark:border-white/5 border-slate-200">
                    <span className="block dark:text-white/50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      {locale === 'ta' ? 'மண்டலம்' : 'Delta Zone'}
                    </span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400">Optimal (Zone 4)</span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Language Switcher */}
              <div className="py-3 border-b dark:border-white/10 border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold dark:text-white/70 text-slate-600 mb-2">
                  <Globe size={14} className="text-emerald-500 dark:text-emerald-400" />
                  <span>{locale === 'ta' ? 'மொழியை மாற்றுக' : 'Language Selection'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocale('en')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 px-3 text-xs font-extrabold transition-all cursor-pointer border ${
                      locale === 'en'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                        : 'dark:bg-white/5 bg-slate-100 text-slate-700 dark:text-white/70 border-slate-200 dark:border-white/10 hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>English</span>
                    {locale === 'en' && <Check size={13} className="stroke-[3]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocale('ta')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 px-3 text-xs font-extrabold transition-all cursor-pointer border ${
                      locale === 'ta'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                        : 'dark:bg-white/5 bg-slate-100 text-slate-700 dark:text-white/70 border-slate-200 dark:border-white/10 hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>தமிழ்</span>
                    {locale === 'ta' && <Check size={13} className="stroke-[3]" />}
                  </button>
                </div>
              </div>

              {/* SECTION 5: Theme Switch */}
              <div className="py-2.5 flex items-center justify-between border-b dark:border-white/10 border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold dark:text-white/70 text-slate-600">
                  <Sparkles size={14} className="text-emerald-500 dark:text-emerald-400" />
                  <span>{locale === 'ta' ? 'காட்சி முறை' : 'Theme Appearance'}</span>
                </div>
                <ThemeSwitch id="dropdown-theme-toggle" />
              </div>

              {/* SECTION 6: Logout Button */}
              <div className="pt-3">
                <button
                  type="button"
                  id="btn-topbar-logout"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 hover:text-rose-700 dark:hover:text-rose-200 py-2.5 px-4 text-xs font-extrabold transition-all cursor-pointer active:scale-98 shadow-sm"
                >
                  <LogOut size={15} />
                  <span>{locale === 'ta' ? 'வெளியேறு (Logout)' : 'Sign Out / Logout'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Menu Toggle Button (shown on screens < lg) */}
        <div className="relative lg:hidden" ref={mobileNavRef}>
          <button
            type="button"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 glass-surface text-text-secondary transition-colors hover:text-text-main cursor-pointer shadow-sm"
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>

          {/* Mobile Collapsible Navigation Menu Drawer */}
          {mobileNavOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-3xl border dark:border-emerald-500/30 border-emerald-500/40 dark:bg-[#060f0a]/95 bg-white/95 dark:text-white text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.18),0_0_25px_rgba(16,185,129,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(16,185,129,0.18)] backdrop-blur-2xl z-50 p-4 transition-all">
              {/* IoT status banner on mobile */}
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span className="font-semibold">
                  {(messages.sidebar as any).meshStatus || '99.4% IoT Mesh Online'}
                </span>
              </div>

              {/* Navigation links */}
              <nav className="flex flex-col gap-1.5" aria-label="Mobile Navigation">
                {navItems.map((item) => {
                  const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 dark:border-emerald-400/35 ring-1 ring-emerald-500/30'
                          : 'text-slate-600 dark:text-text-secondary hover:bg-slate-500/10 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-text-main'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-text-muted'} />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            isActive
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-emerald-600/10 dark:bg-white/10 text-emerald-800 dark:text-emerald-300 border border-emerald-600/25 dark:border-white/10'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
