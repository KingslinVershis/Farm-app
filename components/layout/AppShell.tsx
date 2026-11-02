'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { AppShellProps } from '@/types/components';

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const isAuthPage =
    pathname === '/signin' ||
    pathname === '/signup' ||
    pathname?.startsWith('/signin') ||
    pathname?.startsWith('/signup');

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  if (isAuthPage) {
    return (
      <main className="min-h-screen w-full bg-black font-sans text-text-main">
        {children}
      </main>
    );
  }

  return (
    <div className="app-shell-bg flex min-h-screen w-full bg-app font-sans text-text-main">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setMobileOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      {/* Left Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Column: Sticky Topbar + Content UI */}
      <div
        className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-[260px]'
        }`}
      >
        <Topbar onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 w-full">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
