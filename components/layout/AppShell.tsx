'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Topbar } from './Topbar';
import type { AppShellProps } from '@/types/components';

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const isAuthPage =
    pathname === '/signin' ||
    pathname === '/signup' ||
    pathname?.startsWith('/signin') ||
    pathname?.startsWith('/signup');

  if (isAuthPage) {
    return (
      <main className="min-h-screen w-full bg-slate-100 dark:bg-black font-sans text-text-main transition-colors">
        {children}
      </main>
    );
  }

  return (
    <div className="app-shell-bg flex min-h-screen w-full flex-col bg-app font-sans text-text-main">
      <Topbar />
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
};

export default AppShell;
