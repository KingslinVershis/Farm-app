'use client';

import React from 'react';
import type { SavedPlanRecord } from '@/lib/fertilizer/types';
import { formatCurrency as fmt } from '@/lib/fertilizer/calc';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { SavedPlanCard } from './SavedPlanCard';

interface SavedRecordsViewProps {
  savedPlans: SavedPlanRecord[];
  activePlanId: string | null;
  onSelectPlan: (planId: string) => void;
  onEditPlan: (planId: string, e: React.MouseEvent) => void;
  onDeletePlan: (planId: string, e: React.MouseEvent) => void;
  onCreateNewRecord: () => void;
}

export const SavedRecordsView: React.FC<SavedRecordsViewProps> = ({
  savedPlans,
  activePlanId,
  onSelectPlan,
  onEditPlan,
  onDeletePlan,
  onCreateNewRecord,
}) => {
  const { messages } = useLanguage();
  const t = messages.fertilizer;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Top Banner with Portfolio Metrics & Create Action */}
      <div className="rounded-2xl glass-panel p-5 sm:p-7 shadow-2xl border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-lg">
                🗂️
              </span>
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-black text-text-main tracking-tight">
                {t.step3.savedPlansTitle || 'Saved Cultivation Records'}
              </h2>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-400 border border-emerald-500/30">
                {savedPlans.length} {savedPlans.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
              {t.step3.savedPlansSubtitle || 'Review previously generated farm budgets, input schedules, and commercial realization records. Click any card to inspect full executive audit or create a new cultivation scenario.'}
            </p>
          </div>

          {/* Primary Create New Record Button */}
          <div className="shrink-0">
            <button
              type="button"
              id="btn-create-new-record-main"
              onClick={onCreateNewRecord}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 px-6 py-3 text-sm font-black text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-base font-black">➕</span>
              <span>{t.step3.createNewRecordBtn || '+ Create New Record'}</span>
            </button>
          </div>
        </div>

        {/* Informational Row inside Saved Cultivation Records banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-border-subtle">
          <span className="text-xs font-semibold text-text-muted">
            Select any card to view its executive audit dossier:
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
            Showing {savedPlans.length} {savedPlans.length === 1 ? 'Plan' : 'Plans'}
          </span>
        </div>
      </div>

      {/* Main Records Container */}
      {savedPlans.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl glass-panel p-8 sm:p-14 text-center border border-dashed border-emerald-500/30 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-3xl mb-4">
            🌾
          </div>
          <h3 className="font-display text-xl font-black text-text-main">
            No Cultivation Records Found
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
            Create your first precision cultivation plan to calculate operational costs, scheduled pesticide/fertilizer nutrition, and grain yield profits.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={onCreateNewRecord}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-slate-950 shadow-glow hover:bg-emerald-400 active:scale-95 transition-all cursor-pointer"
            >
              <span>➕</span>
              <span>Create Your First Cultivation Record</span>
            </button>
          </div>
        </div>
      ) : (
        /* Cards Grid */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedPlans.map((plan, idx) => (
              <SavedPlanCard
                key={plan.id}
                plan={plan}
                index={idx}
                totalCount={savedPlans.length}
                isSelected={activePlanId === plan.id}
                onSelect={onSelectPlan}
                onEdit={onEditPlan}
                onDelete={onDeletePlan}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
