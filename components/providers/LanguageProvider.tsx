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
      const saved = localStorage.getItem('agripulse_locale') as Locale;
      if (saved === 'en' || saved === 'ta') {
        setLocaleState(saved);
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('agripulse_locale', newLocale);
    } catch {
      // Ignore
    }
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
