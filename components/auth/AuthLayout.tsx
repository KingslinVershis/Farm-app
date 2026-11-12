'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ThemeSwitch } from '@/components/layout/ThemeSwitch';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { locale, setLocale } = useLanguage();
  const logoSrc = '/images/logo.png';

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center bg-slate-100 dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden transition-colors">
      {/* 100% Width Edge-to-Edge Topbar */}
      <header className="w-full border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#090f1b]/75 backdrop-blur-2xl sticky top-0 z-50 shadow-sm dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
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
      <main className="flex-1 w-full flex items-center justify-center px-4 py-6 sm:py-10 my-auto">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full py-4 px-4 sm:px-8 border-t border-slate-200 dark:border-white/5 text-center text-slate-500 dark:text-white/40">
        <p className="text-[11px] font-semibold tracking-wide">
          © {new Date().getFullYear()} Kaveri Delta Farming Intelligence Network. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
