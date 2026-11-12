'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { RefreshCwIcon } from '@/components/icons/Icons';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { formatCurrency as fmt } from '@/lib/fertilizer/calc';
import { isTaskEntryFilled } from '@/lib/fertilizer/useFertilizerPlanner';
import { BorderBeam, OCEAN_GRADIENT } from '@/components/reactbits/BorderBeam';
import type {
  CultivationType,
  ExpenseEntry,
  ExpenseTask,
  PhaseGroup,
  SavedPlanRecord,
  UserDetails,
} from '@/lib/fertilizer/types';
import { TaskRowRenderer } from './TaskRowRenderer';

interface Step3PhaseExpensesProps {
  cultivation: CultivationType;
  currentPhases: PhaseGroup[];
  activePhaseIndex: number;
  setActivePhaseIndex: (idx: number | ((prev: number) => number)) => void;
  viewMode: 'individual' | 'all';
  setViewMode: (mode: 'individual' | 'all') => void;
  userDetails: UserDetails;
  expenseMap: Record<string, ExpenseEntry>;
  phaseTotals: Record<string, { total: number; daily: number }>;
  getPhaseMeta: (phase: PhaseGroup) => { month: string; name: string; daySpan: string };
  getTaskMeta: (task: ExpenseTask) => { name: string; dayRange: string; description: string; costEstimateHint: string };
  activePhase: PhaseGroup;
  activePhaseMeta: { month: string; name: string; daySpan: string };
  handleRateChange: (taskId: string, rate: number, travelCost?: number, hasTravelCost?: boolean) => void;
  handleLabourChange: (taskId: string, count: number, wage: number, snacks?: number, travel?: number) => void;
  handleMultiDayChangeActiveDay?: (taskId: string, nextDay: number, maxDays?: number) => void;
  handleMultiDayLabourChange?: (
    taskId: string,
    day: number,
    count: number,
    wage: number,
    snacks?: number,
    travel?: number,
    maxDays?: number
  ) => void;
  handleFertilizerWithLabourChange: (
    taskId: string,
    fertQty: number,
    fertPrice: number,
    labourCount: number,
    labourWage: number,
    snackCost?: number,
    travelCost?: number
  ) => void;
  handleMandiChange: (taskId: string, count: number, rate: number) => void;
  handleToggleOptional: (taskId: string) => void;
  handleToggleMachineMode: (taskId: string, defaultRate?: number) => void;
  handleToggleBagType: (taskId: string, plasticPrice?: number, traditionalPrice?: number) => void;
  handleGunnyBagsChange: (taskId: string, count: number, price: number) => void;
  handleTransportLoadingChange: (taskId: string, transportRent: number, workers: number, wage: number, snacks: number) => void;
  handleToggleYieldMode: (taskId: string) => void;
  handleGrainYieldChange: (taskId: string, params: { mode?: 'tons' | 'bags'; yieldKg?: number; yieldTons?: number; bagWeightKg?: number; bagCount?: number; bagPrice: number }) => void;
  handleStrawYieldChange: (taskId: string, sackCount: number, price: number) => void;
  handleToggleNotify?: (taskId: string, notifyType: 'Herbicide_notify' | 'pesticide_notify' | 'fertilizer_notify', checked: boolean) => void;
  resetToRecommendedDefaults: () => void;
  savedPlans: SavedPlanRecord[];
  activePlanId: string | null;
  saveCurrentPlan: (isDraft?: boolean, isCompleted?: boolean) => void;
  savePhaseProgress?: () => Promise<string | null | undefined>;
  loadPlanAndShowSummary: (planId: string) => void;
  deletePlan: (planId: string, e?: React.MouseEvent) => void;
  createNewPlan: () => void;
  highestUnlockedPhaseIndex?: number;
  phaseCompletionMap?: boolean[];
  allPhasesComplete?: boolean;
}

