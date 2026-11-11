'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { message } from 'antd';
import { Topbar } from './Topbar';
import type { AppShellProps } from '@/types/components';

const PUBLIC_AUTH_ROUTES = ['/signin', '/signup', '/forgot-password', '/copy-otp'];

export function clearClientSessionStorage() {
  if (typeof window === 'undefined') return;
  (window as any).__farmhubUserSynced = false;
  document.cookie = 'farmhub_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
  document.cookie = 'agripulse_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
  try {
    sessionStorage.clear();
  } catch {}
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('farm_app_') ||
          key.startsWith('farmhub_') ||
          key.startsWith('agripulse_'))
      ) {
        if (key !== 'farmhub_theme' && key !== 'agripulse_theme' && key !== 'farmhub_locale' && key !== 'agripulse_locale') {
          localStorage.removeItem(key);
        }
      }
    }
  } catch {}
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const isAuthPage = PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );
  const redirectingRef = useRef(false);
  const lastVerifyRef = useRef(0);

  // Global 401 handler + cross-tab/cross-device session check on authenticated pages:
  // If server invalidated the session (e.g., password reset/change or account deletion),
  // log out locally and redirect to /signin with a security notification.
  useEffect(() => {
    if (isAuthPage || typeof window === 'undefined') return;

    const triggerForcedLogout = (notice: string) => {
      if (redirectingRef.current) return;
      redirectingRef.current = true;
      clearClientSessionStorage();
      message.warning(notice);
      setTimeout(() => {
        window.location.href = '/signin';
      }, 900);
    };

    const origFetch = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await origFetch(...args);
      if (response.status === 401 && !redirectingRef.current) {
        const reqUrl = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
        const isAuthEndpoint =
          reqUrl.includes('/api/signin') ||
          reqUrl.includes('/api/signup') ||
          reqUrl.includes('/api/forgot-password') ||
          reqUrl.includes('/api/logout');

        if (!isAuthEndpoint && reqUrl.includes('/api/')) {
          triggerForcedLogout('Your session was logged out for security purposes. Please sign in again.');
        }
      }
      return response;
    };

    const verifyActiveSession = () => {
      const now = Date.now();
      if (redirectingRef.current || now - lastVerifyRef.current < 3000) return;
      lastVerifyRef.current = now;
      origFetch('/api/user', { cache: 'no-store' })
        .then((res) => {
          if (res.status === 401) {
            triggerForcedLogout('Your session was logged out for security purposes. Please sign in again.');
          }
        })
        .catch(() => {});
    };

    const onVisibility = () => {
      if (!document.hidden) verifyActiveSession();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'farmhub_user' && e.newValue === null && !redirectingRef.current) {
        triggerForcedLogout('Your session has ended. Please sign in again.');
      }
    };

    window.addEventListener('focus', verifyActiveSession);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);

    return () => {
      window.fetch = origFetch;
      window.removeEventListener('focus', verifyActiveSession);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
    };
  }, [isAuthPage, pathname]);

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
