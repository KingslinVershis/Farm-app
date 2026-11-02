'use client';

import React from 'react';
import Link from 'next/link';
import { SproutIcon } from '@/components/icons/Icons';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ThemeSwitch } from '@/components/layout/ThemeSwitch';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { messages, locale, setLocale } = useLanguage();

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center bg-black text-white selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden">
      {/* 100% Width Edge-to-Edge Topbar */}
      <header className="w-full border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 sm:py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.35)] backdrop-blur-md transition-transform group-hover:scale-105">
              <SproutIcon size={24} />
            </div>
            <div>
              <h1 className="font-display text-base sm:text-lg font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                {messages.common?.brandName || 'AgriPulse'}
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                {messages.common?.brandSubtitle || 'Precision Agriculture OS'}
              </p>
            </div>
          </Link>

          {/* Language & Theme Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center rounded-xl border border-white/15 bg-black/60 p-1 shadow-lg backdrop-blur-md">
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  locale === 'en'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale('ta')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  locale === 'ta'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'text-white/70 hover:text-white'
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
      <footer className="w-full py-4 px-4 sm:px-8 border-t border-white/5 text-center text-white/40">
        <p className="text-[11px] font-semibold tracking-wide">
          © {new Date().getFullYear()} AgriPulse Kaveri Delta Farming Intelligence Network. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

