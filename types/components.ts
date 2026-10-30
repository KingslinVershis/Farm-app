import type * as React from 'react';
import type { IconProps } from '@/components/icons/Icons';


// ─────────────────────────────────────────────────────────────
// Layout Components
// ─────────────────────────────────────────────────────────────

export interface AppShellProps {
  children: React.ReactNode;
}

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export interface TopbarProps {
  onOpenMobileMenu: () => void;
}

// ─────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────

export interface NavItem {
  title: string;
  href: string;
  /** Must be one of the exported icon components from Icons.tsx. */
  icon: React.ComponentType<IconProps>;
  badge?: string;
}

// ─────────────────────────────────────────────────────────────
// Dashboard Page Sub-Components
// ─────────────────────────────────────────────────────────────

export interface MetricCardProps {
  icon: React.ComponentType<IconProps>;
  label: string;
  value: string;
  trend: string;
  isPositive?: boolean;
  /** CSS custom property or hex colour string. */
  accentColor: string;
}

export interface SectorRowProps {
  name: string;
  crop: string;
  /** Soil moisture 0-100 percent. */
  moisture: number;
  /** Human-readable status label. */
  status: string;
  /** CSS custom property or hex colour for the status badge. */
  statusColor: string;
}

export interface ScheduleItemProps {
  /** UTC time label, e.g. "18:30 UTC". */
  time: string;
  title: string;
  desc: string;
  status: string;
  /** CSS custom property or hex colour for the status text. */
  badgeColor: string;
}

// ─────────────────────────────────────────────────────────────
// Page-Level Info Card (used in sub-route pages)
// ─────────────────────────────────────────────────────────────

export interface PageInfoCardProps {
  icon: React.ComponentType<IconProps>;
  /** Colour applied to the icon wrapper background as a CSS value. */
  iconBg: string;
  /** Colour applied to the icon itself as a CSS value. */
  iconColor: string;
  headline: string;
  subtext: string;
}
