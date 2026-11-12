'use client';

import React from 'react';
import { DropletsIcon, SproutIcon, TractorIcon } from '@/components/icons/Icons';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { formatCurrency as fmt, computeDailyLabourCost } from '@/lib/fertilizer/calc';
import { printDossierAsPdf } from '@/lib/fertilizer/printDossier';
import type {
  CultivationType,
  ExpenseEntry,
  ExpenseTask,
  PhaseGroup,
  SavedPlanRecord,
  UserDetails,
} from '@/lib/fertilizer/types';

interface Step4ExecutiveSummaryProps {
  userDetails: UserDetails;
  cultivation: CultivationType;
  totalCropDays: number;
  grandTotal: number;
  revenueTotal: number;
  netProfit: number;
  costPerCent: number;
  revenuePerCent: number;
  roiPercentage: number;
  currentPhases: PhaseGroup[];
  phaseTotals: Record<string, { total: number; daily: number }>;
  expenseMap: Record<string, ExpenseEntry>;
  getPhaseMeta: (phase: PhaseGroup) => { month: string; name: string; daySpan: string };
  getTaskMeta: (task: ExpenseTask) => { name: string; dayRange: string; description: string; costEstimateHint: string };
  savedPlans: SavedPlanRecord[];
  activePlanId: string | null;
  onLoadPlan: (planId: string) => void;
  onBackToPhase5?: () => void;
  onOpenSavedRecords?: () => void;
  onCreateNewRecord?: () => void;
}

