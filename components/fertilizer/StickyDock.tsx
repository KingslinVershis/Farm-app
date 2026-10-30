'use client';

import React from 'react';
import { formatCurrency as fmt } from '@/lib/fertilizer/calc';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface StickyDockProps {
  grandTotal: number;
  revenueTotal: number;
  netProfit: number;
  netProfitPerCent: number;
  activePhaseIndex: number;
  totalPhases: number;
  viewMode: 'individual' | 'all';
  savedPlansCount: number;
  onBack: () => void;
  onNextPhase: () => void;
  onSavePlan?: () => void;
  onViewSummary: () => void;
}

export const StickyDock: React.FC<StickyDockProps> = ({
  grandTotal,
  revenueTotal,
  netProfit,
  netProfitPerCent,
  activePhaseIndex,
  totalPhases,
  viewMode,
  savedPlansCount,
  onBack,
  onNextPhase,
  onSavePlan,
  onViewSummary,
}) => {
  const { messages } = useLanguage();
  const t = messages.fertilizer;
  const isPhase5 = viewMode === 'all' || activePhaseIndex === totalPhases - 1;

  return (
    <div className="glass-dock fixed bottom-0 left-0 right-0 z-30 px-3 sm:px-8 py-2.5 sm:py-3.5 shadow-2xl">
      <div className="mx-auto flex max-w-[1720px] w-full items-center justify-center">
        {/* Responsive Centered Metrics Strip */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-6 md:gap-8 w-full max-w-4xl text-center">
          <div className="glass-surface sm:bg-transparent rounded-lg px-2.5 py-1.5 sm:p-0 text-center">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-text-muted font-bold">
              {t.step3.stickyDock.cultivationOutlay}
            </div>
            <div className="text-xs sm:text-base font-extrabold text-amber-400">
              ₹{fmt(grandTotal)}
            </div>
          </div>

          <div className="h-7 w-px bg-border-light hidden sm:block" />

          <div className="glass-surface sm:bg-transparent rounded-lg px-2.5 py-1.5 sm:p-0 text-center">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-text-muted font-bold">
              {t.step3.stickyDock.grossRevenue}
            </div>
            <div className="text-xs sm:text-base font-extrabold text-cyan-400">
              ₹{fmt(revenueTotal)}
            </div>
          </div>

          <div className="h-7 w-px bg-border-light hidden sm:block" />

          <div className="glass-surface sm:bg-transparent rounded-lg px-2.5 py-1.5 sm:p-0 border border-emerald-500/25 sm:border-0 text-center">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-emerald-400 font-bold truncate">
              {t.step3.stickyDock.netFarmProfit}
            </div>
            <div className="text-xs sm:text-lg font-black text-emerald-400">
              ₹{fmt(netProfit)}
            </div>
          </div>

          <div className="h-7 w-px bg-border-light hidden md:block" />

          <div className="glass-surface sm:bg-transparent rounded-lg px-2.5 py-1.5 sm:p-0 text-center hidden sm:block">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-text-muted font-bold">
              {t.step3.stickyDock.profitPerCent}
            </div>
            <div className="text-xs sm:text-sm font-bold text-emerald-300">
              ₹{fmt(netProfitPerCent)} / {messages.common.cents}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
