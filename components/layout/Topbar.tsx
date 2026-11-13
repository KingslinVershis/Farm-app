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
  CloudSunIcon,
} from '../icons/Icons';
import {
  ChevronDown,
  LogOut,
  Clock,
  CloudSun,
  ShieldCheck,
  Store,
  CloudRain,
} from '@/components/icons/FlaticonIcons';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ThemeSwitch } from './ThemeSwitch';
import { clearClientSessionStorage } from './AppShell';
import type { TopbarProps } from '@/types/components';
import { message, Modal } from 'antd';
import {
  readSavedWeatherLocation,
  WEATHER_LOCATION_EVENT,
  getWeatherCondition,
  type WeatherApiResponse,
} from '@/lib/weather';

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [timeStr, setTimeStr] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const { locale, setLocale, messages } = useLanguage();

  // Navigation Items (clean tabs without extra badge chips)
  const navItems = [
    { key: 'dashboard', title: messages.sidebar.dashboard, href: '/', icon: LayoutDashboardIcon },
    { key: 'fertilizer', title: messages.sidebar.fertilizer, href: '/fertilizer', icon: FlaskConicalIcon },
    { key: 'fertilizer-stock', title: (messages.sidebar as any).fertilizerStock || 'Fertilizer Details', href: '/fertilizer-stock', icon: Store },
    { key: 'reservoirs', title: messages.sidebar.reservoirs, href: '/reservoirs', icon: WavesIcon },
    { key: 'weather', title: (messages.sidebar as any).weather || 'Agro Weather', href: '/weather', icon: CloudSunIcon },
    { key: 'rainfall', title: (messages.sidebar as any).rainfall || 'Rainfall Report', href: '/rainfall', icon: CloudRain },
    { key: 'crop-health', title: (messages.sidebar as any).cropHealth || 'Crop Health', href: '/crop-health', icon: ShieldCheck },
    { key: 'seeds', title: (messages.sidebar as any).seeds || 'TNAU Seeds', href: '/seeds', icon: SproutIcon },
    { key: 'settings', title: messages.sidebar.settings, href: '/settings', icon: SettingsIcon },
  ];

  // Live weather telemetry state for the profile dropdown
  const [liveWeather, setLiveWeather] = useState<{
    tempMax: string;
    tempMin: string;
    humidityRange: string;
    rainfallMm: string;
    locationLabel: string;
    emoji: string;
  } | null>(null);

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
      const stored = localStorage.getItem('farmhub_user') || localStorage.getItem('agripulse_user');
      if (stored) {
        applyUser(JSON.parse(stored));
      }

      // 2. Decode from JWT token cookie if available
      if (typeof document !== 'undefined') {
        const tokenMatch =
          document.cookie.match(/farmhub_token=([^;]+)/) ||
          document.cookie.match(/agripulse_token=([^;]+)/);
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

      // 3. Sync from /api/user once per session if not already hydrated
      if (!(window as any).__farmhubUserSynced) {
        (window as any).__farmhubUserSynced = true;
        fetch('/api/user')
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.success && data?.user) {
              applyUser(data.user);
              localStorage.setItem('farmhub_user', JSON.stringify(data.user));
            }
          })
          .catch(() => { });
      }

      const handleUserUpdated = (e: any) => {
        if (e?.detail) {
          applyUser(e.detail);
        } else {
          try {
            const stored = localStorage.getItem('farmhub_user');
            if (stored) applyUser(JSON.parse(stored));
          } catch {}
        }
      };

      window.addEventListener('farmhub_user_updated', handleUserUpdated);
      window.addEventListener('storage', handleUserUpdated);

      return () => {
        window.removeEventListener('farmhub_user_updated', handleUserUpdated);
        window.removeEventListener('storage', handleUserUpdated);
      };
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

  // Load live TNAGRISNET weather telemetry for the user's selected/saved location
  useEffect(() => {
    let active = true;

    const loadWeatherSummary = async (overrideLoc?: {
      districtId?: string;
      blockId?: string;
      districtName?: string;
      blockName?: string;
    }) => {
      try {
        const loc = overrideLoc || readSavedWeatherLocation();
        const params = new URLSearchParams();
        if (loc.districtId) params.set('district_id', loc.districtId);
        if (loc.blockId) params.set('block_id', loc.blockId);
        if (loc.districtName) params.set('district_name', loc.districtName);
        if (loc.blockName) params.set('block_name', loc.blockName);

        const qs = params.toString();
        const res = await fetch(qs ? `/api/weather?${qs}` : '/api/weather');
        if (!res.ok) return;
        const json: WeatherApiResponse = await res.json();
        if (!active || !json?.success || !json.dashboard?.forecast?.length) return;

        const day0 = json.dashboard.forecast[0];
        const blockObj = json.dashboard.blocks?.find(
          (b) => String(b.block_id) === String(json.resolvedBlockId || json.dashboard?.block_id)
        );
        const cond = getWeatherCondition(day0.rainfall, day0.cloud_cover);

        const distText =
          locale === 'ta' && json.dashboard.district?.district_reg_name
            ? json.dashboard.district.district_reg_name
            : json.dashboard.district?.district_name || '';
        const blockText =
          locale === 'ta' && blockObj?.block_reg_name
            ? blockObj.block_reg_name
            : blockObj?.block_name || '';

        setLiveWeather({
          tempMax: Number(day0.current_temperature ?? day0.temperature_max ?? 0).toFixed(1),
          tempMin: Number(day0.temperature_min || 0).toFixed(1),
          humidityRange: `${day0.humidity}–${day0.humidity2}%`,
          rainfallMm: `${Number(day0.rainfall || 0).toFixed(1)} mm`,
          locationLabel: blockText ? `${blockText}, ${distText}` : distText,
          emoji: cond.emoji,
        });
      } catch {
        // Silent fail: dropdown renders graceful default state
      }
    };

    loadWeatherSummary();

    const handleWeatherLocChange = (e: any) => {
      loadWeatherSummary(e?.detail);
    };
    const handleUserUpdatedForWeather = (e: any) => {
      const u = e?.detail;
      if (u?.district || u?.city) {
        loadWeatherSummary({ districtName: u.district, blockName: u.city });
      }
    };

    window.addEventListener(WEATHER_LOCATION_EVENT, handleWeatherLocChange);
    window.addEventListener('farmhub_user_updated', handleUserUpdatedForWeather);
    return () => {
      active = false;
      window.removeEventListener(WEATHER_LOCATION_EVENT, handleWeatherLocChange);
      window.removeEventListener('farmhub_user_updated', handleUserUpdatedForWeather);
    };
  }, [locale]);

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

  // Logout handler: revokes session on server, clears cookies + localStorage, redirects to /signin
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.warn('[Logout] Server logout request error:', e);
    }

    clearClientSessionStorage();

    setLoggingOut(false);
    setLogoutModalOpen(false);
    setIsDropdownOpen(false);
    setMobileNavOpen(false);
    message.success(locale === 'ta' ? 'வெற்றிகரமாக வெளியேறிவிட்டீர்கள்!' : 'Signed out successfully!');
    if (typeof window !== 'undefined') {
      window.location.href = '/signin';
    } else {
      router.push('/signin');
      router.refresh();
    }
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
    <>
      <header className="app-topbar sticky top-0 z-40 flex w-full items-center justify-between border-b border-border-subtle bg-topbar text-text-main px-3 sm:px-5 lg:px-7 py-2 transition-all backdrop-blur-xl">
      {/* Left/Center Section: Main Desktop Navigation Tabs */}
      <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 px-1 shrink-0" aria-label="Main Navigation">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-1.5 xl:gap-2 rounded-xl px-2.5 py-1.5 xl:px-3.5 xl:py-2 text-xs xl:text-sm font-bold transition-all ${isActive
                ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/15 text-emerald-800 dark:text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.22)] border border-emerald-500/40 dark:border-emerald-400/35 ring-1 ring-emerald-500/30'
                : 'text-slate-600 dark:text-text-secondary hover:bg-slate-500/10 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-text-main'
                }`}
            >
              <Icon
                size={16}
                className={`transition-transform duration-200 group-hover:scale-110 xl:w-[17px] xl:h-[17px] ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-text-muted group-hover:text-slate-800 dark:group-hover:text-text-main'
                  }`}
              />
              <span className="whitespace-nowrap">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right Section: Language Switch, Theme Switch, Notifications, User Profile & Mobile Toggle */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
        {/* Global Language Switch (same style as login/signup topbar) */}
        <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-black/60 p-0.5 sm:p-1 shadow-sm dark:shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              if (locale !== 'en') {
                setLocale('en');
                message.success('Language updated to English');
              }
            }}
            className={`rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              locale === 'en'
                ? 'bg-emerald-500 text-white keep-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => {
              if (locale !== 'ta') {
                setLocale('ta');
                message.success('மொழி தமிழாக மாற்றப்பட்டது!');
              }
            }}
            className={`rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              locale === 'ta'
                ? 'bg-emerald-500 text-white keep-white font-black shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white'
            }`}
          >
            தமிழ்
          </button>
        </div>

        {/* Global Theme Switch */}
        <ThemeSwitch id="topbar-theme-switch" className="scale-90 sm:scale-100 origin-right" />

        {/* Notifications Button */}
        <button
          className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/10 glass-surface text-text-secondary transition-colors hover:text-text-main cursor-pointer shadow-sm shrink-0"
          aria-label="Notifications"
        >
          <BellIcon size={17} />
          <span className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
        </button>

        {/* USER PROFILE DROPDOWN TRIGGER */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            id="user-profile-dropdown-btn"
            className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 sm:pr-2.5 rounded-2xl border border-emerald-500/25 glass-surface hover:border-emerald-500/50 transition-all cursor-pointer group shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {/* Avatar Circle with Online Pulse */}
            <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-xs font-black text-slate-950 shadow-md group-hover:scale-105 transition-transform shrink-0">
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-black" />
            </div>

            {/* Profile Info (shown on 2xl+ to avoid crowding on 1024-1440px laptops) */}
            <div className="hidden 2xl:flex flex-col text-left leading-tight">
              <span className="font-extrabold text-xs text-text-main group-hover:text-emerald-400 transition-colors truncate max-w-[120px]">
                {currentUser.name || currentUser.email || (locale === 'ta' ? 'பயனர்' : 'User')}
              </span>
              <span className="text-[10px] font-semibold text-emerald-400/90 truncate max-w-[120px]">
                {currentUser.role || (locale === 'ta' ? 'விவசாயி' : 'Farmer')}
              </span>
            </div>

            <ChevronDown
              size={14}
              className={`text-text-muted transition-transform duration-200 shrink-0 ${isDropdownOpen ? 'rotate-180 text-emerald-400' : ''
                }`}
            />
          </button>

          {/* DROPDOWN MENU */}
          {isDropdownOpen && (
            <div
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="user-profile-dropdown-btn"
              className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-[340px] rounded-3xl border dark:border-emerald-500/30 border-emerald-500/40 dark:bg-[#060f0a]/95 bg-white/95 dark:text-white text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.18),0_0_25px_rgba(16,185,129,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(16,185,129,0.18)] backdrop-blur-2xl z-50 p-4 transition-all"
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
                    {liveWeather?.emoji ? (
                      <span className="text-sm leading-none">{liveWeather.emoji}</span>
                    ) : (
                      <CloudSun size={15} className="text-amber-500 dark:text-amber-400" />
                    )}
                    <span className="font-bold">{locale === 'ta' ? 'வானிலை தரவு' : 'Weather Telemetry'}</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/25 font-mono">
                    {liveWeather ? `${liveWeather.tempMax}° / ${liveWeather.tempMin}°C` : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-xl dark:bg-white/5 bg-slate-100 p-2 border dark:border-white/5 border-slate-200">
                    <span className="block dark:text-white/50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      {locale === 'ta' ? 'ஈரப்பதம்' : 'Humidity'}
                    </span>
                    <span className="font-extrabold dark:text-white text-slate-900 font-mono">
                      {liveWeather ? liveWeather.humidityRange : '—'}
                    </span>
                  </div>
                  <div className="rounded-xl dark:bg-white/5 bg-slate-100 p-2 border dark:border-white/5 border-slate-200">
                    <span className="block dark:text-white/50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      {locale === 'ta' ? 'மழை' : 'Rainfall'}
                    </span>
                    <span className="font-extrabold text-sky-700 dark:text-sky-400 font-mono">
                      {liveWeather ? liveWeather.rainfallMm : '—'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-slate-500 dark:text-white/60 font-semibold truncate">
                    {liveWeather?.locationLabel || (locale === 'ta' ? 'தமிழ்நாடு' : 'Tamil Nadu')}
                  </span>
                  <Link
                    href="/weather"
                    onClick={() => setIsDropdownOpen(false)}
                    className="font-bold text-sky-600 dark:text-sky-400 hover:underline shrink-0"
                  >
                    {locale === 'ta' ? 'வானிலை காண்க →' : '10-Day Forecast →'}
                  </Link>
                </div>
              </div>

              {/* Logout Button */}
              <div className="pt-3">
                <button
                  type="button"
                  id="btn-topbar-logout"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setLogoutModalOpen(true);
                  }}
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
        <div className="relative lg:hidden shrink-0" ref={mobileNavRef}>
          <button
            type="button"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/10 glass-surface text-text-secondary transition-colors hover:text-text-main cursor-pointer shadow-sm shrink-0"
            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
          </button>

          {/* Mobile Collapsible Navigation Menu Drawer */}
          {mobileNavOpen && (
            <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-[340px] rounded-3xl border dark:border-emerald-500/30 border-emerald-500/40 dark:bg-[#060f0a]/95 bg-white/95 dark:text-white text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.18),0_0_25px_rgba(16,185,129,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(16,185,129,0.18)] backdrop-blur-2xl z-50 p-4 transition-all">
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
                  const isActive =
                    item.href === '/'
                      ? pathname === '/'
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all ${isActive
                        ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 dark:border-emerald-400/35 ring-1 ring-emerald-500/30'
                        : 'text-slate-600 dark:text-text-secondary hover:bg-slate-500/10 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-text-main'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-text-muted'} />
                        <span>{item.title}</span>
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>

      {/* Sign Out Confirmation Modal */}
      <Modal
        open={logoutModalOpen}
        onCancel={() => {
          if (!loggingOut) setLogoutModalOpen(false);
        }}
        onOk={handleLogout}
        confirmLoading={loggingOut}
        centered
        title={
          <div className="flex items-center gap-2 text-rose-500 font-black">
            <LogOut size={18} />
            <span>{locale === 'ta' ? 'கணக்கிலிருந்து வெளியேறவா?' : 'Confirm Sign Out'}</span>
          </div>
        }
        okText={locale === 'ta' ? 'வெளியேறு' : 'Sign Out'}
        cancelText={locale === 'ta' ? 'ரத்து' : 'Cancel'}
        okButtonProps={{ danger: true, className: 'font-bold rounded-xl' }}
        cancelButtonProps={{ disabled: loggingOut, className: 'font-bold rounded-xl' }}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 m-0 py-2 leading-relaxed">
          {locale === 'ta'
            ? 'உங்கள் கணக்கிலிருந்து வெளியேற விரும்புகிறீர்களா? உங்கள் சர்வர் அமர்வு உடனடியாக முடிவுக்கு வரும்.'
            : 'Are you sure you want to sign out of your account? Your server session will be immediately ended.'}
        </p>
      </Modal>
    </>
  );
};

export default Topbar;
