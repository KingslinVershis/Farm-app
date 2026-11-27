'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import { useTheme } from '@/components/providers/ThemeProvider';
import { ThemeSwitch } from './ThemeSwitch';
import { clearClientSessionStorage } from './AppShell';
import { fetchUserData } from '@/lib/clientUser';
import StaggeredMenu from '@/components/reactbits/StaggeredMenu';
import ScrambleText from '@/components/reactbits/ScrambleText';
import type { TopbarProps } from '@/types/components';
import { App, Modal } from 'antd';
import {
  readSavedWeatherLocation,
  WEATHER_LOCATION_EVENT,
} from '@/lib/weather';

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [timeStr, setTimeStr] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const subNavDropdownRef = useRef<HTMLDivElement>(null);
  const fertNavDropdownRef = useRef<HTMLDivElement>(null);
  const [isSubNavOpen, setIsSubNavOpen] = useState(false);
  const [isFertNavOpen, setIsFertNavOpen] = useState(false);

  const { locale, setLocale, messages } = useLanguage();
  const tb = messages.topbar;
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // StaggeredMenu items for screensizes below 1024px
  const staggeredMenuItems = useMemo(
    () => [
      {
        label: messages.sidebar.dashboard || 'Home',
        link: '/',
        ariaLabel: 'Go to home',
        icon: LayoutDashboardIcon,
      },
      {
        label: messages.sidebar.fertilizer || 'Fertilizer Mgmt',
        link: '/fertilizer',
        ariaLabel: 'Fertilizer planner',
        icon: FlaskConicalIcon,
      },
      {
        label: (messages.sidebar as any).fertilizerStock || 'Fertilizer Details',
        link: '/fertilizer-stock',
        ariaLabel: 'Fertilizer stock',
        icon: Store,
      },
      {
        label: messages.sidebar.weatherMcp || 'Weather',
        link: '/weather-mcp',
        ariaLabel: 'Live weather',
        icon: CloudSunIcon,
      },
      {
        label: messages.sidebar.reservoirs || 'Reservoirs Data',
        link: '/reservoirs',
        ariaLabel: 'Reservoirs data',
        icon: WavesIcon,
      },
      {
        label: (messages.sidebar as any).cropHealth || 'Crop Health',
        link: '/crop-health',
        ariaLabel: 'Crop health advisory',
        icon: ShieldCheck,
      },
      {
        label: (messages.sidebar as any).rainfall || 'Rainfall Report',
        link: '/rainfall',
        ariaLabel: 'Rainfall telemetry',
        icon: CloudRain,
      },
      {
        label: (messages.sidebar as any).seeds || 'TNAU Seed Prices',
        link: '/seeds',
        ariaLabel: 'TNAU seeds',
        icon: SproutIcon,
      },
      {
        label: messages.sidebar.settings || 'Settings',
        link: '/settings',
        ariaLabel: 'Application settings',
        icon: SettingsIcon,
      },
    ],
    [messages]
  );

  // Combined Fertilizer Sub-Topbar items (Fertilizer Management & Fertilizer Details)
  const fertNavItems = [
    { key: 'fertilizer', title: messages.sidebar.fertilizer, href: '/fertilizer', icon: FlaskConicalIcon },
    { key: 'fertilizer-stock', title: (messages.sidebar as any).fertilizerStock || 'Fertilizer Details', href: '/fertilizer-stock', icon: Store },
  ];

  const isFertNavActive = fertNavItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  // Combined Agri Services Sub-Topbar items (Reservoirs, Crop Health, Rainfall Report, Seed Prices)
  const subNavItems = [
    { key: 'reservoirs', title: messages.sidebar.reservoirs, href: '/reservoirs', icon: WavesIcon },
    { key: 'crop-health', title: (messages.sidebar as any).cropHealth || 'Crop Health', href: '/crop-health', icon: ShieldCheck },
    { key: 'rainfall', title: (messages.sidebar as any).rainfall || 'Rainfall Report', href: '/rainfall', icon: CloudRain },
    { key: 'seeds', title: (messages.sidebar as any).seeds || 'TNAU Seeds', href: '/seeds', icon: SproutIcon },
  ];

  const isSubNavActive = subNavItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  // Primary Navigation Items
  const primaryNavItems = [
    { key: 'dashboard', title: messages.sidebar.dashboard, href: '/', icon: LayoutDashboardIcon },
    { key: 'weather', title: messages.sidebar.weatherMcp || 'Weather', href: '/weather-mcp', icon: CloudSunIcon },
    { key: 'settings', title: messages.sidebar.settings, href: '/settings', icon: SettingsIcon },
  ];

  // Mobile flat menu includes all items
  const mobileNavItems = [
    { key: 'dashboard', title: messages.sidebar.dashboard, href: '/', icon: LayoutDashboardIcon },
    { key: 'fertilizer', title: messages.sidebar.fertilizer, href: '/fertilizer', icon: FlaskConicalIcon },
    { key: 'fertilizer-stock', title: (messages.sidebar as any).fertilizerStock || 'Fertilizer Details', href: '/fertilizer-stock', icon: Store },
    { key: 'weather-mcp', title: messages.sidebar.weatherMcp || 'Weather', href: '/weather-mcp', icon: CloudSunIcon },
    { key: 'reservoirs', title: messages.sidebar.reservoirs, href: '/reservoirs', icon: WavesIcon },
    { key: 'crop-health', title: (messages.sidebar as any).cropHealth || 'Crop Health', href: '/crop-health', icon: ShieldCheck },
    { key: 'rainfall', title: (messages.sidebar as any).rainfall || 'Rainfall Report', href: '/rainfall', icon: CloudRain },
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
    avatar_url?: string;
  }>({
    name: '',
    email: '',
    role: '',
    avatar_url: '',
  });

  useEffect(() => {
    const applyUser = (userData: { name?: string; username?: string; email?: string; role?: string; avatar_url?: string }) => {
      if (!userData) return;
      const resolvedName = userData.username || userData.name || (userData.email ? userData.email.split('@')[0] : '');
      const resolvedRole = userData.role || tb.farmer;
      const resolvedEmail = userData.email || '';
      const resolvedAvatar = userData.avatar_url || '';
      if (resolvedName || resolvedEmail) {
        setCurrentUser({
          name: resolvedName,
          email: resolvedEmail,
          role: resolvedRole,
          avatar_url: resolvedAvatar,
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

      // 3. Sync from /api/user once per session if not already hydrated (deduplicated)
      fetchUserData().then((data) => {
        if (data?.success && data?.user) {
          applyUser(data.user);
        }
      });

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

  // Load weather telemetry for the user's selected/saved location
  useEffect(() => {
    let active = true;

    const loadWeatherSummary = (overrideLoc?: {
      districtId?: string;
      blockId?: string;
      districtName?: string;
      blockName?: string;
    }) => {
      try {
        const loc = overrideLoc || readSavedWeatherLocation();
        const distText = loc.districtName || '';
        const blockText = loc.blockName || '';
        if (!active) return;

        setLiveWeather((prev) => ({
          tempMax: prev?.tempMax || '31.5',
          tempMin: prev?.tempMin || '24.0',
          humidityRange: prev?.humidityRange || '65–78%',
          rainfallMm: prev?.rainfallMm || '0.0 mm',
          locationLabel: blockText && distText ? `${blockText}, ${distText}` : distText || blockText || tb.tamilNadu,
          emoji: prev?.emoji || '☀️',
        }));
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
      if (
        mobileNavRef.current &&
        !mobileNavRef.current.contains(event.target as Node) &&
        !(event.target as Element)?.closest?.('.staggered-menu-wrapper')
      ) {
        setMobileNavOpen(false);
      }
      if (subNavDropdownRef.current && !subNavDropdownRef.current.contains(event.target as Node)) {
        setIsSubNavOpen(false);
      }
      if (fertNavDropdownRef.current && !fertNavDropdownRef.current.contains(event.target as Node)) {
        setIsFertNavOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setMobileNavOpen(false);
        setIsSubNavOpen(false);
        setIsFertNavOpen(false);
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
    message.success(tb.signedOutSuccess);
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
        {/* Left Section: Mobile Hamburger Toggle (at page left end on < lg tablet & small screens) + Desktop Navigation Tabs (on lg+) */}
        <div className="flex items-center gap-2">
          {/* Mobile Hamburger Menu Toggle Button (shown on tablet & small screens < lg) */}
          <div className="relative lg:hidden shrink-0" ref={mobileNavRef}>
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen((prev) => !prev);
                onOpenMobileMenu?.();
              }}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-white/10 glass-surface text-text-secondary transition-colors hover:text-text-main cursor-pointer shadow-sm shrink-0"
              aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
            </button>

            {/* ReactBits StaggeredMenu: Full-page drawer on screens < 1024px (mobile & tablet) */}
            <div className="lg:hidden">
              <StaggeredMenu
                isOpen={mobileNavOpen}
                onOpenChange={setMobileNavOpen}
                position="left"
                isFixed={true}
                items={staggeredMenuItems}
                displayItemNumbering={false}
                colors={
                  isDark
                    ? ['#080d16', '#0d1524', '#121c2d', '#17253d']
                    : ['#f8fafc', '#f1f5f9', '#e2e8f0', '#ffffff']
                }
                accentColor="#10b981"
                logoUrl="/images/logo.png"
                showToggle={true}
                onMenuOpen={() => setMobileNavOpen(true)}
                onMenuClose={() => setMobileNavOpen(false)}
              />
            </div>
          </div>

          {/* Main Desktop Navigation Tabs (shown on lg+) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 px-1 shrink-0" aria-label="Main Navigation">
        {/* Home Tab */}
        {(() => {
          const item = primaryNavItems[0]; // dashboard (Home)
          const isActive = pathname === '/';
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
              <ScrambleText
                text={item.title}
              />
            </Link>
          );
        })()}

        {/* Combined Fertilizer Sub-Topbar Dropdown Tab (Fertilizer Management & Fertilizer Details) */}
        <div className="relative" ref={fertNavDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsFertNavOpen((prev) => !prev);
              setIsSubNavOpen(false);
            }}
            aria-expanded={isFertNavOpen}
            className={`group relative flex items-center gap-1.5 xl:gap-2 rounded-xl px-2.5 py-1.5 xl:px-3.5 xl:py-2 text-xs xl:text-sm font-bold transition-all cursor-pointer ${
              isFertNavActive || isFertNavOpen
                ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/15 text-emerald-800 dark:text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.22)] border border-emerald-500/40 dark:border-emerald-400/35 ring-1 ring-emerald-500/30'
                : 'text-slate-600 dark:text-text-secondary hover:bg-slate-500/10 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-text-main'
            }`}
          >
            <FlaskConicalIcon
              size={16}
              className={`transition-transform duration-200 group-hover:scale-110 xl:w-[17px] xl:h-[17px] ${
                isFertNavActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-text-muted'
              }`}
            />
            <ScrambleText
              text={(messages.sidebar as any).fertilizerHub || 'Fertilizer Services'}
            />
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 text-slate-400 ${
                isFertNavOpen ? 'rotate-180 text-emerald-500' : ''
              }`}
            />
          </button>

          {/* Fertilizer Menu Popover */}
          {isFertNavOpen && (
            <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-emerald-500/30 dark:border-emerald-500/20 bg-white/95 dark:bg-[#060f0a]/95 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-b border-border-subtle">
                {(messages.sidebar as any).fertilizerHub || 'Fertilizer Services'}
              </div>
              {fertNavItems.map((fItem) => {
                const isFActive =
                  pathname === fItem.href || pathname.startsWith(`${fItem.href}/`);
                const FIcon = fItem.icon;
                return (
                  <Link
                    key={fItem.href}
                    href={fItem.href}
                    prefetch={false}
                    onClick={() => setIsFertNavOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all group ${
                      isFActive
                        ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/15 text-emerald-800 dark:text-emerald-300 font-extrabold border border-emerald-500/30'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isFActive
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                          : 'glass-surface text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300'
                      }`}
                    >
                      <FIcon size={16} />
                    </div>
                    <span className="truncate">
                      <ScrambleText text={fItem.title} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Weather Tab */}
        {(() => {
          const item = primaryNavItems[1]; // weather (/weather-mcp)
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-1.5 xl:gap-2 rounded-xl px-2.5 py-1.5 xl:px-3.5 xl:py-2 text-xs xl:text-sm font-bold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500/25 to-teal-500/15 text-sky-800 dark:text-sky-300 shadow-[0_0_18px_rgba(14,165,233,0.22)] border border-sky-500/40 dark:border-sky-400/35 ring-1 ring-sky-500/30'
                  : 'text-slate-600 dark:text-text-secondary hover:bg-slate-500/10 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-text-main'
              }`}
            >
              <Icon
                size={16}
                className={`transition-transform duration-200 group-hover:scale-110 xl:w-[17px] xl:h-[17px] ${
                  isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-text-muted group-hover:text-slate-800 dark:group-hover:text-text-main'
                }`}
              />
              <ScrambleText
                text={item.title}
              />
            </Link>
          );
        })()}

        {/* Combined Sub-Topbar Dropdown Tab (Reservoirs, Crop Health, Rainfall Report, Seeds) */}
        <div className="relative" ref={subNavDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsSubNavOpen((prev) => !prev);
              setIsFertNavOpen(false);
            }}
            aria-expanded={isSubNavOpen}
            className={`group relative flex items-center gap-1.5 xl:gap-2 rounded-xl px-2.5 py-1.5 xl:px-3.5 xl:py-2 text-xs xl:text-sm font-bold transition-all cursor-pointer ${
              isSubNavActive || isSubNavOpen
                ? 'bg-gradient-to-r from-cyan-500/25 to-emerald-500/20 text-cyan-800 dark:text-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.22)] border border-cyan-500/40 dark:border-cyan-400/35 ring-1 ring-cyan-500/30'
                : 'text-slate-600 dark:text-text-secondary hover:bg-slate-500/10 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-text-main'
            }`}
          >
            <WavesIcon
              size={16}
              className={`transition-transform duration-200 group-hover:scale-110 xl:w-[17px] xl:h-[17px] ${
                isSubNavActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-text-muted'
              }`}
            />
            <ScrambleText
              text={(messages.sidebar as any).agriServices || 'Agri Advisory & Water'}
            />
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 text-slate-400 ${
                isSubNavOpen ? 'rotate-180 text-cyan-500' : ''
              }`}
            />
          </button>

          {/* Sub-Topbar Menu Popover */}
          {isSubNavOpen && (
            <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-cyan-500/30 dark:border-cyan-500/20 bg-white/95 dark:bg-[#071317]/95 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 border-b border-border-subtle">
                {(messages.sidebar as any).agriServices || 'Agri Advisory & Water'}
              </div>
              {subNavItems.map((subItem) => {
                const isSubActive =
                  pathname === subItem.href || pathname.startsWith(`${subItem.href}/`);
                const SubIcon = subItem.icon;
                return (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    prefetch={false}
                    onClick={() => setIsSubNavOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all group ${
                      isSubActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/15 text-cyan-800 dark:text-cyan-300 font-extrabold border border-cyan-500/30'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSubActive
                          ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300'
                          : 'glass-surface text-slate-500 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-300'
                      }`}
                    >
                      <SubIcon size={16} />
                    </div>
                    <span className="truncate">
                      <ScrambleText text={subItem.title} />
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Settings Tab */}
        {(() => {
          const item = primaryNavItems[2]; // settings
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
              <ScrambleText
                text={item.title}
              />
            </Link>
          );
        })()}
      </nav>
    </div>

    {/* Right Section: Language Switch, Theme Switch, Notifications, User Profile (at page right end) */}
    <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
        {/* Global Language Switch (same style as login/signup topbar) */}
        <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-black/60 p-0.5 sm:p-1 shadow-sm dark:shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              if (locale !== 'en') {
                setLocale('en');
                message.success(tb.langUpdatedEn || 'Language updated to English');
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
                message.success(tb.langUpdatedTa || 'மொழி தமிழாக மாற்றப்பட்டது!');
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
            <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-xs font-black text-slate-950 shadow-md group-hover:scale-105 transition-transform shrink-0 overflow-hidden">
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                initials
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-black" />
            </div>

            {/* Profile Info (shown on 2xl+ to avoid crowding on 1024-1440px laptops) */}
            <div className="hidden 2xl:flex flex-col text-left leading-tight">
              <span className="font-extrabold text-xs text-text-main group-hover:text-emerald-400 transition-colors truncate max-w-[120px]">
                {currentUser.name || currentUser.email || tb.user}
              </span>
              <span className="text-[10px] font-semibold text-emerald-400/90 truncate max-w-[120px]">
                {currentUser.role || tb.farmer}
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
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-sm font-black text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.35)] overflow-hidden">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm dark:text-white text-slate-900 truncate">
                      {currentUser.name || currentUser.email || tb.user}
                    </span>
                    <ShieldCheck size={14} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                  </div>
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold truncate">
                    {currentUser.role || tb.farmer}
                  </span>
                  {currentUser.email && (
                    <span className="text-[11px] dark:text-white/50 text-slate-500 truncate">
                      {currentUser.email}
                    </span>
                  )}
                </div>
              </div>

              {/* SECTION 2: Live Clock */}
              <div className="py-3 border-b dark:border-white/10 border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 dark:text-white/70 text-slate-600">
                    <Clock size={14} className="text-emerald-500 dark:text-emerald-400" />
                    <span className="font-bold">{tb.localTime}</span>
                  </div>
                  <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/25">
                    {timeStr || '12:00:00 PM'}
                  </span>
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
                    <span className="font-bold">{tb.weatherTelemetry}</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/25 font-mono">
                    {liveWeather ? `${liveWeather.tempMax}° / ${liveWeather.tempMin}°C` : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-xl dark:bg-white/5 bg-slate-100 p-2 border dark:border-white/5 border-slate-200">
                    <span className="block dark:text-white/50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      {tb.humidity}
                    </span>
                    <span className="font-extrabold dark:text-white text-slate-900 font-mono">
                      {liveWeather ? liveWeather.humidityRange : '—'}
                    </span>
                  </div>
                  <div className="rounded-xl dark:bg-white/5 bg-slate-100 p-2 border dark:border-white/5 border-slate-200">
                    <span className="block dark:text-white/50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      {tb.rainfall}
                    </span>
                    <span className="font-extrabold text-sky-700 dark:text-sky-400 font-mono">
                      {liveWeather ? liveWeather.rainfallMm : '—'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-slate-500 dark:text-white/60 font-semibold truncate">
                    {liveWeather?.locationLabel || tb.tamilNadu}
                  </span>
                  <Link
                    href="/weather-mcp"
                    onClick={() => setIsDropdownOpen(false)}
                    className="font-bold text-sky-600 dark:text-sky-400 hover:underline shrink-0"
                  >
                    {tb.weatherForecastLink}
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
                  <span>{tb.signOutBtn}</span>
                </button>
              </div>
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
            <span>{tb.confirmSignOutTitle}</span>
          </div>
        }
        okText={tb.signOutAction}
        cancelText={tb.cancelAction}
        okButtonProps={{ danger: true, className: 'font-bold rounded-xl' }}
        cancelButtonProps={{ disabled: loggingOut, className: 'font-bold rounded-xl' }}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 m-0 py-2 leading-relaxed">
          {tb.confirmSignOutMsg}
        </p>
      </Modal>
    </>
  );
};

export default Topbar;
