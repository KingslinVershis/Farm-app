'use client';

import React from 'react';
import { FlaskConicalIcon } from '@/components/icons/Icons';
import { useLanguage } from '@/components/providers/LanguageProvider';

export const BG_THEMES = [
  { id: 'aerial', name: 'Aerial Farmland', path: '/images/pexels-masoodaslami-32047262.jpg', icon: '🌾' },
  { id: 'meadow', name: 'Green Field', path: '/images/farm1.jpg', icon: '🌱' },
  { id: 'harvest', name: 'Straw Harvest', path: '/images/pexels-mazhar-arslanoglu-706220627-38389252.jpg', icon: '🚜' },
  { id: 'soil', name: 'Rich Soil', path: '/images/plant-growing-from-soil.jpg', icon: '🌿' },
];

interface HeaderBannerProps {
  bgImage: string;
  setBgImage: (path: string) => void;
  landSize: number;
  location: string;
  pageView: 'records' | 'wizard';
  savedRecordsCount: number;
  onOpenSavedRecords: () => void;
  onCreateNewRecord: () => void;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  bgImage,
  setBgImage,
  landSize,
  location,
  pageView,
  savedRecordsCount,
  onOpenSavedRecords,
  onCreateNewRecord,
}) => {
  const { messages } = useLanguage();
  const t = messages.fertilizer;

  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl glass-panel p-4 sm:p-6 shadow-2xl transition-all">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-0.5 text-xs font-bold text-emerald-400 shadow-sm">
              <FlaskConicalIcon size={13} />
              {t.header.badge}
            </span>
            <span className="text-xs text-text-muted">•</span>
            <span className="text-xs font-bold text-text-secondary glass-surface px-2.5 py-0.5 rounded-full border border-white/10">
              {landSize} {messages.common.cents}
            </span>
            <span className="text-xs text-text-muted hidden sm:inline">•</span>
            <span className="text-xs font-semibold text-emerald-400 hidden sm:inline">
              {location || 'Precision Agro Zone'}
            </span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-text-main drop-shadow-sm">
            {t.header.title}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
            {t.header.subtitle}
          </p>
        </div>

        {/* Unified Action Controls & Photography Theme Switcher Container */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl glass-surface p-1.5 shadow-inner border border-white/10 shrink-0">
          {pageView === 'wizard' ? (
            <button
              type="button"
              onClick={onOpenSavedRecords}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/30 transition-all cursor-pointer shadow-sm"
            >
              <span>🗂️</span>
              <span>All Saved Records ({savedRecordsCount})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCreateNewRecord}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-glow hover:bg-emerald-400 transition-all cursor-pointer"
            >
              <span>➕</span>
              <span>New Record</span>
            </button>
          )}

          <div className="h-5 w-px bg-white/10 hidden sm:block mx-0.5" />

          {/* Photography Backdrop Switcher */}
          <div className="flex items-center gap-1">
            {BG_THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setBgImage(theme.path)}
                title={`Switch backdrop to ${theme.name}`}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  bgImage === theme.path
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-text-secondary hover:text-text-main hover:bg-white/5'
                }`}
              >
                <span>{theme.icon}</span>
                <span className="text-[11px] hidden lg:inline">{theme.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