export const Step3PhaseExpenses: React.FC<Step3PhaseExpensesProps> = ({
  cultivation,
  currentPhases,
  activePhaseIndex,
  setActivePhaseIndex,
  viewMode,
  setViewMode,
  userDetails,
  expenseMap,
  phaseTotals,
  getPhaseMeta,
  getTaskMeta,
  activePhase,
  activePhaseMeta,
  handleRateChange,
  handleLabourChange,
  handleMultiDayChangeActiveDay,
  handleMultiDayLabourChange,
  handleFertilizerWithLabourChange,
  handleMandiChange,
  handleToggleOptional,
  handleToggleMachineMode,
  handleToggleBagType,
  handleGunnyBagsChange,
  handleTransportLoadingChange,
  handleToggleYieldMode,
  handleGrainYieldChange,
  handleStrawYieldChange,
  handleToggleNotify,
  resetToRecommendedDefaults,
  savedPlans,
  activePlanId,
  saveCurrentPlan,
  savePhaseProgress,
  loadPlanAndShowSummary,
  deletePlan,
  createNewPlan,
  highestUnlockedPhaseIndex = currentPhases.length - 1,
  phaseCompletionMap,
  allPhasesComplete = true,
}) => {
  const { messages, locale } = useLanguage();
  const isTamil = locale === 'ta';
  const router = useRouter();
  const t = messages.fertilizer;
  const isPhase5 = activePhaseIndex === currentPhases.length - 1;
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [savingNextPhase, setSavingNextPhase] = useState(false);

  const isPhaseDone = (idx: number) =>
    phaseCompletionMap ? Boolean(phaseCompletionMap[idx]) : true;

  const showIncompletePhaseWarning = (phaseIdx: number) => {
    const targetPhase = currentPhases[phaseIdx];
    if (!targetPhase) return;
    const pMeta = getPhaseMeta(targetPhase);
    const missingTask = targetPhase.tasks.find(
      (task) => !isTaskEntryFilled(task, expenseMap[task.id])
    );
    const missingLabel = missingTask ? getTaskMeta(missingTask).name : '';
    message.warning(
      isTamil
        ? `${pMeta.month} விவரங்களை முழுமையாக நிரப்பவும்${missingLabel ? `: ${missingLabel}` : ''}`
        : `Please fill values for all required tasks in ${pMeta.month} first${missingLabel ? ` (${missingLabel})` : ''}.`
    );
  };

  const handleOpenCompleteConfirm = () => {
    if (!allPhasesComplete) {
      const firstIncompleteIdx = currentPhases.findIndex((_, idx) => !isPhaseDone(idx));
      if (firstIncompleteIdx >= 0) {
        if (viewMode === 'individual' && firstIncompleteIdx <= highestUnlockedPhaseIndex) {
          setActivePhaseIndex(firstIncompleteIdx);
        }
        showIncompletePhaseWarning(firstIncompleteIdx);
        return;
      }
    }
    setShowCompleteConfirm(true);
  };

  return (
    <div className="animate-fade-in pb-36 sm:pb-48">
      {/* Sticky Header & 5-Phases Navigator — pinned while scrolling */}
      <div className="sticky top-[70px] z-20 mb-6 glass-panel border border-white/10 px-3.5 py-3.5 rounded-2xl shadow-2xl transition-all">
        {/* Header & View Switcher */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 px-2.5 py-1 text-xs font-bold shadow-xs">
                PADDY: {currentPhases.reduce((acc, p) => acc + p.tasks.length, 0)} TASKS
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                {t.step3.cultivationArea} <strong className="text-slate-900 dark:text-slate-100 font-extrabold">{userDetails.landSize} {messages.common.cents}</strong>
              </span>
              <span className="text-slate-400 dark:text-text-muted">•</span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {t.step3.activeFocus} {activePhaseMeta.month} ({activePhaseIndex + 1}/{currentPhases.length})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex rounded-xl glass-surface p-1 shadow-inner border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('individual')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${viewMode === 'individual' ? 'bg-emerald-500 text-white keep-white shadow-sm' : 'text-text-secondary hover:text-text-main'
                  }`}
              >
                {t.step3.focusMode}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${viewMode === 'all' ? 'bg-emerald-500 text-white keep-white shadow-sm' : 'text-text-secondary hover:text-text-main'
                  }`}
              >
                {t.step3.viewAll}
              </button>
            </div>

            <button
              type="button"
              onClick={resetToRecommendedDefaults}
              className="flex items-center gap-1.5 rounded-xl glass-surface px-3 py-1.5 text-xs font-bold text-text-secondary hover:text-text-main border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer"
            >
              <RefreshCwIcon size={14} />
              <span className="hidden sm:inline">{t.step3.resetDefaults}</span>
            </button>
          </div>
        </div>

        {/* 5 PHASES INTERACTIVE TIMELINE NAVIGATOR (Only in Focus Mode) */}
        {viewMode === 'individual' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 animate-fade-in">
            {currentPhases.map((phase, idx) => {
              const isActive = activePhaseIndex === idx;
              const isLocked = idx > highestUnlockedPhaseIndex;
              const isCompletedPhase = isPhaseDone(idx);
              const pMeta = getPhaseMeta(phase);
              const pTot = phaseTotals[phase.id] || { total: 0, daily: 0 };
              const isLastOnMobile = idx === 4;

              return (
                <button
                  key={phase.id}
                  id={`phase-tab-${idx}`}
                  type="button"
                  aria-disabled={isLocked}
                  onClick={() => {
                    if (isLocked) {
                      showIncompletePhaseWarning(Math.max(0, highestUnlockedPhaseIndex));
                      return;
                    }
                    setActivePhaseIndex(idx);
                  }}
                  className={`relative flex flex-col justify-between text-left p-2.5 sm:p-3.5 rounded-xl glass-card transition-all duration-200 overflow-hidden ${isLastOnMobile ? 'col-span-2 sm:col-span-1' : ''
                    } ${isLocked
                      ? 'opacity-55 cursor-not-allowed border border-border-subtle'
                      : isActive
                        ? 'glass-card-hover cursor-pointer border border-transparent bg-white/[0.04] shadow-xl'
                        : 'glass-card-hover cursor-pointer border border-border-subtle hover:border-border-light'
                    }`}
                  style={{
                    boxShadow: isActive ? `0 12px 28px -6px ${phase.borderSoft}` : undefined,
                  }}
                >
                  {isActive && (
                    <BorderBeam
                      color={OCEAN_GRADIENT}
                      baseBorderColor={`${phase.color}40`}
                      duration={4.5}
                      borderWidth={1.5}
                      rx={12}
                      beamLength={12}
                    />
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: phase.color }}>
                        {pMeta.month}
                      </span>
                      <span className="text-[10px] rounded px-1.5 py-0.5 glass-surface text-text-muted font-medium border border-white/5">
                        {isLocked ? '🔒' : isCompletedPhase ? '✓' : `${phase.tasks.length} items`}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-text-main line-clamp-1 leading-snug">
                      {pMeta.name}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-1.5 border-t border-border-subtle flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold text-[10px] sm:text-[11px]">{pMeta.daySpan}</span>
                    <span className="font-extrabold" style={{ color: phase.color }}>
                      ₹{fmt(pTot.total)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* VIEW MODE 1: INDIVIDUAL FOCUS PHASE TABLE */}
      {viewMode === 'individual' && (
        <>
          <div className="rounded-2xl glass-table-panel border border-border-light overflow-hidden shadow-2xl mb-8">
            {/* Phase Banner */}
            <div
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-4 border-b border-border-subtle gap-2"
              style={{ backgroundColor: activePhase.bgSoft }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: activePhase.color }}>
                    {activePhaseMeta.month} OF {currentPhases.length}
                  </span>
                  <span className="rounded bg-black/20 px-2 py-0.5 text-xs text-text-secondary">
                    {activePhaseMeta.daySpan}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-text-main">
                  {activePhaseMeta.name}
                </h3>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-700 dark:text-slate-300 font-bold uppercase">
                  {activePhase.isProfitPhase ? t.step3.tableHeaders.grossRevenue : t.step3.tableHeaders.totalCost}
                </div>
                <div className="text-xl font-extrabold" style={{ color: activePhase.color }}>
                  ₹{fmt(phaseTotals[activePhase.id]?.total || 0)}
                </div>
              </div>
            </div>

            {/* Warning Advisory Message for Phase 4 */}
            {activePhase.id === 'paddy_p4' && (
              <div className="mx-6 mt-4 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 flex items-start gap-3 shadow-sm">
                <div className="text-amber-500 dark:text-amber-400 mt-0.5 text-lg">⚠️</div>
                <div>
                  <h4 className="text-sm font-extrabold text-amber-900 dark:text-amber-300">
                    {t.step3.preHarvestAlert?.title || 'Pre-Harvest Operational Advisory — Terminal Field Drainage & Sun Drying'}
                  </h4>
                  <p className="text-xs text-amber-950/90 dark:text-amber-200/90 mt-1 leading-relaxed font-medium">
                    {t.step3.preHarvestAlert?.desc || 'Withdraw standing field water completely 10–14 days prior to harvest to allow soil compaction for harvester machines. Dry harvested grains on threshing floor down to ≤14% safe moisture before storage or mandi dispatch.'}
                  </p>
                </div>
              </div>
            )}

            {/* Operations Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-300/80 dark:border-white/10 bg-slate-100/95 dark:bg-[#121c2d]/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-[#94a3b8]">
                    <th className="py-3 px-6 w-4/12">
                      {activePhase.isProfitPhase ? t.step3.tableHeaders.profitStreams : t.step3.tableHeaders.operation}
                    </th>
                    <th className="py-3 px-4 w-2/12">
                      {activePhase.isProfitPhase ? t.step3.tableHeaders.profitBenchmark : t.step3.tableHeaders.benchmark}
                    </th>
                    <th className="py-3 px-4 w-4/12">
                      {activePhase.isProfitPhase ? t.step3.tableHeaders.profitRealization : t.step3.tableHeaders.rate}
                    </th>
                    <th className="py-3 px-6 w-2/12">
                      {activePhase.isProfitPhase ? t.step3.tableHeaders.grossRevenue : t.step3.tableHeaders.totalCost}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activePhase.tasks.map((task, idx) => {
                    const tMeta = getTaskMeta(task);
                    const entry = expenseMap[task.id] || {
                      ratePerCent: 0,
                      days: task.defaultDays,
                      totalCost: 0,
                      costPerDay: 0,
                      isEnabled: true,
                    };

                    return (
                      <TaskRowRenderer
                        key={task.id}
                        task={task}
                        phase={activePhase}
                        index={idx}
                        userDetails={userDetails}
                        entry={entry}
                        meta={tMeta}
                        handleRateChange={handleRateChange}
                        handleLabourChange={handleLabourChange}
                        handleMultiDayChangeActiveDay={handleMultiDayChangeActiveDay}
                        handleMultiDayLabourChange={handleMultiDayLabourChange}
                        handleFertilizerWithLabourChange={handleFertilizerWithLabourChange}
                        handleMandiChange={handleMandiChange}
                        handleToggleOptional={handleToggleOptional}
                        handleToggleMachineMode={handleToggleMachineMode}
                        handleToggleBagType={handleToggleBagType}
                        handleGunnyBagsChange={handleGunnyBagsChange}
                        handleTransportLoadingChange={handleTransportLoadingChange}
                        handleToggleYieldMode={handleToggleYieldMode}
                        handleGrainYieldChange={handleGrainYieldChange}
                        handleStrawYieldChange={handleStrawYieldChange}
                        handleToggleNotify={handleToggleNotify}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Stepper Footer with Save and Draft buttons on every phase */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-black/30 px-6 py-4">
              <button
                type="button"
                id="btn-prev-phase"
                disabled={activePhaseIndex === 0}
                onClick={() => setActivePhaseIndex((prev) => Math.max(0, prev - 1))}
                className="rounded-lg border border-border-light px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-main disabled:opacity-40 transition-colors cursor-pointer"
              >
                {t.step3.navStepper.previousPhase}
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Save Draft Button for Every Phase */}
                <button
                  type="button"
                  id="btn-save-draft"
                  onClick={() => {
                    saveCurrentPlan(true);
                    router.push('/fertilizer');
                  }}
                  className="rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <span>📝</span>
                  <span>{t.step3.saveDraftBtn || 'Save as Draft'}</span>
                </button>

                {/* Complete Plan Button - Show only at phase 5 */}
                {isPhase5 && (
                  <button
                    type="button"
                    id="btn-save-plan"
                    onClick={handleOpenCompleteConfirm}
                    className={`rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2 text-xs font-black text-white keep-white shadow-glow transition-all flex items-center gap-1.5 ${
                      !allPhasesComplete ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-110 active:scale-95 cursor-pointer'
                    }`}
                  >
                    <span>✓</span>
                    <span>{t.step3.completeBtn || 'Complete'}</span>
                  </button>
                )}

                {/* Next Phase Button (Phases 1-4) */}
                {!isPhase5 && (
                  <button
                    type="button"
                    id="btn-next-phase"
                    disabled={savingNextPhase}
                    onClick={async () => {
                      if (!isPhaseDone(activePhaseIndex)) {
                        showIncompletePhaseWarning(activePhaseIndex);
                        return;
                      }
                      if (savePhaseProgress) {
                        setSavingNextPhase(true);
                        try {
                          await savePhaseProgress();
                        } finally {
                          setSavingNextPhase(false);
                        }
                      }
                      setActivePhaseIndex((prev) => Math.min(currentPhases.length - 1, prev + 1));
                    }}
                    className={`rounded-lg px-5 py-2 text-xs font-bold transition-colors flex items-center gap-1 ${
                      isPhaseDone(activePhaseIndex)
                        ? 'bg-emerald-500 text-white keep-white hover:bg-emerald-400 cursor-pointer'
                        : 'bg-surface text-text-muted opacity-65 cursor-not-allowed'
                    } disabled:opacity-70`}
                  >
                    <span>
                      {savingNextPhase
                        ? isTamil
                          ? 'சேமிக்கப்படுகிறது...'
                          : 'Saving...'
                        : t.step3.navStepper.nextPhase}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* VIEW MODE 2: ALL PHASES EXPENSES TABLE */}
      {viewMode === 'all' && (
        <div className="space-y-6 mb-8">
          {currentPhases.map((phase, phaseIdx) => {
            const pMeta = getPhaseMeta(phase);
            const isPhaseLocked = phaseIdx > highestUnlockedPhaseIndex;
            return (
              <div key={phase.id} className="rounded-2xl glass-table-panel border border-border-light overflow-hidden shadow-2xl">
                <div
                  className="flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 border-b border-border-subtle"
                  style={{ backgroundColor: phase.bgSoft }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-xs" style={{ color: phase.color }}>
                      {pMeta.month}
                    </span>
                    <h4 className="font-display text-base font-bold text-text-main">{pMeta.name}</h4>
                    {isPhaseLocked && (
                      <span className="rounded-full bg-slate-500/20 border border-slate-500/30 px-2.5 py-0.5 text-[11px] font-bold text-text-muted">
                        🔒 {isTamil ? `நிலை ${phaseIdx} ஐ நிரப்பி திறக்கவும்` : `Complete Phase ${phaseIdx} to unlock`}
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-base" style={{ color: phase.color }}>
                    ₹{fmt(phaseTotals[phase.id]?.total || 0)}
                  </span>
                </div>

                <div className={`overflow-x-auto ${isPhaseLocked ? 'pointer-events-none opacity-55 select-none' : ''}`} aria-disabled={isPhaseLocked}>
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-300/80 dark:border-white/10 bg-slate-100/95 dark:bg-[#121c2d]/90 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-[#94a3b8]">
                        <th className="py-3 px-6 w-4/12">
                          {phase.isProfitPhase ? t.step3.tableHeaders.profitStreams : t.step3.tableHeaders.operation}
                        </th>
                        <th className="py-3 px-4 w-2/12">
                          {phase.isProfitPhase ? t.step3.tableHeaders.profitBenchmark : t.step3.tableHeaders.benchmark}
                        </th>
                        <th className="py-3 px-4 w-4/12">
                          {phase.isProfitPhase ? t.step3.tableHeaders.profitRealization : t.step3.tableHeaders.rate}
                        </th>
                        <th className="py-3 px-6 w-2/12">
                          {phase.isProfitPhase ? t.step3.tableHeaders.grossRevenue : t.step3.tableHeaders.totalCost}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {phase.tasks.map((task, idx) => {
                        const tMeta = getTaskMeta(task);
                        const entry = expenseMap[task.id] || {
                          ratePerCent: 0,
                          days: task.defaultDays,
                          totalCost: 0,
                          costPerDay: 0,
                          isEnabled: true,
                        };

                        return (
                          <TaskRowRenderer
                            key={task.id}
                            task={task}
                            phase={phase}
                            index={idx}
                            userDetails={userDetails}
                            entry={entry}
                            meta={tMeta}
                            handleRateChange={handleRateChange}
                            handleLabourChange={handleLabourChange}
                            handleMultiDayChangeActiveDay={handleMultiDayChangeActiveDay}
                            handleMultiDayLabourChange={handleMultiDayLabourChange}
                            handleFertilizerWithLabourChange={handleFertilizerWithLabourChange}
                            handleMandiChange={handleMandiChange}
                            handleToggleOptional={handleToggleOptional}
                            handleToggleMachineMode={handleToggleMachineMode}
                            handleToggleBagType={handleToggleBagType}
                            handleGunnyBagsChange={handleGunnyBagsChange}
                            handleTransportLoadingChange={handleTransportLoadingChange}
                            handleToggleYieldMode={handleToggleYieldMode}
                            handleGrainYieldChange={handleGrainYieldChange}
                            handleStrawYieldChange={handleStrawYieldChange}
                            handleToggleNotify={handleToggleNotify}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Action Bar in View All Mode */}
          <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl glass-panel border border-border-light p-4 shadow-xl">
            <button
              type="button"
              id="btn-all-save-draft"
              onClick={() => {
                saveCurrentPlan(true);
                router.push('/fertilizer');
              }}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span>📝</span>
              <span>{t.step3.saveDraftBtn || 'Save as Draft'}</span>
            </button>
            <button
              type="button"
              id="btn-all-save-plan"
              onClick={handleOpenCompleteConfirm}
              className={`rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2 text-xs font-black text-white keep-white shadow-glow transition-all flex items-center gap-1.5 ${
                !allPhasesComplete ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-110 active:scale-95 cursor-pointer'
              }`}
            >
              <span>✓</span>
              <span>{t.step3.completeBtn || 'Complete'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Complete Cultivation Plan Confirmation Modal */}
      {showCompleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 dark:bg-black/70 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setShowCompleteConfirm(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#0f182a] p-6 shadow-[0_20px_40px_-10px_rgba(15,23,42,0.2)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] space-y-5 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button matching other modals */}
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowCompleteConfirm(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-3.5 pr-8">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="font-display text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight m-0">
                  {t.step3.completeModalTitle || 'Complete Cultivation Plan?'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1 m-0">
                  {t.step3.completeModalSubtitle || 'Finalize and lock this plan record'}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed space-y-1.5">
              <p className="text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1.5 m-0">
                <AlertTriangle size={15} className="shrink-0" />
                <span>Important Notice:</span>
              </p>
              <p className="m-0">
                Once completed, this plan will be finalized and marked as completed. You <strong>cannot edit</strong> this plan from the outside records cards, and the edit action will be permanently hidden.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowCompleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                {messages.common.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                id="btn-confirm-complete"
                onClick={() => {
                  setShowCompleteConfirm(false);
                  saveCurrentPlan(false, true);
                  router.push('/fertilizer');
                }}
                className="px-5 py-2 rounded-xl text-xs font-black text-white keep-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>{t.step3.confirmCompleteBtn || 'Yes, Complete Plan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
