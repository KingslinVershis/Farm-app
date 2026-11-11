'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { en, TranslationType } from '@/messages/en';
import { tamil } from '@/messages/tamil';

export type Locale = 'en' | 'ta';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  messages: TranslationType;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  toggleLocale: () => {},
  messages: en,
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    try {
      const saved = (localStorage.getItem('farmhub_locale') || localStorage.getItem('agripulse_locale')) as Locale;
      if (saved === 'en' || saved === 'ta') {
        setLocaleState(saved);
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }, []);

  const isPublicRoute = () =>
    typeof window !== 'undefined' &&
    ['/signin', '/signup', '/forgot-password'].some(
      (route) => window.location.pathname === route || window.location.pathname.startsWith(`${route}/`)
    );

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('farmhub_locale', newLocale);
      localStorage.setItem('agripulse_locale', newLocale);
    } catch {
      // Ignore
    }

    // On public routes, persist via localStorage only without calling /api/user/language
    if (isPublicRoute()) return;

    // Persist language to user account
    try {
      fetch('/api/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLocale }),
      }).catch(() => {});
    } catch {}
  };

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'ta' : 'en');
  };

  const messages = locale === 'ta' ? tamil : en;

  return (
    <LanguageContext.Provider value={{ locale, setLocale, toggleLocale, messages }}>
      <NextIntlClientProvider locale={locale} messages={messages as any}>
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
}
