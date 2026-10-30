'use client';

import React from 'react';
import { SproutIcon } from '@/components/icons/Icons';
import { useLanguage } from '@/components/providers/LanguageProvider';
import type { CultivationType, UserDetails } from '@/lib/fertilizer/types';

interface Step2CropSelectionProps {
  userDetails: UserDetails;
  cultivation: CultivationType;
  onSelectCrop: (crop: CultivationType) => void;
  onConfigureCrop: (crop: CultivationType) => void;
  onBackToStep1: () => void;
}

export const Step2CropSelection: React.FC<Step2CropSelectionProps> = ({
  userDetails,
  cultivation = 'paddy',
  onSelectCrop,
  onConfigureCrop,
  onBackToStep1,
}) => {
  const { messages } = useLanguage();
  const t = messages.fertilizer;

  const displayLocation =
    userDetails.location ||
    [userDetails.village || userDetails.city, userDetails.district, userDetails.state]
      .filter(Boolean)
      .join(', ') ||
    'Tamil Nadu';

  return (
    <div>
      <div className="rounded-2xl glass-panel p-5 sm:p-7 shadow-2xl border border-white/10 mb-6">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-text-main">
          {t.step2.title}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {t.step2.selectedLocation}{' '}
          <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
            {displayLocation}
          </strong>{' '}
          ({userDetails.landSize || 100} {messages.common.cents}). {t.step2.chooseCrop}
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-8">
        {/* Paddy Cultivation Card */}
        <div
          id="card-paddy"
          onClick={() => onSelectCrop('paddy')}
          className="rounded-2xl glass-card glass-card-hover p-6 sm:p-8 cursor-pointer relative flex flex-col justify-between border-emerald-500 shadow-[0_20px_45px_-10px_rgba(16,185,129,0.35),0_0_0_1px_rgba(52,211,153,0.4)] ring-1 ring-emerald-500/30"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                <SproutIcon size={28} />
              </div>
              <span className="rounded-full bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 px-3 py-1 text-xs font-bold border">
                {t.step2.paddy.badge}
              </span>
            </div>

            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t.step2.paddy.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              {t.step2.paddy.desc}
            </p>

            <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-200/90 dark:bg-slate-900/80 p-3.5 mb-6 text-xs border border-slate-300 dark:border-white/10 shadow-sm">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{t.step2.duration}</div>
                <div className="font-black text-sm text-slate-950 dark:text-slate-50 mt-1">{t.step2.paddy.durationVal}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{t.step2.tractorWork}</div>
                <div className="font-black text-sm text-slate-950 dark:text-slate-50 mt-1">{t.step2.paddy.workVal}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{t.step2.estTotal}</div>
                <div className="font-black text-sm text-emerald-800 dark:text-emerald-400 mt-1">{t.step2.paddy.costVal}</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            id="btn-select-paddy"
            onClick={(e) => {
              e.stopPropagation();
              onConfigureCrop('paddy');
            }}
            className="w-full rounded-xl py-3 text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 bg-emerald-500 text-slate-950 shadow-glow hover:bg-emerald-400"
          >
            <span>{t.step2.paddy.btnText}</span>
            <span>→</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToStep1}
          className="w-full sm:w-auto rounded-xl bg-slate-200/95 hover:bg-slate-300 dark:bg-slate-800/95 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 px-5 py-2.5 text-sm font-extrabold text-slate-950 dark:text-white transition-all cursor-pointer shadow-sm"
        >
          {t.step2.backBtn}
        </button>

        <button
          type="button"
          onClick={() => onConfigureCrop('paddy')}
          className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>{t.step2.paddy.btnText || 'Configure Paddy Cultivation Expenses'}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};
