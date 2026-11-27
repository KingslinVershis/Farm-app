'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Switch, Modal, App, Tooltip } from 'antd';
import { AlertTriangle } from '@/components/icons/FlaticonIcons';
import { ChevronLeftIcon, ChevronDownIcon } from '@/components/icons/Icons';
import type { ExpenseEntry, ExpenseTask, PhaseGroup, UserDetails, CultivationType } from '@/lib/fertilizer/types';
import {
  formatCurrency as fmt,
  computeRecommendedPesticideLitres,
  computeRecommendedFertilizerBagRange,
  computeRecommendedFertilizerMix,
  computeDailyLabourCost,
} from '@/lib/fertilizer/calc';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { isTaskEntryFilled } from '@/lib/fertilizer/useFertilizerPlanner';
import { DayStepper } from './DayStepper';

export interface Step3MobilePhaseCardsProps {
  cultivation: CultivationType | any;
  currentPhases: PhaseGroup[];
  activePhaseIndex: number;
  setActivePhaseIndex: (idx: number | ((prev: number) => number)) => void;
  userDetails: UserDetails;
  expenseMap: Record<string, ExpenseEntry>;
  phaseTotals: Record<string, { total: number; daily: number }>;
  getPhaseMeta: (phase: PhaseGroup) => { month: string; name: string; daySpan: string };
  getTaskMeta: (task: ExpenseTask) => { name: string; dayRange: string; description: string; costEstimateHint: string };
  activePhase: PhaseGroup;
  activePhaseMeta: { month: string; name: string; daySpan: string };
  highestUnlockedPhaseIndex?: number;
  phaseCompletionMap?: boolean[];
  allPhasesComplete?: boolean;
  activePlanId: string | null;
  savePhaseProgress?: () => Promise<string | null | undefined>;
  handleOpenCompleteConfirm: () => void;
  handleRateChange: (
    taskId: string,
    rate: number,
    travelCost?: number,
    hasTravelCost?: boolean,
    repairInfo?: {
      hasRepairCost?: boolean;
      mechanicName?: string;
      mechanicNumber?: string;
      repairCost?: number;
    }
  ) => void;
  handleRepairCostChange?: (
    taskId: string,
    params: {
      hasRepairCost: boolean;
      mechanicName?: string;
      mechanicNumber?: string;
      repairCost?: number;
    }
  ) => void;
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
  handleMultiDayHarvestChange?: (taskId: string, day: number, rate: number) => void;
  handleMultiDayGunnyBagsChange?: (taskId: string, day: number, count: number, price: number) => void;
  handleMultiDayTransportChange?: (
    taskId: string,
    day: number,
    params: {
      bagCount?: number;
      perBagLiftingCost?: number;
      transportRent?: number;
      loadingWorkers?: number;
      loadingWage?: number;
      loadingSnacks?: number;
    }
  ) => void;
  handleFertilizerWithLabourChange: (
    taskId: string,
    fertQty: number,
    fertPrice: number,
    labourCount: number,
    labourWage: number,
    snackCost?: number,
    travelCost?: number,
    pesticideMl?: number
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
  phase3HerbicideMaxDays?: number;
}

export const Step3MobilePhaseCards: React.FC<Step3MobilePhaseCardsProps> = ({
  cultivation,
  currentPhases,
  activePhaseIndex,
  setActivePhaseIndex,
  userDetails,
  expenseMap,
  phaseTotals,
  getPhaseMeta,
  getTaskMeta,
  activePhase,
  activePhaseMeta,
  highestUnlockedPhaseIndex = currentPhases.length - 1,
  phaseCompletionMap,
  allPhasesComplete = true,
  activePlanId,
  savePhaseProgress,
  handleOpenCompleteConfirm,
  handleRateChange,
  handleRepairCostChange,
  handleLabourChange,
  handleMultiDayChangeActiveDay,
  handleMultiDayLabourChange,
  handleMultiDayHarvestChange,
  handleMultiDayGunnyBagsChange,
  handleMultiDayTransportChange,
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
  phase3HerbicideMaxDays,
}) => {
  const router = useRouter();
  const { message } = App.useApp();
  const { messages, locale } = useLanguage();
  const isTamil = locale === 'ta';
  const t = messages.fertilizer;
  const isPhase5 = activePhaseIndex === currentPhases.length - 1;

  // Filter Tab state
  const [filterTab, setFilterTab] = useState<'all' | 'scheduled' | 'alerts'>('all');
  // Expanded Task card id
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(
    activePhase.tasks[0]?.id || null
  );
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [savingNext, setSavingNext] = useState(false);

  // Automatically expand the first task of the phase when switching phases
  useEffect(() => {
    if (activePhase?.tasks?.[0]?.id) {
      setExpandedTaskId(activePhase.tasks[0].id);
    }
  }, [activePhase?.id]);

  // Compute Task Number offset for previous phases
  const previousPhasesTaskCount = useMemo(() => {
    return currentPhases
      .slice(0, activePhaseIndex)
      .reduce((acc, p) => acc + p.tasks.length, 0);
  }, [currentPhases, activePhaseIndex]);

  // Determine tasks with alerts/warnings
  const isAlertTask = (task: ExpenseTask) => {
    return (
      task.id === 'p3_herbicide' ||
      task.id === 'p1_fert' ||
      task.id === 'p2_tillering' ||
      task.id === 'p3_fert_dose3' ||
      task.id === 'p3_potash_sulphide' ||
      task.id === 'p1_fuel' ||
      task.id === 'p1_nursery' ||
      task.id === 'p4_harvest' ||
      Boolean(task.isOptional)
    );
  };

  // Filter tasks based on active filter tab
  const filteredTasks = useMemo(() => {
    return activePhase.tasks.filter((task) => {
      const entry = expenseMap[task.id];
      if (filterTab === 'scheduled') {
        return Boolean(entry && (entry.totalCost ?? 0) > 0 && entry.isEnabled !== false);
      }
      if (filterTab === 'alerts') {
        return isAlertTask(task);
      }
      return true;
    });
  }, [activePhase.tasks, expenseMap, filterTab]);

  const scheduledCount = useMemo(() => {
    return activePhase.tasks.filter((task) => {
      const entry = expenseMap[task.id];
      return Boolean(entry && (entry.totalCost ?? 0) > 0 && entry.isEnabled !== false);
    }).length;
  }, [activePhase.tasks, expenseMap]);

  const alertsCount = useMemo(() => {
    return activePhase.tasks.filter((task) => isAlertTask(task)).length;
  }, [activePhase.tasks]);

  const progressPercent = Math.round(((activePhaseIndex + 1) / currentPhases.length) * 100);

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

  // Back button handler
  const handleBack = () => {
    if (activePhaseIndex > 0) {
      setActivePhaseIndex(activePhaseIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const targetUrl = activePlanId ? `/fertilizer/step2/${activePlanId}` : '/fertilizer/create/step2';
      router.push(targetUrl);
    }
  };

  // Next / Save button handler
  const handleSaveAndProceed = async () => {
    if (!isPhaseDone(activePhaseIndex)) {
      showIncompletePhaseWarning(activePhaseIndex);
      return;
    }

    if (isPhase5) {
      handleOpenCompleteConfirm();
      return;
    }
    if (savePhaseProgress) {
      setSavingNext(true);
      try {
        const savedPlanId = await savePhaseProgress();
        if (savedPlanId) {
          const newUrl = `/fertilizer/step3/${savedPlanId}`;
          if (typeof window !== 'undefined' && window.location.pathname !== newUrl) {
            router.replace(newUrl);
          }
        }
      } finally {
        setSavingNext(false);
      }
    }
    if (activePhaseIndex < currentPhases.length - 1) {
      setActivePhaseIndex(activePhaseIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Shared borderless input style class
  const inputStyleClass =
    'mobile-phase-input w-full bg-transparent text-sm font-extrabold text-slate-900 dark:text-white border-0 border-none outline-none focus:outline-none focus:ring-0 ring-0 shadow-none p-0 m-0';

  return (
    <div className="w-full pb-28 text-slate-900 dark:text-slate-100">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER BAR WITH BACKGROUND                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl glass-panel border border-white/10 p-2.5 px-3.5 shadow-xl flex items-center justify-between gap-3 mb-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go Back"
          className="flex h-9 w-9 items-center justify-center rounded-full glass-surface hover:bg-white/10 border border-white/10 text-slate-700 dark:text-slate-200 shadow-2xs active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeftIcon size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="inline-block rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            {t.step3.step3Of3}
          </span>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 tracking-tight">
            {t.stepLabels.step3Subtitle}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setInfoModalOpen(true)}
          aria-label="Phase Info"
          className="flex h-9 w-9 items-center justify-center rounded-full glass-surface hover:bg-white/10 border border-white/10 text-slate-700 dark:text-slate-200 shadow-2xs active:scale-95 transition-all cursor-pointer"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. PHASE BANNER CARD                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl glass-panel border border-white/10 p-4 shadow-xl mb-3 overflow-hidden relative">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            {t.step3.phaseOfPhases.replace('{current}', String(activePhaseIndex + 1)).replace('{total}', String(currentPhases.length))}
          </span>
          <span className="rounded-full glass-surface text-slate-600 dark:text-slate-300 text-[11px] font-semibold px-2.5 py-0.5 border border-white/10">
            {activePhaseMeta.daySpan}
          </span>
        </div>

        <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-2 leading-snug">
          {activePhaseMeta.name}
        </h3>

        {/* Progress Bar */}
        <div className="mt-3.5 h-1.5 w-full bg-slate-100/80 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Phase Quick Switcher Pills */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
          {currentPhases.map((phase, pIdx) => {
            const isCurrent = pIdx === activePhaseIndex;
            const isLocked = pIdx > (highestUnlockedPhaseIndex ?? 0);
            const isDone = phaseCompletionMap ? Boolean(phaseCompletionMap[pIdx]) : false;
            const pMeta = getPhaseMeta(phase);
            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => {
                  if (isLocked) {
                    showIncompletePhaseWarning(Math.max(0, highestUnlockedPhaseIndex ?? 0));
                    return;
                  }
                  setActivePhaseIndex(pIdx);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex-1 py-1 px-1 rounded-lg text-[10px] font-bold transition-all text-center flex items-center justify-center gap-0.5 cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-500 text-white keep-white shadow-xs'
                    : isLocked
                    ? 'opacity-40 cursor-not-allowed glass-surface text-slate-400'
                    : isDone
                    ? 'glass-surface text-emerald-400 border border-emerald-500/30'
                    : 'glass-surface text-slate-300'
                }`}
              >
                <span>{pMeta.month || `P${pIdx + 1}`}</span>
                {isLocked ? <span className="text-[9px]">🔒</span> : isDone ? <span className="text-[9px]">✓</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. CULTIVATION AREA & CURRENT PHASE TOTAL CARD                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl glass-panel border border-emerald-500/30 bg-emerald-950/40 dark:bg-emerald-950/60 text-white p-4 shadow-xl mb-3.5 backdrop-blur-md">
        <div className="grid grid-cols-2 divide-x divide-emerald-500/20">
          <div className="pr-3">
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              <span>🌱</span>
              <span>{t.step3.cultivationArea || 'Cultivation Area'}</span>
            </div>
            <div className="text-sm font-bold mt-1 text-slate-100">
              {typeof cultivation === 'object' && cultivation?.name ? cultivation.name : 'Paddy'}:{' '}
              <span className="text-emerald-300 font-extrabold">
                {userDetails.landSize} {messages.common.cents}
              </span>
            </div>
          </div>

          <div className="pl-3 text-right">
            <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              {activePhase.isProfitPhase ? t.step3.grossRevenueRealization : t.step3.currentPhaseTotal}
            </div>
            <div className="text-xl font-black text-emerald-300 mt-1">
              ₹{fmt(phaseTotals[activePhase.id]?.total || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. FILTER PILLS                                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'all'
              ? 'bg-emerald-500 text-white keep-white shadow-sm'
              : 'glass-surface text-slate-800 dark:text-slate-100 border border-white/10 hover:border-emerald-500/40'
          }`}
        >
          {t.step3.allTasksFilter.replace('{count}', String(activePhase.tasks.length))}
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('scheduled')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'scheduled'
              ? 'bg-emerald-500 text-white keep-white shadow-sm'
              : 'glass-surface text-slate-800 dark:text-slate-100 border border-white/10 hover:border-emerald-500/40'
          }`}
        >
          {t.step3.scheduledFilter.replace('{count}', String(scheduledCount))}
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('alerts')}
          className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            filterTab === 'alerts'
              ? 'bg-emerald-500 text-white keep-white shadow-sm'
              : 'glass-surface text-slate-800 dark:text-slate-100 border border-white/10 hover:border-emerald-500/40'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
          <span>{t.step3.alertsFilter.replace('{count}', String(alertsCount))}</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. ACCORDION TASK CARDS LIST                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="rounded-2xl glass-card border border-white/10 p-8 text-center text-slate-600 dark:text-slate-200 text-xs font-semibold">
            {t.step3.noTasksMatch}
          </div>
        ) : (
          filteredTasks.map((task) => {
            const entry: ExpenseEntry = expenseMap[task.id] || {
              taskId: task.id,
              isEnabled: true,
              isMachineMode: false,
              activeDay: 1,
              dayEntries: [],
            };
            const meta = getTaskMeta(task);
            const isExpanded = expandedTaskId === task.id;
            const globalTaskNum = previousPhasesTaskCount + activePhase.tasks.indexOf(task) + 1;
            const isSkipped = entry.isEnabled === false;

            // Multi-day calculations
            const isDynamicMultiDay = Boolean(task.isMultiDayLabour) && task.id !== 'p3_herbicide';
            const maxDays =
              task.id === 'p3_herbicide' && phase3HerbicideMaxDays
                ? phase3HerbicideMaxDays
                : isDynamicMultiDay
                ? 60
                : task.maxDays ?? 7;
            const activeDay = Math.min(maxDays, Math.max(1, entry.activeDay ?? 1));
            const dayEntries = entry.dayEntries || [];
            const currentDayEntry = dayEntries.find((d) => d.day === activeDay) || {
              day: activeDay,
              labourCount: 0,
              labourWage: 0,
              snackCost: 0,
              travelCost: 0,
            };

            // Calculate mandatory filled status for activeDay
            let isCurrentDayMandatoryFilled = false;
            if (task.id === 'p4_harvest') {
              isCurrentDayMandatoryFilled =
                (currentDayEntry.ratePerCent ?? 0) > 0 ||
                (activeDay === 1 && (entry.ratePerCent ?? 0) > 0);
            } else if (task.isGunnyBags) {
              isCurrentDayMandatoryFilled =
                ((currentDayEntry.bagCount ?? 0) > 0 && (currentDayEntry.bagPrice ?? 0) > 0) ||
                (activeDay === 1 && (entry.bagCount ?? 0) > 0 && (entry.bagPrice ?? 0) > 0);
            } else if (task.isTransportLoading) {
              const bCount =
                currentDayEntry.bagCount ??
                currentDayEntry.transportRent ??
                (activeDay === 1 ? entry.bagCount ?? entry.transportRent ?? 0 : 0);
              const liftCost =
                currentDayEntry.perBagLiftingCost ??
                currentDayEntry.loadingWorkers ??
                (activeDay === 1 ? entry.perBagLiftingCost ?? entry.loadingWorkers ?? 0 : 0);
              isCurrentDayMandatoryFilled = bCount > 0 && liftCost > 0;
            } else {
              isCurrentDayMandatoryFilled =
                (currentDayEntry.labourCount ?? 0) > 0 && (currentDayEntry.labourWage ?? 0) > 0;
            }

            const filledMultiDays = dayEntries.filter((d) => {
              if (d.day > maxDays) return false;
              if (task.id === 'p4_harvest') {
                return (d.ratePerCent ?? 0) > 0;
              }
              if (task.isGunnyBags) {
                return (d.bagCount ?? 0) > 0 || (d.bagPrice ?? 0) > 0;
              }
              if (task.isTransportLoading) {
                return (
                  ((d.bagCount ?? d.transportRent ?? 0) > 0 &&
                    (d.perBagLiftingCost ?? d.loadingWorkers ?? 0) > 0) ||
                  (d.loadingSnacks ?? 0) > 0
                );
              }
              return (
                (d.labourCount ?? 0) > 0 ||
                (d.labourWage ?? 0) > 0 ||
                (d.snackCost ?? 0) > 0 ||
                (d.travelCost ?? 0) > 0
              );
            });

            const maxFilledDay =
              filledMultiDays.length > 0 ? Math.max(...filledMultiDays.map((d) => d.day)) : 0;
            const canGoNext = activeDay < maxFilledDay || isCurrentDayMandatoryFilled;

            const totalDynamicDays = isDynamicMultiDay
              ? Math.max(1, activeDay, maxFilledDay)
              : maxDays;

            const stepperMax = isDynamicMultiDay
              ? canGoNext
                ? Math.max(activeDay + 1, maxFilledDay, 1)
                : Math.max(activeDay, maxFilledDay, 1)
              : maxDays;

            // Resolved previously entered values for Phase 5 tasks (supporting nested/DB casing)
            const rawYieldKg =
              entry.yieldKg !== undefined && entry.yieldKg !== 0
                ? entry.yieldKg
                : (entry as any).total_yieldKg !== undefined && (entry as any).total_yieldKg !== 0
                ? (entry as any).total_yieldKg
                : entry.yieldTons
                ? entry.yieldTons * 1000
                : '';

            const rawBagWeight =
              entry.bagWeightKg !== undefined && entry.bagWeightKg !== 0
                ? entry.bagWeightKg
                : '';

            const rawBagPrice =
              entry.grainBagPrice !== undefined && entry.grainBagPrice !== 0
                ? entry.grainBagPrice
                : (entry as any).pricePerBag !== undefined && (entry as any).pricePerBag !== 0
                ? (entry as any).pricePerBag
                : '';

            const rawGrainBags = entry.grainBagCount ?? 0;

            const rawStrawSacks =
              entry.strawSackCount !== undefined && entry.strawSackCount !== 0
                ? entry.strawSackCount
                : (entry as any).SackCount !== undefined && (entry as any).SackCount !== 0
                ? (entry as any).SackCount
                : '';

            const rawStrawPrice =
              entry.strawPrice !== undefined && entry.strawPrice !== 0
                ? entry.strawPrice
                : (entry as any).SackPrice !== undefined && (entry as any).SackPrice !== 0
                ? (entry as any).SackPrice
                : '';

            // Compute total task cost / realization correctly
            const computedTaskTotal = (() => {
              if (isSkipped) return 0;
              if (task.id === 'p1_nursery') {
                const seed = entry.ratePerCent || 0;
                const travel = entry.hasTravelCost !== false ? (entry.travelCost || 0) : 0;
                return seed + travel;
              }
              if (task.id === 'p1_fuel') {
                const fuel = entry.ratePerCent || 0;
                const repair = entry.hasRepairCost ? (entry.repairCost || 0) : 0;
                return fuel + repair;
              }
              return entry.totalCost || 0;
            })();

            // Summary Badges for Collapsed Card
            const renderCollapsedBadges = () => {
              if (entry.isMachineMode) {
                return (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                    {t.step3.machineTransplant || 'Tractor / Machine'}
                  </span>
                );
              }
              if (task.id === 'p1_nursery') {
                return (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                      {t.step3.seed}: ₹{entry.ratePerCent || 0}
                    </span>
                    {entry.hasTravelCost !== false && (entry.travelCost || 0) > 0 && (
                      <span className="px-2 py-0.5 rounded-md glass-surface text-amber-600 dark:text-amber-300 border border-amber-500/30 text-[11px] font-semibold">
                        +{t.step3.tableHeaders.travelCost}: ₹{entry.travelCost}
                      </span>
                    )}
                  </div>
                );
              }
              if (task.id === 'p1_fuel') {
                return (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                      {t.step3.fuel}: ₹{entry.ratePerCent || 0}
                    </span>
                    {entry.hasRepairCost && (entry.repairCost || 0) > 0 && (
                      <span className="px-2 py-0.5 rounded-md glass-surface text-amber-600 dark:text-amber-300 border border-amber-500/30 text-[11px] font-semibold">
                        +{t.step3.repairCost}: ₹{entry.repairCost}
                      </span>
                    )}
                  </div>
                );
              }
              if (task.id === 'p1_tractor' || task.id === 'p2_tractor') {
                return (
                  <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                    {t.step3.rent}: ₹{entry.ratePerCent || task.defaultRate || 0} / cent
                  </span>
                );
              }
              if (task.id === 'p4_harvest') {
                const hCost = currentDayEntry.ratePerCent || entry.ratePerCent || 0;
                return (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                    Harvest Rent: ₹{hCost}
                  </span>
                );
              }
              if (task.isMultiDayLabour && task.isLabour) {
                const filledDays = filledMultiDays.length;
                return (
                  <>
                    <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                      {filledDays} {filledDays === 1 ? 'Day' : 'Days'} Filled
                    </span>
                    {(currentDayEntry.labourWage ?? 0) > 0 && (
                      <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                        Wage ₹{currentDayEntry.labourWage}
                      </span>
                    )}
                  </>
                );
              }
              if (task.isFertilizerWithLabour) {
                const fertUnit = task.id === 'p1_fert' || task.id === 'p2_tillering' ? 'L' : task.id === 'p3_fert_dose3' || task.id === 'p2_fert_labour' ? 'Bags' : 'kg';
                const isBagTask = task.id === 'p3_fert_dose3' || task.id === 'p2_fert_labour';
                const effectiveQty = (entry.fertQty !== undefined && entry.fertQty !== 0)
                  ? entry.fertQty
                  : isBagTask && computeRecommendedFertilizerBagRange(userDetails.landSize || 0).minBags > 0
                  ? computeRecommendedFertilizerBagRange(userDetails.landSize || 0).minBags
                  : (entry.fertQty || 0);
                return (
                  <>
                    <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                      Qty: {effectiveQty} {fertUnit}
                    </span>
                    {(entry.fertPrice ?? 0) > 0 && (
                      <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                        ₹{entry.fertPrice}
                      </span>
                    )}
                  </>
                );
              }
              if (task.isGunnyBags) {
                return (
                  <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                    {entry.bagCount || 0} Bags • ₹{entry.bagPrice || 0}
                  </span>
                );
              }
              if (task.isTransportLoading) {
                return (
                  <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                    {entry.bagCount || 0} Bags • ₹{entry.perBagLiftingCost || 0}/bag
                  </span>
                );
              }
              if (task.isGrainYield) {
                const yKg = Number(rawYieldKg) || 0;
                return (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                      {yKg > 0 ? `${(yKg / 1000).toFixed(1)} Tons (${yKg} kg)` : 'Yield'}
                    </span>
                    {Number(rawGrainBags) > 0 && (
                      <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                        {rawGrainBags} Bags
                      </span>
                    )}
                    {Number(rawBagPrice) > 0 && (
                      <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                        ₹{rawBagPrice}/bag
                      </span>
                    )}
                  </div>
                );
              }
              if (task.isStrawYield) {
                const sCount = Number(rawStrawSacks) || 0;
                const sPrice = Number(rawStrawPrice) || 0;
                return (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                      {sCount} Sacks
                    </span>
                    {sPrice > 0 && (
                      <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                        ₹{sPrice}/sack
                      </span>
                    )}
                  </div>
                );
              }
              if (task.isMandiTrip) {
                return (
                  <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                    {entry.mandiCount || 0} Trips • ₹{entry.mandiRate || 0}
                  </span>
                );
              }
              if (task.isLabour) {
                return (
                  <>
                    <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                      {entry.labourCount || 0} Labourers
                    </span>
                    <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                      Wage ₹{entry.labourWage || 0}
                    </span>
                  </>
                );
              }
              return (
                <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                  {t.step3.rate}: ₹{entry.ratePerCent || task.defaultRate || 0} / cent
                </span>
              );
            };

            const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
            const isPesticideDose = task.id === 'p1_fert' || task.id === 'p2_tillering';
            const isBagCountDose = task.id === 'p3_fert_dose3' || task.id === 'p2_fert_labour';
            const bagRange = computeRecommendedFertilizerBagRange(cents);
            const fertMix = computeRecommendedFertilizerMix(cents);
            const activePesticideMl = entry.pesticideMl ?? (
              cents > 0 && entry.fertQty
                ? Math.round((Number(entry.fertQty) * 1000) / (cents / 2))
                : 80
            );

            const taskDisplayName = task.id === 'p1_nursery'
              ? t.step3.seedCostAndTravelCostTitle
              : meta.name.replace(/Nursery\s*Bed\s*&?\s*/gi, '');

            // ─────────────────────────────────────────────────────────
            // CARD VARIANT A: COLLAPSED CARD
            // ─────────────────────────────────────────────────────────
            if (!isExpanded) {
              return (
                <div
                  key={task.id}
                  onClick={() => setExpandedTaskId(task.id)}
                  className="rounded-2xl glass-card glass-card-hover border border-white/10 dark:border-white/10 p-3.5 shadow-md transition-all cursor-pointer hover:border-emerald-400/50"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold">
                    <span className="text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-wide">
                      TASK {globalTaskNum}
                    </span>
                    <span className="text-slate-400 dark:text-slate-400">•</span>
                    <span className="text-slate-700 dark:text-slate-200 font-semibold">
                      {meta.dayRange}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-1.5">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {taskDisplayName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {renderCollapsedBadges()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 text-right">
                      <div>
                        <div className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          {activePhase.isProfitPhase ? 'Revenue' : 'Cost'}
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                          ₹{fmt(computedTaskTotal)}
                        </div>
                      </div>

                      <div className="flex h-7 w-7 items-center justify-center rounded-full glass-surface text-slate-700 dark:text-slate-200 border border-white/10">
                        <ChevronDownIcon size={15} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // ─────────────────────────────────────────────────────────
            // CARD VARIANT B: EXPANDED CARD
            // ─────────────────────────────────────────────────────────
            return (
              <div
                key={task.id}
                className="rounded-2xl glass-panel border-2 border-emerald-500/90 dark:border-emerald-400/90 p-4 shadow-2xl transition-all relative overflow-hidden backdrop-blur-xl"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-600 text-white font-bold text-[11px] px-2.5 py-0.5 shadow-xs">
                      TASK {globalTaskNum}
                    </span>

                    {task.isOptional ? (
                      <button
                        type="button"
                        onClick={() => handleToggleOptional(task.id)}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-all cursor-pointer ${
                          !isSkipped
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                            : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 border border-slate-300 dark:border-white/10'
                        }`}
                      >
                        {!isSkipped ? '✓ Included' : 'Skipped (₹0)'}
                      </button>
                    ) : (
                      <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold text-[11px] px-2.5 py-0.5 border border-emerald-300/80 dark:border-emerald-500/30">
                        ✓ Included
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedTaskId(null)}
                    aria-label="Collapse Task"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer active:scale-95"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                </div>

                {/* Title & Description */}
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-2 leading-snug">
                  {taskDisplayName}
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 leading-relaxed font-medium">
                  {meta.description || meta.dayRange}
                </p>

                {/* ── ALERTS / ADVISORIES BANNER (If Applicable) ── */}
                {task.id === 'p3_herbicide' && (
                  <div className="mt-3 rounded-xl bg-purple-500/15 dark:bg-purple-500/10 border border-purple-400/30 dark:border-purple-500/30 p-3 flex items-center justify-between gap-3 shadow-xs backdrop-blur-sm">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-extrabold text-purple-900 dark:text-purple-300">
                          {t.step3.herbicideAlertActive}
                        </div>
                        <div className="text-[11px] text-purple-800 dark:text-purple-400 font-medium">
                          {t.step3.ensureStandingWater}
                        </div>
                      </div>
                    </div>
                    <Switch
                      size="small"
                      checked={entry.herbicideNotify !== false}
                      onChange={(checked) => handleToggleNotify?.(task.id, 'Herbicide_notify', checked)}
                      className="bg-purple-400"
                    />
                  </div>
                )}

                {(task.id === 'p1_fert' || task.id === 'p2_tillering') && (
                  <div className="mt-3 rounded-xl bg-amber-500/15 dark:bg-amber-500/10 border border-amber-400/30 dark:border-amber-500/30 p-3 flex items-center justify-between gap-3 shadow-xs backdrop-blur-sm">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-extrabold text-amber-900 dark:text-amber-300">
                          {t.step3.pesticideSprayAlert}
                        </div>
                        <div className="text-[11px] text-amber-800 dark:text-amber-400 font-medium">
                          {task.id === 'p1_fert'
                            ? t.step3.schedule15DaysAfterTransplanting
                            : t.step3.protectiveSprayTillering}
                        </div>
                      </div>
                    </div>
                    <Switch
                      size="small"
                      checked={entry.pesticideNotify !== false}
                      onChange={(checked) => handleToggleNotify?.(task.id, 'pesticide_notify', checked)}
                      className="bg-amber-400"
                    />
                  </div>
                )}

                {(task.id === 'p3_fert_dose3' || task.id === 'p3_potash_sulphide') && (
                  <div className="mt-3 rounded-xl bg-teal-500/15 dark:bg-teal-500/10 border border-teal-400/30 dark:border-teal-500/30 p-3 flex items-center justify-between gap-3 shadow-xs backdrop-blur-sm">
                    <div className="flex items-start gap-2.5">
                      <span className="text-teal-600 dark:text-teal-400 text-sm mt-0.5">🔔</span>
                      <div>
                        <div className="text-xs font-extrabold text-teal-900 dark:text-teal-300">
                          {t.step3.fertilizerTimingAlert}
                        </div>
                        <div className="text-[11px] text-teal-800 dark:text-teal-400 font-medium">
                          {task.id === 'p3_fert_dose3'
                            ? t.step3.schedule3DaysAfterPesticide
                            : t.step3.applyPotashSulphide}
                        </div>
                      </div>
                    </div>
                    <Switch
                      size="small"
                      checked={entry.fertilizerNotify !== false}
                      onChange={(checked) => handleToggleNotify?.(task.id, 'fertilizer_notify', checked)}
                      className="bg-teal-400"
                    />
                  </div>
                )}

                {task.id === 'p1_fuel' && (
                  <div className="mt-3 rounded-xl glass-surface border border-white/10 p-3 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {t.step3.motorRepairBill}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-200">
                        {t.step3.includeMechanicRepair}
                      </div>
                    </div>
                    <Switch
                      size="small"
                      checked={entry.hasRepairCost === true}
                      onChange={(checked) =>
                        handleRepairCostChange?.(task.id, {
                          hasRepairCost: checked,
                          mechanicName: entry.mechanicName || '',
                          mechanicNumber: entry.mechanicNumber || '',
                          repairCost: entry.repairCost || 0,
                        })
                      }
                    />
                  </div>
                )}

                {task.id === 'p1_nursery' && (
                  <div className="mt-3 rounded-xl glass-surface border border-white/10 p-3 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {t.step3.seedTravelCost}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-200">
                        {t.step3.includeSeedTravel}
                      </div>
                    </div>
                    <Switch
                      size="small"
                      checked={entry.hasTravelCost !== false}
                      onChange={(checked) =>
                        handleRateChange(
                          task.id,
                          entry.ratePerCent ?? 0,
                          entry.travelCost ?? 0,
                          checked
                        )
                      }
                    />
                  </div>
                )}

                {/* ── MACHINE MODE / MANUAL TOGGLE (If Supported) ── */}
                {task.allowMachineToggle && (
                  <div className="mt-3 flex items-center justify-between gap-2 p-2.5 rounded-xl glass-surface border border-white/10">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {t.step3.operationMethod}:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleMachineMode(task.id, task.defaultMachineRate ?? 25)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold border transition-all cursor-pointer shadow-xs ${
                        entry.isMachineMode
                          ? 'border-cyan-400 bg-cyan-50 text-cyan-900 dark:bg-cyan-500/20 dark:text-cyan-300'
                          : 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
                      }`}
                    >
                      <span>{entry.isMachineMode ? '🚜' : '👥'}</span>
                      <span>
                        {entry.isMachineMode
                          ? t.step3.machineTransplant || 'Machine Way'
                          : t.step3.manualTransplant || 'Manual Labour'}
                      </span>
                    </button>
                  </div>
                )}

                {/* ── GUNNY BAG TYPE TOGGLE (Plastic vs Traditional Jute) ── */}
                {task.isGunnyBags && (
                  <div className="mt-3 flex items-center justify-between gap-2 p-2.5 rounded-xl glass-surface border border-white/10">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {t.step3.bagType}:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleBagType(task.id, task.defaultPlasticPrice ?? 20, task.defaultTraditionalPrice ?? 45)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold border transition-all cursor-pointer shadow-xs ${
                        entry.isPlasticBag !== false
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300'
                      }`}
                    >
                      <span>{entry.isPlasticBag !== false ? '🛍️' : '🌾'}</span>
                      <span>
                        {entry.isPlasticBag !== false
                          ? (t.step3.modernPlasticBags || 'Modern Plastic Bags')
                          : (t.step3.traditionalJuteBags || 'Traditional Gunny Bags')}
                      </span>
                    </button>
                  </div>
                )}

                {/* ── PESTICIDE DOSAGE PRESETS (If Applicable) ── */}
                {(task.id === 'p1_fert' || task.id === 'p2_tillering') && (
                  <div className={`mt-3 p-2.5 rounded-xl glass-surface border border-white/10 ${isSkipped ? 'pointer-events-none opacity-50' : ''}`}>
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-800 dark:text-slate-100">
                        {t.step3.pesticideDosagePerCan}:
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                        {activePesticideMl} ml
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[50, 60, 70, 80, 90, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            const calculatedLitres = computeRecommendedPesticideLitres(cents, preset);
                            handleFertilizerWithLabourChange(
                              task.id,
                              calculatedLitres,
                              entry.fertPrice ?? 0,
                              entry.labourCount ?? 0,
                              entry.labourWage ?? 0,
                              entry.snackCost ?? 0,
                              entry.travelCost ?? 0,
                              preset
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activePesticideMl === preset
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'glass-surface text-slate-700 dark:text-slate-200 border border-white/10 hover:border-emerald-400/40'
                          }`}
                        >
                          {preset}ml
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── FERTILIZER BAG RECOMMENDATION & PRESETS (For Task 8 & Task 13) ── */}
                {isBagCountDose && cents > 0 && (
                  <div className={`mt-3 p-3 rounded-xl glass-surface border border-emerald-500/25 bg-emerald-950/20 shadow-xs ${isSkipped ? 'pointer-events-none opacity-50' : ''}`}>
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        <span>📦</span>
                        <span>{t.step3.recommendedBags}:</span>
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                        {bagRange.minBags} – {bagRange.maxBags} {t.step3.bagsUnit} ({cents} {messages.common.cents})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleFertilizerWithLabourChange(
                            task.id,
                            bagRange.minBags,
                            entry.fertPrice ?? 0,
                            task.isMultiDayLabour ? (currentDayEntry.labourCount ?? 0) : (entry.labourCount ?? 0),
                            task.isMultiDayLabour ? (currentDayEntry.labourWage ?? 0) : (entry.labourWage ?? 0),
                            task.isMultiDayLabour ? (currentDayEntry.snackCost ?? 0) : (entry.snackCost ?? 0),
                            task.isMultiDayLabour ? (currentDayEntry.travelCost ?? 0) : (entry.travelCost ?? 0),
                            entry.pesticideMl
                          );
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                          (entry.fertQty || bagRange.minBags) === bagRange.minBags
                            ? 'bg-emerald-500 text-white keep-white border-emerald-500'
                            : 'glass-surface text-emerald-400 border-emerald-500/30 hover:border-emerald-400'
                        }`}
                      >
                        {t.step3.minBagsLabel ? t.step3.minBagsLabel.replace('{count}', String(bagRange.minBags)) : `Min: ${bagRange.minBags} bags`}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleFertilizerWithLabourChange(
                            task.id,
                            bagRange.maxBags,
                            entry.fertPrice ?? 0,
                            task.isMultiDayLabour ? (currentDayEntry.labourCount ?? 0) : (entry.labourCount ?? 0),
                            task.isMultiDayLabour ? (currentDayEntry.labourWage ?? 0) : (entry.labourWage ?? 0),
                            task.isMultiDayLabour ? (currentDayEntry.snackCost ?? 0) : (entry.snackCost ?? 0),
                            task.isMultiDayLabour ? (currentDayEntry.travelCost ?? 0) : (entry.travelCost ?? 0),
                            entry.pesticideMl
                          );
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-all cursor-pointer ${
                          entry.fertQty === bagRange.maxBags
                            ? 'bg-emerald-500 text-white keep-white border-emerald-500'
                            : 'glass-surface text-emerald-400 border-emerald-500/30 hover:border-emerald-400'
                        }`}
                      >
                        {t.step3.maxBagsLabel ? t.step3.maxBagsLabel.replace('{count}', String(bagRange.maxBags)) : `Max: ${bagRange.maxBags} bags`}
                      </button>
                    </div>

                    {/* Suggested Fertilizer Mix breakdown */}
                    <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-1 text-[10px] text-slate-700 dark:text-slate-300">
                      <div>{t.step3.ureaKgLabel ? t.step3.ureaKgLabel.replace('{kg}', String(fertMix.ureaKg)) : `Urea: ${fertMix.ureaKg} kg`}</div>
                      <div>{t.step3.complexKgLabel ? t.step3.complexKgLabel.replace('{kg}', String(fertMix.complexKg)) : `Complex: ${fertMix.complexKg} kg`}</div>
                      <div>{t.step3.potashKgLabel ? t.step3.potashKgLabel.replace('{kg}', String(fertMix.potashKg)) : `Potash: ${fertMix.potashKg} kg`}</div>
                      <div>{t.step3.dapKgLabel ? t.step3.dapKgLabel.replace('{kg}', String(fertMix.dapKg)) : `DAP: ${fertMix.dapKg} kg`}</div>
                      <div className="col-span-2 text-emerald-500 font-semibold">{t.step3.vembuPowderKgLabel ? t.step3.vembuPowderKgLabel.replace('{kg}', String(fertMix.vembuPowderKg)) : `Vembu Powder: ${fertMix.vembuPowderKg} kg`}</div>
                    </div>
                  </div>
                )}

                {/* ── POTASH & SULPHIDE BOOSTER SPLIT (Task 14) ── */}
                {task.id === 'p3_potash_sulphide' && (
                  <div className={`mt-3 p-2.5 rounded-xl glass-surface border border-teal-500/25 bg-teal-950/20 text-[10px] ${isSkipped ? 'pointer-events-none opacity-50' : ''}`}>
                    <div className="font-bold text-teal-400 mb-1">
                      {t.step3.split5050}
                    </div>
                    <div className="flex items-center gap-3 text-slate-300">
                      <span>{t.step3.potashKgLabel ? t.step3.potashKgLabel.replace('{kg}', String(Number(((entry.fertQty || 0) / 2).toFixed(2)))) : `Potash: ${Number(((entry.fertQty || 0) / 2).toFixed(2))} kg`}</span>
                      <span>•</span>
                      <span>{t.step3.sulphideKgLabel ? t.step3.sulphideKgLabel.replace('{kg}', String(Number(((entry.fertQty || 0) / 2).toFixed(2)))) : `Sulphide: ${Number(((entry.fertQty || 0) / 2).toFixed(2))} kg`}</span>
                    </div>
                  </div>
                )}

                {/* ── MULTI-DAY STEPPER (If Applicable) ── */}
                {task.isMultiDayLabour && !entry.isMachineMode && (
                  <div
                    className={`mt-3.5 p-3 rounded-xl glass-surface border border-white/10 shadow-inner ${
                      isSkipped ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-slate-800 dark:text-slate-100">
                        {t.step3.activeWorkDay}:
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                        {t.step3.dayOf ? t.step3.dayOf.replace('{active}', String(activeDay)).replace('{total}', String(totalDynamicDays)) : `Day ${activeDay} of ${totalDynamicDays}`}
                      </span>
                    </div>
                    <DayStepper
                      value={activeDay}
                      min={1}
                      max={stepperMax}
                      dayLabel={t.step3.dayLabel}
                      maxLabel={`(${filledMultiDays.length}/${totalDynamicDays} ${totalDynamicDays === 1 ? t.step3.dayLabel : (t.step3.daysUnit || 'days')})`}
                      disableNext={!canGoNext}
                      nextDisabledReason={
                        t.step3.dayFillRequired
                          ? t.step3.dayFillRequired.replace('{day}', String(activeDay)).replace('{nextDay}', String(activeDay + 1))
                          : `Fill required fields for Day ${activeDay} to unlock Day ${activeDay + 1}`
                      }
                      onNextBlocked={() => {
                        let msg = t.step3.warnFillLabourAndWage
                          ? t.step3.warnFillLabourAndWage.replace('{day}', String(activeDay))
                          : `Please fill Labour Count and Wage for Day ${activeDay} before moving to the next day.`;
                        if (task.id === 'p4_harvest') {
                          msg = t.step3.warnFillMachineHarvest
                            ? t.step3.warnFillMachineHarvest.replace('{day}', String(activeDay))
                            : `Please fill Machine Harvest Cost for Day ${activeDay} before moving to the next day.`;
                        } else if (task.isGunnyBags) {
                          msg = t.step3.warnFillGunnyBags
                            ? t.step3.warnFillGunnyBags.replace('{day}', String(activeDay))
                            : `Please fill Gunny Bag Count and Price for Day ${activeDay} before moving to the next day.`;
                        } else if (task.id === 'p4_sack_stitcher') {
                          msg = t.step3.warnFillStitcher
                            ? t.step3.warnFillStitcher.replace('{day}', String(activeDay))
                            : `Please fill Stitched Bag Count and Cost per Bag for Day ${activeDay} before moving to the next day.`;
                        } else if (task.isTransportLoading) {
                          msg = t.step3.warnFillTransportLoading
                            ? t.step3.warnFillTransportLoading.replace('{day}', String(activeDay))
                            : `Please fill Bag Count and Per Bag Lifting Cost for Day ${activeDay} before moving to the next day.`;
                        }
                        message.warning(msg);
                      }}
                      onChange={(nextDay) => handleMultiDayChangeActiveDay?.(task.id, nextDay, maxDays)}
                    />
                  </div>
                )}

                {/* ── INPUTS SECTION ── */}
                <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10">
                  <div className="flex items-center justify-between text-xs mb-2.5">
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">
                      {task.isFertilizerWithLabour
                        ? t.step3.fertilizerNutritionInputs
                        : entry.isMachineMode || task.id === 'p4_harvest'
                        ? t.step3.machineRentInputs
                        : task.isGunnyBags
                        ? t.step3.gunnyBagInputs
                        : task.isTransportLoading
                        ? t.step3.loadingTransportInputs
                        : task.isGrainYield
                        ? t.step3.grainYieldInputs
                        : task.isStrawYield
                        ? t.step3.strawYieldInputs
                        : task.isMandiTrip
                        ? t.step3.mandiLogisticsInputs
                        : t.step3.labourWageInputs}
                    </span>
                    {meta.costEstimateHint && (
                      <span className="text-[11px] font-bold text-slate-700 dark:text-emerald-300 glass-surface border border-white/10 px-2 py-0.5 rounded-md truncate max-w-[140px]">
                        {meta.costEstimateHint}
                      </span>
                    )}
                  </div>

                  {/* ── Dynamic Inputs by Task Type ── */}
                  {entry.isMachineMode ? (
                    /* Machine Mode (Tractor toggle) */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.ratePerCent}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={entry.ratePerCent || ''}
                            onChange={(e) => handleRateChange(task.id, Number(e.target.value) || 0)}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.totalArea}
                        </label>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white pt-0.5">
                          {userDetails.landSize} Cents
                        </div>
                      </div>
                    </div>
                  ) : task.id === 'p4_harvest' ? (
                    /* Machine Harvesting (Task 18) */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.dayMachineCost ? t.step3.dayMachineCost.replace('{day}', String(activeDay)) : `Day ${activeDay} Machine Cost`}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={
                              currentDayEntry.ratePerCent !== undefined && currentDayEntry.ratePerCent !== 0
                                ? currentDayEntry.ratePerCent
                                : activeDay === 1 && entry.ratePerCent !== undefined && entry.ratePerCent !== 0
                                ? entry.ratePerCent
                                : ''
                            }
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              handleMultiDayHarvestChange?.(task.id, activeDay, val);
                            }}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.seedTotalArea}
                        </label>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white pt-0.5">
                          {userDetails.landSize} Cents
                        </div>
                      </div>
                    </div>
                  ) : task.id === 'p1_nursery' ? (
                    /* Task 2: Certified Seeds & Travel Expenses */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.seedCostTitle}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={entry.ratePerCent !== undefined && entry.ratePerCent !== 0 ? entry.ratePerCent : ''}
                            onChange={(e) =>
                              handleRateChange(
                                task.id,
                                parseFloat(e.target.value) || 0,
                                entry.travelCost ?? 0,
                                entry.hasTravelCost !== false
                              )
                            }
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {entry.hasTravelCost !== false && (
                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.travelCostTitle}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={entry.travelCost !== undefined && entry.travelCost !== 0 ? entry.travelCost : ''}
                              onChange={(e) =>
                                handleRateChange(
                                  task.id,
                                  entry.ratePerCent ?? 0,
                                  parseFloat(e.target.value) || 0,
                                  true
                                )
                              }
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : task.id === 'p1_fuel' ? (
                    /* Task 3: Water Motor & Irrigation Pump Fuel & Repair */
                    entry.hasRepairCost ? (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.fuelCostTitle}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={entry.ratePerCent !== undefined && entry.ratePerCent !== 0 ? entry.ratePerCent : ''}
                              onChange={(e) => handleRateChange(task.id, parseFloat(e.target.value) || 0)}
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.repairBillTitle}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={entry.repairCost !== undefined && entry.repairCost !== 0 ? entry.repairCost : ''}
                              onChange={(e) =>
                                handleRepairCostChange?.(task.id, {
                                  hasRepairCost: true,
                                  repairCost: parseFloat(e.target.value) || 0,
                                  mechanicName: entry.mechanicName || '',
                                  mechanicNumber: entry.mechanicNumber || '',
                                })
                              }
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.mechanicPhoneHeader}
                          </label>
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder="9876543210"
                            disabled={isSkipped}
                            value={entry.mechanicNumber || ''}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                              handleRepairCostChange?.(task.id, {
                                hasRepairCost: true,
                                mechanicNumber: cleaned,
                                mechanicName: entry.mechanicName || '',
                                repairCost: entry.repairCost || 0,
                              });
                            }}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                          />
                        </div>

                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.mechanicNameHeader}
                          </label>
                          <input
                            type="text"
                            placeholder={t.step3.namePlaceholder}
                            disabled={isSkipped}
                            value={entry.mechanicName || ''}
                            onChange={(e) =>
                              handleRepairCostChange?.(task.id, {
                                hasRepairCost: true,
                                mechanicName: e.target.value,
                                mechanicNumber: entry.mechanicNumber || '',
                                repairCost: entry.repairCost || 0,
                              })
                            }
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.fuelCostTitle}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={entry.ratePerCent !== undefined && entry.ratePerCent !== 0 ? entry.ratePerCent : ''}
                              onChange={(e) => handleRateChange(task.id, parseFloat(e.target.value) || 0)}
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.totalArea}
                          </label>
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white pt-0.5">
                            {userDetails.landSize} {messages.common.cents}
                          </div>
                        </div>
                      </div>
                    )
                  ) : task.isFertilizerWithLabour ? (
                    /* Fertilizer + Labour Inputs */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {isPesticideDose
                            ? t.step3.tableHeaders.pesticideQty
                            : (task.id === 'p3_fert_dose3' || task.id === 'p2_fert_labour')
                            ? t.step3.tableHeaders.fertilizerBagCount
                            : t.step3.tableHeaders.fertQty}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={isSkipped}
                            value={
                              entry.fertQty !== undefined && entry.fertQty !== 0
                                ? entry.fertQty
                                : isBagCountDose && bagRange.minBags > 0
                                ? bagRange.minBags
                                : ''
                            }
                            onChange={(e) => {
                              const qty = parseFloat(e.target.value) || 0;
                              if (task.isMultiDayLabour) {
                                handleFertilizerWithLabourChange(
                                  task.id,
                                  qty,
                                  entry.fertPrice ?? 0,
                                  currentDayEntry.labourCount ?? 0,
                                  currentDayEntry.labourWage ?? 0,
                                  currentDayEntry.snackCost ?? 0,
                                  currentDayEntry.travelCost ?? 0,
                                  entry.pesticideMl
                                );
                              } else {
                                handleFertilizerWithLabourChange(
                                  task.id,
                                  qty,
                                  entry.fertPrice ?? 0,
                                  entry.labourCount ?? 0,
                                  entry.labourWage ?? 0,
                                  entry.snackCost ?? 0,
                                  entry.travelCost ?? 0,
                                  entry.pesticideMl
                                );
                              }
                            }}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            {isPesticideDose
                              ? t.step3.litreUnit
                              : (task.id === 'p3_fert_dose3' || task.id === 'p2_fert_labour')
                              ? t.step3.bagsUnit
                              : 'kg'}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.fertPrice}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={entry.fertPrice !== undefined && entry.fertPrice !== 0 ? entry.fertPrice : ''}
                            onChange={(e) => {
                              const price = parseFloat(e.target.value) || 0;
                              if (task.isMultiDayLabour) {
                                handleFertilizerWithLabourChange(
                                  task.id,
                                  entry.fertQty ?? 0,
                                  price,
                                  currentDayEntry.labourCount ?? 0,
                                  currentDayEntry.labourWage ?? 0,
                                  currentDayEntry.snackCost ?? 0,
                                  currentDayEntry.travelCost ?? 0,
                                  entry.pesticideMl
                                );
                              } else {
                                handleFertilizerWithLabourChange(
                                  task.id,
                                  entry.fertQty ?? 0,
                                  price,
                                  entry.labourCount ?? 0,
                                  entry.labourWage ?? 0,
                                  entry.snackCost ?? 0,
                                  entry.travelCost ?? 0,
                                  entry.pesticideMl
                                );
                              }
                            }}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.labourCount}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={
                              task.isMultiDayLabour
                                ? currentDayEntry.labourCount !== 0
                                  ? currentDayEntry.labourCount
                                  : ''
                                : entry.labourCount !== undefined && entry.labourCount !== 0
                                ? entry.labourCount
                                : ''
                            }
                            onChange={(e) => {
                              const num = parseFloat(e.target.value) || 0;
                              if (task.isMultiDayLabour) {
                                handleMultiDayLabourChange?.(
                                  task.id,
                                  activeDay,
                                  num,
                                  currentDayEntry.labourWage,
                                  currentDayEntry.snackCost,
                                  currentDayEntry.travelCost,
                                  maxDays
                                );
                              } else {
                                handleFertilizerWithLabourChange(
                                  task.id,
                                  entry.fertQty ?? 0,
                                  entry.fertPrice ?? 0,
                                  num,
                                  entry.labourWage ?? 0,
                                  entry.snackCost ?? 0,
                                  entry.travelCost ?? 0,
                                  entry.pesticideMl
                                );
                              }
                            }}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t.step3.personsUnit}</span>
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.labourWage}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={
                              task.isMultiDayLabour
                                ? currentDayEntry.labourWage !== 0
                                  ? currentDayEntry.labourWage
                                  : ''
                                : entry.labourWage !== undefined && entry.labourWage !== 0
                                ? entry.labourWage
                                : ''
                            }
                            onChange={(e) => {
                              const num = parseFloat(e.target.value) || 0;
                              if (task.isMultiDayLabour) {
                                handleMultiDayLabourChange?.(
                                  task.id,
                                  activeDay,
                                  currentDayEntry.labourCount,
                                  num,
                                  currentDayEntry.snackCost,
                                  currentDayEntry.travelCost,
                                  maxDays
                                );
                              } else {
                                handleFertilizerWithLabourChange(
                                  task.id,
                                  entry.fertQty ?? 0,
                                  entry.fertPrice ?? 0,
                                  entry.labourCount ?? 0,
                                  num,
                                  entry.snackCost ?? 0,
                                  entry.travelCost ?? 0,
                                  entry.pesticideMl
                                );
                              }
                            }}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">/day</span>
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.snackCost}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={
                              task.isMultiDayLabour
                                ? currentDayEntry.snackCost !== 0
                                  ? currentDayEntry.snackCost
                                  : ''
                                : entry.snackCost !== undefined && entry.snackCost !== 0
                                ? entry.snackCost
                                : ''
                            }
                            onChange={(e) => {
                              const num = parseFloat(e.target.value) || 0;
                              if (task.isMultiDayLabour) {
                                handleMultiDayLabourChange?.(
                                  task.id,
                                  activeDay,
                                  currentDayEntry.labourCount,
                                  currentDayEntry.labourWage,
                                  num,
                                  currentDayEntry.travelCost,
                                  maxDays
                                );
                              } else {
                                handleFertilizerWithLabourChange(
                                  task.id,
                                  entry.fertQty ?? 0,
                                  entry.fertPrice ?? 0,
                                  entry.labourCount ?? 0,
                                  entry.labourWage ?? 0,
                                  num,
                                  entry.travelCost ?? 0,
                                  entry.pesticideMl
                                );
                              }
                            }}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Total</span>
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.travelCost}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={
                              task.isMultiDayLabour
                                ? currentDayEntry.travelCost !== 0
                                  ? currentDayEntry.travelCost
                                  : ''
                                : entry.travelCost !== undefined && entry.travelCost !== 0
                                ? entry.travelCost
                                : ''
                            }
                            onChange={(e) => {
                              const num = parseFloat(e.target.value) || 0;
                              if (task.isMultiDayLabour) {
                                handleMultiDayLabourChange?.(
                                  task.id,
                                  activeDay,
                                  currentDayEntry.labourCount,
                                  currentDayEntry.labourWage,
                                  currentDayEntry.snackCost,
                                  num,
                                  maxDays
                                );
                              } else {
                                handleFertilizerWithLabourChange(
                                  task.id,
                                  entry.fertQty ?? 0,
                                  entry.fertPrice ?? 0,
                                  entry.labourCount ?? 0,
                                  entry.labourWage ?? 0,
                                  entry.snackCost ?? 0,
                                  num,
                                  entry.pesticideMl
                                );
                              }
                            }}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Total</span>
                        </div>
                      </div>
                    </div>
                  ) : task.isGunnyBags ? (
                    /* Gunny Bags (Task 19) */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.bagCount}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={
                              currentDayEntry.bagCount !== undefined && currentDayEntry.bagCount !== 0
                                ? currentDayEntry.bagCount
                                : activeDay === 1 && entry.bagCount !== undefined && entry.bagCount !== 0
                                ? entry.bagCount
                                : ''
                            }
                            onChange={(e) => {
                              const count = parseFloat(e.target.value) || 0;
                              const price =
                                currentDayEntry.bagPrice !== undefined && currentDayEntry.bagPrice !== 0
                                  ? currentDayEntry.bagPrice
                                  : activeDay === 1
                                  ? entry.bagPrice ?? 0
                                  : 0;
                              handleMultiDayGunnyBagsChange?.(task.id, activeDay, count, price);
                            }}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Bags</span>
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.bagPrice}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={
                              currentDayEntry.bagPrice !== undefined && currentDayEntry.bagPrice !== 0
                                ? currentDayEntry.bagPrice
                                : activeDay === 1 && entry.bagPrice !== undefined && entry.bagPrice !== 0
                                ? entry.bagPrice
                                : ''
                            }
                            onChange={(e) => {
                              const price = parseFloat(e.target.value) || 0;
                              const count =
                                currentDayEntry.bagCount !== undefined && currentDayEntry.bagCount !== 0
                                  ? currentDayEntry.bagCount
                                  : activeDay === 1
                                  ? entry.bagCount ?? 0
                                  : 0;
                              handleMultiDayGunnyBagsChange?.(task.id, activeDay, count, price);
                            }}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ) : task.isTransportLoading ? (
                    /* Transport & Loading (Task 22) */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.transportBagCount}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={
                              currentDayEntry.bagCount !== undefined && currentDayEntry.bagCount !== 0
                                ? currentDayEntry.bagCount
                                : currentDayEntry.transportRent !== undefined && currentDayEntry.transportRent !== 0
                                ? currentDayEntry.transportRent
                                : activeDay === 1 && (entry.bagCount || entry.transportRent)
                                ? entry.bagCount || entry.transportRent
                                : ''
                            }
                            onChange={(e) => {
                              const count = parseFloat(e.target.value) || 0;
                              handleMultiDayTransportChange?.(task.id, activeDay, {
                                bagCount: count,
                                transportRent: count,
                              });
                            }}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Bags</span>
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.perBagLiftingCost}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={
                              currentDayEntry.perBagLiftingCost !== undefined && currentDayEntry.perBagLiftingCost !== 0
                                ? currentDayEntry.perBagLiftingCost
                                : currentDayEntry.loadingWorkers !== undefined && currentDayEntry.loadingWorkers !== 0
                                ? currentDayEntry.loadingWorkers
                                : activeDay === 1 && (entry.perBagLiftingCost || entry.loadingWorkers)
                                ? entry.perBagLiftingCost || entry.loadingWorkers
                                : ''
                            }
                            onChange={(e) => {
                              const lift = parseFloat(e.target.value) || 0;
                              handleMultiDayTransportChange?.(task.id, activeDay, {
                                perBagLiftingCost: lift,
                                loadingWorkers: lift,
                              });
                            }}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.snackCost}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={
                              currentDayEntry.loadingSnacks !== undefined && currentDayEntry.loadingSnacks !== 0
                                ? currentDayEntry.loadingSnacks
                                : activeDay === 1 && entry.loadingSnacks !== undefined && entry.loadingSnacks !== 0
                                ? entry.loadingSnacks
                                : ''
                            }
                            onChange={(e) => {
                              const snacks = parseFloat(e.target.value) || 0;
                              handleMultiDayTransportChange?.(task.id, activeDay, { loadingSnacks: snacks });
                            }}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Total</span>
                        </div>
                      </div>
                    </div>
                  ) : task.isGrainYield ? (
                    /* Grain Yield Sale (Task 23 - Phase 5) */
                    <div>
                      {/* ⚡ RECOMMENDED YIELD QUICK PRESET */}
                      <div className="mb-2.5">
                        <button
                          type="button"
                          disabled={isSkipped}
                          onClick={() => {
                            handleGrainYieldChange(task.id, {
                              yieldKg: 10500,
                              bagWeightKg: 75,
                              bagPrice: 1650,
                            });
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 active:scale-[0.99] transition-all text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-emerald-500 font-black text-xs shrink-0">⚡</span>
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 truncate">
                              {t.step3.recPaddyYield}
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 shrink-0 ml-2">
                            {messages.common.apply}
                          </span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.tableHeaders.yieldKg}
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={rawYieldKg}
                              onChange={(e) => {
                                const kg = parseFloat(e.target.value) || 0;
                                handleGrainYieldChange(task.id, {
                                  yieldKg: kg,
                                  bagWeightKg: entry.bagWeightKg ?? 0,
                                  bagPrice: entry.grainBagPrice ?? 0,
                                });
                              }}
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">kg</span>
                          </div>
                        </div>

                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.tableHeaders.bagWeightKg}
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={rawBagWeight}
                              onChange={(e) => {
                                const bw = parseFloat(e.target.value) || 0;
                                handleGrainYieldChange(task.id, {
                                  yieldKg: entry.yieldKg ?? ((entry.yieldTons ?? 0) * 1000),
                                  bagWeightKg: bw,
                                  bagPrice: entry.grainBagPrice ?? 0,
                                });
                              }}
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">kg</span>
                          </div>
                        </div>

                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.tableHeaders.grainPrice}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={rawBagPrice}
                              onChange={(e) => {
                                const price = parseFloat(e.target.value) || 0;
                                handleGrainYieldChange(task.id, {
                                  yieldKg: entry.yieldKg ?? ((entry.yieldTons ?? 0) * 1000),
                                  bagWeightKg: entry.bagWeightKg ?? 0,
                                  bagPrice: price,
                                });
                              }}
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.tableHeaders.bagCount}
                          </label>
                          <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 pt-0.5">
                            {rawGrainBags} {t.step3.bagsUnit || 'Bags'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : task.isStrawYield ? (
                    /* Straw & Fodder Biomass (Task 24 - Phase 5) */
                    <div>
                      {/* ⚡ RECOMMENDED STRAW QUICK PRESET */}
                      <div className="mb-2.5">
                        <button
                          type="button"
                          disabled={isSkipped}
                          onClick={() => {
                            handleStrawYieldChange(task.id, 100, 150);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 active:scale-[0.99] transition-all text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-emerald-500 font-black text-xs shrink-0">⚡</span>
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 truncate">
                              {t.step3.recStrawSacksVal}
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 shrink-0 ml-2">
                            {t.step3.applyBtn}
                          </span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.tableHeaders.strawSacks}
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={rawStrawSacks}
                              onChange={(e) =>
                                handleStrawYieldChange(
                                  task.id,
                                  parseFloat(e.target.value) || 0,
                                  entry.strawPrice ?? 0
                                )
                              }
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Sacks</span>
                          </div>
                        </div>

                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.tableHeaders.strawPrice}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={rawStrawPrice}
                              onChange={(e) =>
                                handleStrawYieldChange(
                                  task.id,
                                  entry.strawSackCount ?? 0,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : task.isMandiTrip ? (
                    /* Mandi Logistics */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.mandiLoads}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={entry.mandiCount !== undefined && entry.mandiCount !== 0 ? entry.mandiCount : ''}
                            onChange={(e) =>
                              handleMandiChange(
                                task.id,
                                parseFloat(e.target.value) || 0,
                                entry.mandiRate ?? 0
                              )
                            }
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Trips</span>
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.rateTrip}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={entry.mandiRate !== undefined && entry.mandiRate !== 0 ? entry.mandiRate : ''}
                            onChange={(e) =>
                              handleMandiChange(
                                task.id,
                                entry.mandiCount ?? 0,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ) : task.id === 'p4_sack_stitcher' ? (
                    /* Sack Stitcher (Task 21 - Bag sealing) */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.stitchedBagCount}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={currentDayEntry.labourCount || ''}
                            onChange={(e) =>
                              handleMultiDayLabourChange?.(
                                task.id,
                                activeDay,
                                Number(e.target.value) || 0,
                                currentDayEntry.labourWage ?? 0,
                                currentDayEntry.snackCost ?? 0,
                                currentDayEntry.travelCost ?? 0,
                                maxDays
                              )
                            }
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Bags</span>
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.stitchingCostPerBag}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={currentDayEntry.labourWage || ''}
                            onChange={(e) =>
                              handleMultiDayLabourChange?.(
                                task.id,
                                activeDay,
                                currentDayEntry.labourCount ?? 0,
                                Number(e.target.value) || 0,
                                currentDayEntry.snackCost ?? 0,
                                currentDayEntry.travelCost ?? 0,
                                maxDays
                              )
                            }
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {task.hasSnacks && (
                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.tableHeaders.snackCost}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={currentDayEntry.snackCost || ''}
                              onChange={(e) =>
                                handleMultiDayLabourChange?.(
                                  task.id,
                                  activeDay,
                                  currentDayEntry.labourCount ?? 0,
                                  currentDayEntry.labourWage ?? 0,
                                  Number(e.target.value) || 0,
                                  currentDayEntry.travelCost ?? 0,
                                  maxDays
                                )
                              }
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Total</span>
                          </div>
                        </div>
                      )}

                      {task.hasTravel && (
                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.tableHeaders.travelCost}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={currentDayEntry.travelCost || ''}
                              onChange={(e) =>
                                handleMultiDayLabourChange?.(
                                  task.id,
                                  activeDay,
                                  currentDayEntry.labourCount ?? 0,
                                  currentDayEntry.labourWage ?? 0,
                                  currentDayEntry.snackCost ?? 0,
                                  Number(e.target.value) || 0,
                                  maxDays
                                )
                              }
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Total</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : task.isMultiDayLabour && task.isLabour ? (
                    /* Multi-Day Labour Grid */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.labourCount}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={currentDayEntry.labourCount || ''}
                            onChange={(e) =>
                              handleMultiDayLabourChange?.(
                                task.id,
                                activeDay,
                                Number(e.target.value) || 0,
                                currentDayEntry.labourWage ?? 0,
                                currentDayEntry.snackCost ?? 0,
                                currentDayEntry.travelCost ?? 0,
                                maxDays
                              )
                            }
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Persons</span>
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.labourWage}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={currentDayEntry.labourWage || ''}
                            onChange={(e) =>
                              handleMultiDayLabourChange?.(
                                task.id,
                                activeDay,
                                currentDayEntry.labourCount ?? 0,
                                Number(e.target.value) || 0,
                                currentDayEntry.snackCost ?? 0,
                                currentDayEntry.travelCost ?? 0,
                                maxDays
                              )
                            }
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">/day</span>
                        </div>
                      </div>

                      {task.hasSnacks && (
                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.tableHeaders.snackCost}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={currentDayEntry.snackCost || ''}
                              onChange={(e) =>
                                handleMultiDayLabourChange?.(
                                  task.id,
                                  activeDay,
                                  currentDayEntry.labourCount ?? 0,
                                  currentDayEntry.labourWage ?? 0,
                                  Number(e.target.value) || 0,
                                  currentDayEntry.travelCost ?? 0,
                                  maxDays
                                )
                              }
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Total</span>
                          </div>
                        </div>
                      )}

                      {task.hasTravel && (
                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.tableHeaders.travelCost}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={currentDayEntry.travelCost || ''}
                              onChange={(e) =>
                                handleMultiDayLabourChange?.(
                                  task.id,
                                  activeDay,
                                  currentDayEntry.labourCount ?? 0,
                                  currentDayEntry.labourWage ?? 0,
                                  currentDayEntry.snackCost ?? 0,
                                  Number(e.target.value) || 0,
                                  maxDays
                                )
                              }
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Total</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : task.isLabour && !entry.isMachineMode ? (
                    /* Default Single-Day Labour Grid */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.labourCount}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={entry.labourCount || ''}
                            onChange={(e) =>
                              handleLabourChange(
                                task.id,
                                Number(e.target.value) || 0,
                                entry.labourWage ?? 0,
                                entry.snackCost ?? 0,
                                entry.travelCost ?? 0
                              )
                            }
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Persons</span>
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.labourWage}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={entry.labourWage || ''}
                            onChange={(e) =>
                              handleLabourChange(
                                task.id,
                                entry.labourCount ?? 0,
                                Number(e.target.value) || 0,
                                entry.snackCost ?? 0,
                                entry.travelCost ?? 0
                              )
                            }
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">/day</span>
                        </div>
                      </div>

                      {task.hasSnacks && (
                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.tableHeaders.snackCost}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={entry.snackCost || ''}
                              onChange={(e) =>
                                handleLabourChange(
                                  task.id,
                                  entry.labourCount ?? 0,
                                  entry.labourWage ?? 0,
                                  Number(e.target.value) || 0,
                                  entry.travelCost ?? 0
                                )
                              }
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Total</span>
                          </div>
                        </div>
                      )}

                      {task.hasTravel && (
                        <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                          <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                            {t.step3.tableHeaders.travelCost}
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                            <input
                              type="number"
                              min="0"
                              disabled={isSkipped}
                              value={entry.travelCost || ''}
                              onChange={(e) =>
                                handleLabourChange(
                                  task.id,
                                  entry.labourCount ?? 0,
                                  entry.labourWage ?? 0,
                                  entry.snackCost ?? 0,
                                  Number(e.target.value) || 0
                                )
                              }
                              data-mobile-input="true" className={inputStyleClass}
                              style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                              placeholder="0"
                            />
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Total</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Standard Rate per Cent Input (e.g. Tractor, Water cycling) */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.rateCent}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={entry.ratePerCent !== undefined && entry.ratePerCent !== 0 ? entry.ratePerCent : ''}
                            onChange={(e) => handleRateChange(task.id, parseFloat(e.target.value) || 0)}
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.totalAreaUpper}
                        </label>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white pt-0.5">
                          {userDetails.landSize} Cents
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card Subtotal / Realization Footer */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                      TASK {globalTaskNum} {activePhase.isProfitPhase ? t.step3.realization : t.step3.subtotal}
                    </span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      ₹{fmt(computedTaskTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. BOTTOM STICKY ACTIONS BAR                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 glass-panel backdrop-blur-xl border-t border-white/10 p-3 shadow-2xl flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-xl border border-white/15 glass-surface px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
        >
          {activePhaseIndex > 0
            ? getPhaseMeta(currentPhases[activePhaseIndex - 1]).month
            : t.step3.step2Short}
        </button>

        <button
          type="button"
          disabled={savingNext}
          onClick={handleSaveAndProceed}
          className={`flex-1 rounded-xl px-4 py-3 text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
            isPhaseDone(activePhaseIndex)
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-98 text-white keep-white cursor-pointer shadow-lg shadow-emerald-500/25'
              : 'bg-slate-700/60 dark:bg-slate-800 text-slate-400 opacity-65 cursor-not-allowed border border-white/5'
          } disabled:opacity-60`}
        >
          {savingNext ? (
            <span>{messages.common.saving}</span>
          ) : isPhase5 ? (
            <span>{t.step3.completeAndReviewPlan}</span>
          ) : (
            <span>
              {t.step3.saveAndGoTo.replace('{phase}', getPhaseMeta(currentPhases[activePhaseIndex + 1]).month)}
            </span>
          )}
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. PHASE INFO MODAL                                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Modal
        open={infoModalOpen}
        onCancel={() => setInfoModalOpen(false)}
        footer={null}
        centered
        title={
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              {activePhaseMeta.month}: {activePhaseMeta.name}
            </span>
          </div>
        }
      >
        <div className="py-2 space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            {t.step3.phaseInfoDesc
              .replace('{count}', String(activePhase.tasks.length))
              .replace('{daySpan}', activePhaseMeta.daySpan)}
          </p>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <div className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">
              {t.step3.cultivationParameters}:
            </div>
            <div>
              {typeof cultivation === 'object' && cultivation?.name ? cultivation.name : 'Paddy'} •{' '}
              {userDetails.landSize} Cents
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Step3MobilePhaseCards;