export const Step4ExecutiveSummary: React.FC<Step4ExecutiveSummaryProps> = ({
  userDetails,
  cultivation,
  totalCropDays,
  grandTotal,
  revenueTotal,
  netProfit,
  costPerCent,
  revenuePerCent,
  roiPercentage,
  currentPhases,
  phaseTotals,
  expenseMap,
  getPhaseMeta,
  getTaskMeta,
  savedPlans,
  activePlanId,
  onLoadPlan,
  onBackToPhase5,
  onOpenSavedRecords,
  onCreateNewRecord,
}) => {
  const { messages } = useLanguage();
  const t = messages.fertilizer;
  const [activePhaseIdx, setActivePhaseIdx] = React.useState<number>(0);
  const [summaryView, setSummaryView] = React.useState<'all' | 'phase'>('all');

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Dossier Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel rounded-2xl p-4 sm:p-6 shadow-2xl">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 dark:border-emerald-500/30">
              {t.step4.badge}
            </span>
            {activePlanId && (
              <span className="rounded-full bg-cyan-500/15 dark:bg-cyan-500/20 px-2.5 py-0.5 text-[11px] font-bold text-cyan-800 dark:text-cyan-300 border border-cyan-500/40 dark:border-cyan-500/30">
                💾 Stored Plan Record
              </span>
            )}
          </div>
          <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold text-text-main mt-1">
            {t.step4.title}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl">
            {t.step4.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenSavedRecords && (
            <button
              type="button"
              onClick={onOpenSavedRecords}
              className="rounded-xl glass-surface px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <span>🗂️</span>
              <span>All Saved Records</span>
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              printDossierAsPdf({
                activePlanId,
                userDetails,
                cultivation,
                totalCropDays,
                grandTotal,
                revenueTotal,
                netProfit,
                costPerCent,
                revenuePerCent,
                roiPercentage,
                currentPhases,
                phaseTotals,
                expenseMap,
                getPhaseMeta,
                getTaskMeta,
              })
            }
            className="rounded-xl glass-surface px-3.5 py-2 text-xs font-bold text-text-main hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
          >
            🖨️ {messages.common.print}
          </button>
        </div>
      </div>

      {/* Saved Records Quick Switcher in Step 4 */}
      {savedPlans.length > 0 && (
        <div className="rounded-xl glass-surface p-3 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm">🗂️</span>
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Saved Plans ({savedPlans.length}):
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            {savedPlans.map((plan, idx) => {
              const isCurrent = activePlanId === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => onLoadPlan(plan.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
                    isCurrent
                      ? 'bg-emerald-500 text-white keep-white border-emerald-400 shadow-md font-black'
                      : 'glass-surface text-text-secondary hover:text-text-main hover:bg-white/10 border-white/10'
                  }`}
                >
                  <span>#{savedPlans.length - idx} {plan.userDetails.name || 'Plan'}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${isCurrent ? 'bg-black/25 text-white keep-white' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {plan.userDetails.landSize}c
                  </span>
                  <span className={`text-[11px] ${isCurrent ? 'text-white keep-white font-extrabold' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    ₹{fmt(plan.totals.netProfit)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dossier Meta + 3 High-Impact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Farmer Plot Card */}
        <div className="rounded-2xl glass-card glass-card-hover p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-text-muted mb-4">
              {t.step4.farmerDossier}
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">{t.step1.nameLabel}:</span>
                <span className="font-bold text-text-main">{userDetails.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">{t.step4.mobile}</span>
                <span className="font-bold text-text-main">+91 {userDetails.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">{t.step4.totalArea}</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                  {userDetails.landSize} {messages.common.cents}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">{t.step4.zone}</span>
                <span className="font-medium text-text-main">{userDetails.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">{t.step4.cropPackage}</span>
                <span className="font-bold capitalize text-text-main">
                  {cultivation} ({totalCropDays} {messages.common.days})
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] text-text-secondary">
            {userDetails.address}
          </div>
        </div>

        {/* KPI 1: Total Outlay */}
        <div className="rounded-2xl glass-card glass-card-hover border-amber-500/30 p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-4 -bottom-4 text-amber-500/5 pointer-events-none">
            <SproutIcon size={120} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
              {t.step4.kpi1Title}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              ₹{fmt(grandTotal)}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              {t.step4.kpi1Desc}
            </p>
          </div>
          <div className="mt-4 rounded-xl glass-surface px-3 py-2 text-xs flex justify-between border border-white/5">
            <span className="text-text-muted">{t.step4.costRateLabel}</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">
              ₹{fmt(costPerCent)} / {messages.common.cents}
            </span>
          </div>
        </div>

        {/* KPI 2: Gross Revenue */}
        <div className="rounded-2xl glass-card glass-card-hover border-cyan-500/30 p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-4 -bottom-4 text-cyan-500/5 pointer-events-none">
            <TractorIcon size={120} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
              {t.step4.kpi2Title}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400">
              ₹{fmt(revenueTotal)}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              {t.step4.kpi2Desc}
            </p>
          </div>
          <div className="mt-4 rounded-xl glass-surface px-3 py-2 text-xs flex justify-between border border-white/5">
            <span className="text-text-muted">{t.step4.revenueRateLabel}</span>
            <span className="font-bold text-cyan-700 dark:text-cyan-400">
              ₹{fmt(revenuePerCent)} / {messages.common.cents}
            </span>
          </div>
        </div>

        {/* KPI 3: Net Profit */}
        <div className="rounded-2xl glass-card glass-card-hover border-emerald-500/40 p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-4 -bottom-4 text-emerald-500/10 pointer-events-none">
            <DropletsIcon size={120} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
              {t.step4.kpi3Title}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              ₹{fmt(netProfit)}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              {t.step4.kpi3Desc}
            </p>
          </div>
          <div className="mt-4 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-xs flex justify-between">
            <span className="font-semibold text-text-main">{t.step4.roiLabel}</span>
            <span className="font-extrabold text-emerald-800 dark:text-emerald-300">
              {roiPercentage > 0 ? `+${roiPercentage}%` : `${roiPercentage}%`} ROI
            </span>
          </div>
        </div>
      </div>

      {/* Phase-wise Distribution Bar */}
      <div className="rounded-2xl glass-panel p-5 sm:p-6 shadow-2xl">
        <h3 className="font-display text-sm sm:text-base font-bold text-text-main mb-4 flex items-center justify-between">
          <span>{t.step4.distributionTitle}</span>
          <div className="flex items-center gap-2">
            {/* All / Phase Switch */}
            <div className="flex rounded-xl glass-surface p-1 shadow-inner border border-white/10">
              <button
                type="button"
                onClick={() => setSummaryView('all')}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  summaryView === 'all' ? 'bg-emerald-500 text-white keep-white shadow-sm' : 'text-text-secondary hover:text-text-main'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSummaryView('phase')}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  summaryView === 'phase' ? 'bg-emerald-500 text-white keep-white shadow-sm' : 'text-text-secondary hover:text-text-main'
                }`}
              >
                Phases
              </button>
            </div>
            <span className="text-xs font-normal text-text-muted">
              {currentPhases.length} {messages.common.phases}
            </span>
          </div>
        </h3>
        <div className="h-3.5 rounded-full overflow-hidden flex bg-black/40 mb-4 p-0.5 border border-white/5">
          {currentPhases.map((phase) => {
            const pTot = phaseTotals[phase.id]?.total || 0;
            const pct = grandTotal > 0 ? (pTot / grandTotal) * 100 : 0;
            if (pct <= 0) return null;
            return (
              <div
                key={phase.id}
                className="h-full rounded-sm transition-all first:rounded-l-full last:rounded-r-full"
                style={{ width: `${pct}%`, backgroundColor: phase.color }}
                title={`${phase.name}: ₹${fmt(pTot)} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {currentPhases.map((phase, idx) => {
            const pMeta = getPhaseMeta(phase);
            const pTot = phaseTotals[phase.id]?.total || 0;
            const pct = grandTotal > 0 ? ((pTot / grandTotal) * 100).toFixed(1) : '0';
            const isSelected = summaryView === 'phase' && activePhaseIdx === idx;
            return (
              <button
                type="button"
                key={phase.id}
                onClick={() => { setActivePhaseIdx(idx); setSummaryView('phase'); }}
                className={`rounded-xl border p-3 text-xs flex flex-col justify-between text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'glass-panel ring-2 ring-emerald-500/50 bg-emerald-950/40 border-emerald-500 shadow-lg scale-[1.02]'
                    : 'glass-surface border-white/5 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <div>
                  <div className="font-extrabold text-[11px] mb-0.5" style={{ color: phase.color }}>
                    {pMeta.month}
                  </div>
                  <div className="truncate text-text-muted text-[11px] mb-1">{pMeta.name}</div>
                </div>
                <div className="flex items-end justify-between gap-1">
                  <div className="font-black text-text-main text-sm">₹{fmt(pTot)}</div>
                  <div className="text-[10px] text-text-muted font-semibold">{pct}%</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Individual Phase Audit Breakdown — only in Phase mode */}
      {summaryView === 'phase' && (() => {
        const selectedPhase = currentPhases[activePhaseIdx] || currentPhases[0];
        const selectedPhaseMeta = getPhaseMeta(selectedPhase);
        return (
          <div className="rounded-2xl glass-table-panel p-5 sm:p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full glass-surface border border-white/10"
                    style={{ color: selectedPhase.color }}
                  >
                    {selectedPhaseMeta.month}
                  </span>
                  <span className="text-xs text-text-muted font-bold">
                    Phase {activePhaseIdx + 1} of {currentPhases.length}
                  </span>
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-text-main">
                  {selectedPhaseMeta.name}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {selectedPhaseMeta.daySpan} • Comprehensive audit trail of input costs, equipment, and yield projections
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  disabled={activePhaseIdx === 0}
                  onClick={() => setActivePhaseIdx((prev) => Math.max(0, prev - 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold glass-surface border border-white/10 text-text-secondary hover:text-text-main hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  ← Prev Phase
                </button>
                <button
                  type="button"
                  disabled={activePhaseIdx === currentPhases.length - 1}
                  onClick={() => setActivePhaseIdx((prev) => Math.min(currentPhases.length - 1, prev + 1))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold glass-surface border border-white/10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Next Phase →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {selectedPhase.tasks.map((task) => {
                const tMeta = getTaskMeta(task);
                const entry = expenseMap[task.id] || {
                  ratePerCent: 0,
                  days: task.defaultDays,
                  totalCost: 0,
                  costPerDay: 0,
                };
                const isSkipped = task.isOptional && entry.isEnabled === false;
                return (
                  <div
                    key={task.id}
                    className={`rounded-xl glass-surface border border-white/5 p-3.5 flex flex-col justify-between transition-all hover:border-white/15 ${
                      isSkipped ? 'opacity-50' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`font-bold text-xs line-clamp-1 ${isSkipped ? 'line-through text-text-muted' : 'text-text-main'}`}>
                          {tMeta.name}
                        </span>
                        <span className="text-[10px] text-text-muted font-medium rounded px-1.5 py-0.2 bg-black/20 border border-white/5 whitespace-nowrap">
                          {tMeta.dayRange}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">{tMeta.description}</p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[11px] text-text-secondary pr-2">
                        {isSkipped ? (
                          <span className="text-amber-400 font-semibold">{t.step3.skipped || 'Skipped (₹0)'}</span>
                        ) : task.isFertilizerWithLabour ? (
                          <span className="flex flex-col text-[10px] text-text-secondary leading-tight">
                            <span>🌱 {task.id === 'p3_fert_dose3' ? 'Bags' : 'Qty'}: {entry.fertQty ?? 0} × ₹{fmt(entry.fertPrice ?? 0)}</span>
                            <span>
                              👷 Labour: {entry.labourCount ?? 0} × ₹{fmt(entry.labourWage ?? 0)}
                              {(entry.snackCost ?? 0) > 0 ? ` + ₹${fmt(entry.snackCost ?? 0)} snacks` : ''}
                              {(entry.travelCost ?? 0) > 0 ? ` + ₹${fmt(entry.travelCost ?? 0)} travel` : ''}
                            </span>
                          </span>
                        ) : task.isMultiDayLabour && !entry.isMachineMode ? (
                          <span className="flex flex-col text-[10px] text-text-secondary leading-tight gap-0.5">
                            {(entry.dayEntries || [])
                              .filter((d) => d.labourCount > 0 || d.labourWage > 0 || d.snackCost > 0 || d.travelCost > 0)
                              .map((d) => (
                                <span key={d.day}>
                                  Day {d.day}: {d.labourCount} workers × ₹{fmt(d.labourWage)}
                                  {d.snackCost > 0 ? ` + ₹${fmt(d.snackCost)} snacks` : ''}
                                  {d.travelCost > 0 ? ` + ₹${fmt(d.travelCost)} travel` : ''} (₹{fmt(computeDailyLabourCost(d))})
                                </span>
                              ))}
                          </span>
                        ) : task.isLabour ? (
                          entry.isMachineMode ? (
                            `🚜 Machine: ₹${fmt(entry.ratePerCent)}`
                          ) : (
                            `${entry.labourCount ?? 0} workers × ₹${fmt(entry.labourWage ?? 0)}${
                              task.hasSnacks && (entry.snackCost ?? 0) > 0 ? ` + ₹${fmt(entry.snackCost ?? 0)} snacks` : ''
                            }${task.hasTravel && (entry.travelCost ?? 0) > 0 ? ` + ₹${fmt(entry.travelCost ?? 0)} travel` : ''}`
                          )
                        ) : task.isGunnyBags ? (
                          `${entry.bagCount ?? 0} ${entry.isPlasticBag !== false ? 'plastic' : 'traditional'} bags × ₹${fmt(entry.bagPrice ?? 0)}`
                        ) : task.isTransportLoading ? (
                          `Rent ₹${fmt(entry.transportRent ?? 0)} + Load (${entry.loadingWorkers ?? 0} × ₹${fmt(entry.loadingWage ?? 0)}) + ₹${fmt(entry.loadingSnacks ?? 0)} snacks`
                        ) : task.isGrainYield ? (
                          entry.yieldMode !== 'bags'
                            ? `${entry.yieldTons ?? 0} T → ${entry.grainBagCount ?? 0} bags (${entry.bagWeightKg ?? 0} kg/bag) × ₹${fmt(entry.grainBagPrice ?? 0)}`
                            : `${entry.grainBagCount ?? 0} bags × ₹${fmt(entry.grainBagPrice ?? 0)}`
                        ) : task.isStrawYield ? (
                          `${entry.strawSackCount ?? 0} sacks × ₹${fmt(entry.strawPrice ?? 0)}`
                        ) : task.isMandiTrip ? (
                          `${entry.mandiCount ?? 0} trips × ₹${fmt(entry.mandiRate ?? 0)}`
                        ) : task.id === 'p1_nursery' ? (
                          `Seed: ₹${fmt(entry.ratePerCent)}${entry.hasTravelCost !== false && (entry.travelCost ?? 0) > 0 ? ` + ₹${fmt(entry.travelCost ?? 0)} travel` : ''}`
                        ) : (
                          `Cost: ₹${fmt(entry.ratePerCent)}`
                        )}
                      </span>
                      <span
                        className={`text-sm font-black whitespace-nowrap ${
                          isSkipped
                            ? 'text-text-muted'
                            : selectedPhase.isProfitPhase
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        ₹{fmt(isSkipped ? 0 : entry.totalCost)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* All Phases Overview — only in All mode */}
      {summaryView === 'all' && (
        <div className="space-y-4">
          {currentPhases.map((phase) => {
            const pMeta = getPhaseMeta(phase);
            const pTot = phaseTotals[phase.id]?.total || 0;
            return (
              <div key={phase.id} className="rounded-2xl glass-table-panel overflow-hidden shadow-xl">
                <div
                  className="flex items-center justify-between px-5 py-3 border-b border-border-subtle"
                  style={{ backgroundColor: phase.bgSoft }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-xs uppercase tracking-wider" style={{ color: phase.color }}>{pMeta.month}</span>
                    <span className="font-bold text-sm text-text-main">{pMeta.name}</span>
                    <span className="text-[11px] text-text-muted">{pMeta.daySpan}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">{phase.tasks.length} tasks</span>
                    <span className="font-extrabold text-base" style={{ color: phase.color }}>₹{fmt(pTot)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 p-4">
                  {phase.tasks.map((task) => {
                    const tMeta = getTaskMeta(task);
                    const entry = expenseMap[task.id] || {
                      ratePerCent: 0,
                      days: task.defaultDays,
                      totalCost: 0,
                      costPerDay: 0,
                    };
                    const isSkipped = task.isOptional && entry.isEnabled === false;
                    return (
                      <div
                        key={task.id}
                        className={`rounded-xl glass-surface border border-white/5 p-3 flex items-center justify-between gap-2 ${
                          isSkipped ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <div className={`text-xs font-bold line-clamp-1 ${isSkipped ? 'line-through text-text-muted' : 'text-text-main'}`}>
                            {tMeta.name}
                          </div>
                          <div className="text-[10px] text-text-muted truncate mt-0.5">{tMeta.dayRange}</div>
                        </div>
                        <div
                          className={`text-sm font-black whitespace-nowrap shrink-0 ${
                            isSkipped ? 'text-text-muted' : phase.isProfitPhase ? 'text-emerald-700 dark:text-emerald-400' : 'text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          ₹{fmt(isSkipped ? 0 : entry.totalCost)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
