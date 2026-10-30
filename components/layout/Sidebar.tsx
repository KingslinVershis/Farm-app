'use client';

import React from 'react';
import Link from 'next/link';
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
} from '../icons/Icons';
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

  const handleLinkClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navItems = [
    { key: 'dashboard', title: messages.sidebar.dashboard, href: '/', icon: LayoutDashboardIcon },
    { key: 'fertilizer', title: messages.sidebar.fertilizer, href: '/fertilizer', icon: FlaskConicalIcon, badge: (messages.sidebar as any).fertilizerBadge || '5 Phases' },
    { key: 'reservoirs', title: messages.sidebar.reservoirs, href: '/reservoirs', icon: WavesIcon, badge: (messages.sidebar as any).reservoirsBadge || 'Live Level' },
    { key: 'seeds', title: (messages.sidebar as any).seeds || 'TNAU Seeds', href: '/seeds', icon: SproutIcon, badge: (messages.sidebar as any).seedsBadge || 'Govt Rates' },
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30">
            <SproutIcon size={22} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-display text-base font-extrabold tracking-tight text-text-main">
                {messages.common.brandName}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                {messages.common.brandSubtitle}
              </span>
            </div>
          )}
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
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 shadow-sm ring-1 ring-emerald-500/30'
                  : 'text-text-secondary hover:bg-surface hover:text-text-main'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={isCollapsed ? item.title : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-md bg-emerald-500 shadow-glow" />
              )}
              <div
                className={`transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-emerald-400' : 'text-text-muted group-hover:text-text-main'
                }`}
              >
                <Icon size={20} />
              </div>
              {!isCollapsed && (
                <>
                  <span className="truncate">{item.title}</span>
                  {item.badge && (
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 font-extrabold'
                          : 'bg-surface text-text-muted group-hover:text-text-secondary'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User / Farm Info Footer */}
      <div className="border-t border-border-subtle p-3">
        <div
          className={`flex items-center gap-3 rounded-lg border border-border-subtle bg-surface/50 p-2.5 ${
            isCollapsed ? 'justify-center p-2' : ''
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-400">
            GV
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden text-left text-xs leading-tight">
              <span className="truncate font-bold text-text-main">Kaveri Delta Agri Farm</span>
              <span className="truncate text-[11px] text-text-muted">Kumbakonam • Zone 4</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
