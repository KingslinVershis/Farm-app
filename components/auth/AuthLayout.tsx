'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ThemeSwitch } from '@/components/layout/ThemeSwitch';
import { useTheme } from '@/components/providers/ThemeProvider';
import Galaxy from '@/components/reactbits/Galaxy';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { locale, setLocale } = useLanguage();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const logoSrc = '/images/logo.png';
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  React.useEffect(() => {
    const handleLoginState = (e: Event) => {
      const customEvent = e as CustomEvent<{ active: boolean }>;
      setIsLoggingIn(Boolean(customEvent.detail?.active));
    };

    window.addEventListener('farm-login-loader-state', handleLoginState);
    return () => {
      window.removeEventListener('farm-login-loader-state', handleLoginState);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden transition-colors">
      {/* Galaxy Cosmic WebGL Starfield Background - hidden while user is logging in to avoid page weight */}
      {!isLoggingIn && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <Galaxy
            focal={[0.5, 0.5]}
            starSpeed={0.4}
            density={1.1}
            speed={0.9}
            glowIntensity={0.35}
            twinkleIntensity={0.45}
            mouseInteraction={true}
            mouseRepulsion={true}
            repulsionStrength={2.5}
            autoCenterRepulsion={0}
            transparent={true}
            lightMode={isLight}
            backgroundColor={isLight ? '#f8fafc' : '#030712'}
            starColors={
              isLight
                ? ['#059669', '#0284c7', '#2563eb', '#334155']
                : ['#10b981', '#06b6d4', '#60a5fa', '#ffffff']
            }
            opacity={0.85}
            clickWarp={true}
          />
          {/* Soft atmospheric overlay ensuring form fields and text stay crisp */}
          <div className="absolute inset-0 bg-white/10 dark:bg-black/40 backdrop-blur-[0.5px] pointer-events-none" />
        </div>
      )}

      {/* 100% Width Edge-to-Edge Topbar */}
      <header className="w-full border-b border-slate-200/50 dark:border-white/10 bg-white/85 dark:bg-[#090f1b]/80 backdrop-blur-2xl sticky top-0 z-50 shadow-sm dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 sm:py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center group py-0.5">
            <Image
              src={logoSrc}
              alt="Logo"
              width={220}
              height={68}
              unoptimized
              priority
              className="h-11 sm:h-12 md:h-14 w-auto object-contain group-hover:scale-105 transition-transform"
            />
          </Link>

          {/* Language & Theme Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-black/60 p-1 shadow-sm dark:shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  locale === 'en'
                    ? 'bg-emerald-500 text-white keep-white font-black shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale('ta')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  locale === 'ta'
                    ? 'bg-emerald-500 text-white keep-white font-black shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white'
                }`}
              >
                தமிழ்
              </button>
            </div>
            <ThemeSwitch id="auth-common-theme-switch" />
          </div>
        </div>
      </header>

      {/* Main Content Area: Fully Responsive Centered Form */}
      <main className="relative z-10 flex-1 w-full flex items-center justify-center px-4 py-6 sm:py-10 my-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 px-4 sm:px-8 border-t border-slate-200/50 dark:border-white/5 text-center text-slate-500 dark:text-white/40">
        <p className="text-[11px] font-semibold tracking-wide">
          © {new Date().getFullYear()} Kaveri Delta Farming Intelligence Network. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
