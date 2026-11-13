'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  SproutIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  FlaskConicalIcon,
  WavesIcon,
  CloudSunIcon,
} from '../icons/Icons';
import { Store, CloudRain, ShieldCheck, Sparkles } from '@/components/icons/FlaticonIcons';
import type { SidebarProps } from '@/types/components';
import { useLanguage } from '@/components/providers/LanguageProvider';

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const { messages } = useLanguage();
  const logoSrc = '/images/logo.png';

  const handleLinkClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navItems = [
    { key: 'dashboard', title: messages.sidebar.dashboard, href: '/', icon: LayoutDashboardIcon },
    { key: 'fertilizer', title: messages.sidebar.fertilizer, href: '/fertilizer', icon: FlaskConicalIcon },
    { key: 'fertilizer-stock', title: (messages.sidebar as any).fertilizerStock || 'Fertilizer Details', href: '/fertilizer-stock', icon: Store },
    { key: 'reservoirs', title: messages.sidebar.reservoirs, href: '/reservoirs', icon: WavesIcon },
    { key: 'weather', title: (messages.sidebar as any).weather || 'Agro Weather', href: '/weather', icon: CloudSunIcon },
    { key: 'weather-mcp', title: messages.sidebar.weatherMcp || 'Weather MCP Lab', href: '/weather-mcp', icon: Sparkles },
    { key: 'rainfall', title: (messages.sidebar as any).rainfall || 'Rainfall Report', href: '/rainfall', icon: CloudRain },
    { key: 'crop-health', title: (messages.sidebar as any).cropHealth || 'Crop Health', href: '/crop-health', icon: ShieldCheck },
    { key: 'seeds', title: (messages.sidebar as any).seeds || 'TNAU Seeds', href: '/seeds', icon: SproutIcon },
    { key: 'settings', title: messages.sidebar.settings, href: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside
      className={`app-sidebar fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-border-subtle bg-sidebar text-text-main transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-[260px]'
      } ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-[70px] items-center justify-between border-b border-border-subtle px-4">
        <Link href="/" className="flex items-center gap-3 overflow-hidden" onClick={handleLinkClick}>
          <Image
            src={logoSrc}
            alt="Logo"
            width={180}
            height={55}
            unoptimized
            priority
            className="h-11 sm:h-12 w-auto object-contain"
          />
        </Link>

        {/* Mobile close button or desktop collapse button */}
        {mobileOpen ? (
          <button
            onClick={onCloseMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-light bg-surface text-text-secondary hover:text-text-main lg:hidden"
            aria-label="Close menu"
          >
            <XIcon size={18} />
          </button>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="hidden h-7 w-7 items-center justify-center rounded-md border border-border-subtle bg-surface/80 text-text-muted transition-colors hover:text-text-main lg:flex"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />}
          </button>
        )}
      </div>

      {/* IoT Live Status Pill */}
      {!isCollapsed && (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-medium">{(messages.sidebar as any).meshStatus || '99.4% IoT Mesh Online'}</span>
          </div>
        </div>
      )}

      {/* Nav Link Section */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
        {!isCollapsed && (
          <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
            {messages.sidebar.quickActions}
          </div>
        )}
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
              onClick={handleLinkClick}
              className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/15 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.22)] border border-emerald-400/35 ring-1 ring-emerald-500/30'
                  : 'text-text-secondary hover:bg-white/[0.06] hover:text-text-main'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? item.title : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-md bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              )}
              <div
                className={`transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-emerald-400' : 'text-text-muted group-hover:text-text-main'
                }`}
              >
                <Icon size={20} />
              </div>
              {!isCollapsed && (
                <span className="truncate">{item.title}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
