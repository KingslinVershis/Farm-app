'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Switch, Modal, message } from 'antd';
import { AlertTriangle } from '@/components/icons/FlaticonIcons';
import { ChevronLeftIcon, ChevronDownIcon } from '@/components/icons/Icons';
import type { ExpenseEntry, ExpenseTask, PhaseGroup, UserDetails, CultivationType } from '@/lib/fertilizer/types';
import { formatCurrency as fmt } from '@/lib/fertilizer/calc';
import { useLanguage } from '@/components/providers/LanguageProvider';
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
      task.id === 'p3_pest1' ||
      task.id === 'p3_pest2' ||
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
            {isTamil ? 'படி 3 / 3' : 'STEP 3 OF 3'}
          </span>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 tracking-tight">
            {isTamil ? 'பருவ வாரியான செலவுகள்' : 'Phase-Wise Expenses'}
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
            {isTamil ? `பருவம் ${activePhaseIndex + 1} / ${currentPhases.length}` : `PHASE ${activePhaseIndex + 1} OF ${currentPhases.length}`}
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
              {activePhase.isProfitPhase ? (isTamil ? 'பருவ மொத்த வரவு' : 'Gross Revenue Realization') : isTamil ? 'பருவ மொத்த செலவு' : 'Current Phase Total'}
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
          {isTamil ? `அனைத்து பணிகள் (${activePhase.tasks.length})` : `All Tasks (${activePhase.tasks.length})`}
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
          {isTamil ? `திட்டமிடப்பட்டவை (${scheduledCount})` : `Scheduled (${scheduledCount})`}
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
          <span>{isTamil ? `எச்சரிக்கைகள் (${alertsCount})` : `Alerts (${alertsCount})`}</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. ACCORDION TASK CARDS LIST                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="rounded-2xl glass-card border border-white/10 p-8 text-center text-slate-600 dark:text-slate-200 text-xs font-semibold">
            {isTamil ? 'பணிகள் எதுவும் கிடைக்கவில்லை' : 'No tasks match the selected filter.'}
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
                : task.defaultYieldTons
                ? task.defaultYieldTons * 1000
                : '';

            const rawBagWeight =
              entry.bagWeightKg !== undefined && entry.bagWeightKg !== 0
                ? entry.bagWeightKg
                : task.defaultBagWeightKg || '';

            const rawBagPrice =
              entry.grainBagPrice !== undefined && entry.grainBagPrice !== 0
                ? entry.grainBagPrice
                : (entry as any).pricePerBag !== undefined && (entry as any).pricePerBag !== 0
                ? (entry as any).pricePerBag
                : task.defaultBagPrice || '';

            const rawGrainBags =
              entry.grainBagCount !== undefined && entry.grainBagCount !== 0
                ? entry.grainBagCount
                : Number(rawBagWeight) > 0 && Number(rawYieldKg) > 0
                ? Number((Number(rawYieldKg) / Number(rawBagWeight)).toFixed(1))
                : task.defaultGrainBags || 0;

            const rawStrawSacks =
              entry.strawSackCount !== undefined && entry.strawSackCount !== 0
                ? entry.strawSackCount
                : (entry as any).SackCount !== undefined && (entry as any).SackCount !== 0
                ? (entry as any).SackCount
                : task.defaultStrawSacks || '';

            const rawStrawPrice =
              entry.strawPrice !== undefined && entry.strawPrice !== 0
                ? entry.strawPrice
                : (entry as any).SackPrice !== undefined && (entry as any).SackPrice !== 0
                ? (entry as any).SackPrice
                : task.defaultStrawPrice || '';

            // Compute total task cost / realization correctly
            const computedTaskTotal = (() => {
              if (entry.totalCost && entry.totalCost > 0) return entry.totalCost;
              if (task.isGrainYield) {
                const bCount = Number(rawGrainBags) || 0;
                const bPrice = Number(rawBagPrice) || 0;
                return Math.round(bCount * bPrice);
              }
              if (task.isStrawYield) {
                const sCount = Number(rawStrawSacks) || 0;
                const sPrice = Number(rawStrawPrice) || 0;
                return Math.round(sCount * sPrice);
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
              if (task.id === 'p4_harvest') {
                const hCost = currentDayEntry.ratePerCent || entry.ratePerCent || 0;
                return (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                    Harvest Rent: ₹{hCost}
                  </span>
                );
              }
              if (task.isMultiDayLabour) {
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
                return (
                  <>
                    <span className="px-2 py-0.5 rounded-md glass-surface text-slate-700 dark:text-slate-100 border border-white/10 text-[11px] font-semibold">
                      Qty: {entry.fertQty || 0} kg
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
            };

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
                        {meta.name}
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
                  {meta.name}
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 leading-relaxed font-medium">
                  {meta.description || meta.dayRange}
                </p>

                {/* ── ALERTS / ADVISORIES BANNER (If Applicable) ── */}
                {task.id === 'p3_herbicide' && (
                  <div className="mt-3 rounded-xl bg-amber-500/15 dark:bg-amber-500/10 border border-amber-400/30 dark:border-amber-500/30 p-3 flex items-center justify-between gap-3 shadow-xs backdrop-blur-sm">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-extrabold text-amber-900 dark:text-amber-300">
                          {isTamil ? 'களைக்கொல்லி எச்சரிக்கை' : 'Herbicide Alert Active'}
                        </div>
                        <div className="text-[11px] text-amber-800 dark:text-amber-400 font-medium">
                          {isTamil ? 'நிலையான நீர் நிலையை பராமரிக்கவும்' : 'Ensure standing water condition'}
                        </div>
                      </div>
                    </div>
                    <Switch
                      size="small"
                      checked={entry.herbicideNotify !== false}
                      onChange={(checked) => handleToggleNotify?.(task.id, 'Herbicide_notify', checked)}
                      className="bg-amber-400"
                    />
                  </div>
                )}

                {task.id === 'p1_fuel' && (
                  <div className="mt-3 rounded-xl glass-surface border border-white/10 p-3 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {isTamil ? 'டிராக்டர் பழுது செலவு' : 'Tractor Repair & Maintenance'}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-200">
                        {isTamil ? 'பழுது பார்த்தல் உள்ளதா?' : 'Include mechanic repair bill?'}
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

                {/* ── MACHINE MODE / MANUAL TOGGLE (If Supported) ── */}
                {task.allowMachineToggle && (
                  <div className="mt-3 flex items-center justify-between gap-2 p-2 rounded-xl glass-surface border border-white/10">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {isTamil ? 'இயக்க முறை' : 'Operation Method'}:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleMachineMode(task.id, task.defaultMachineRate)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-extrabold border transition-all cursor-pointer shadow-xs ${
                        entry.isMachineMode
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'border-slate-300 bg-white text-slate-700 dark:bg-white/10 dark:text-slate-200'
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

                {/* ── MULTI-DAY STEPPER (If Applicable) ── */}
                {task.isMultiDayLabour && !entry.isMachineMode && (
                  <div
                    className={`mt-3.5 p-3 rounded-xl glass-surface border border-white/10 shadow-inner ${
                      isSkipped ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                      <span className="text-slate-800 dark:text-slate-100">
                        {isTamil ? 'பணி நாள் தேர்வு' : 'Active Work Day'}:
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                        {isTamil ? `நாள் ${activeDay} / ${totalDynamicDays}` : `Day ${activeDay} of ${totalDynamicDays}`}
                      </span>
                    </div>
                    <DayStepper
                      value={activeDay}
                      min={1}
                      max={stepperMax}
                      dayLabel={isTamil ? 'நாள்' : 'Day'}
                      maxLabel={
                        isTamil
                          ? `(${filledMultiDays.length}/${totalDynamicDays} ${totalDynamicDays === 1 ? 'நாள்' : 'நாட்கள்'})`
                          : `(${filledMultiDays.length}/${totalDynamicDays} ${totalDynamicDays === 1 ? 'day' : 'days'})`
                      }
                      disableNext={!canGoNext}
                      nextDisabledReason={
                        isTamil
                          ? `அடுத்த நாளுக்குச் செல்ல நாள் ${activeDay}-ன் கட்டாய விவரங்களை நிரப்பவும்`
                          : `Fill required fields for Day ${activeDay} to unlock Day ${activeDay + 1}`
                      }
                      onNextBlocked={() => {
                        let msg = isTamil
                          ? `அடுத்த நாளுக்குச் செல்லும் முன் நாள் ${activeDay}-க்கான ஆட்கள் எண்ணிக்கை மற்றும் கூலியை நிரப்பவும்.`
                          : `Please fill Labour Count and Wage for Day ${activeDay} before moving to the next day.`;
                        if (task.id === 'p4_harvest') {
                          msg = isTamil
                            ? `அடுத்த நாளுக்குச் செல்லும் முன் நாள் ${activeDay}-க்கான இயந்திர அறுவடை செலவை நிரப்பவும்.`
                            : `Please fill Machine Harvest Cost for Day ${activeDay} before moving to the next day.`;
                        } else if (task.isGunnyBags) {
                          msg = isTamil
                            ? `அடுத்த நாளுக்குச் செல்லும் முன் நாள் ${activeDay}-க்கான சாக்கு எண்ணிக்கை மற்றும் விலையை நிரப்பவும்.`
                            : `Please fill Gunny Bag Count and Price for Day ${activeDay} before moving to the next day.`;
                        } else if (task.id === 'p4_sack_stitcher') {
                          msg = isTamil
                            ? `அடுத்த நாளுக்குச் செல்லும் முன் நாள் ${activeDay}-க்கான தையல் சாக்கு எண்ணிக்கை மற்றும் ஒரு சாக்கு கூலியை நிரப்பவும்.`
                            : `Please fill Stitched Bag Count and Cost per Bag for Day ${activeDay} before moving to the next day.`;
                        } else if (task.isTransportLoading) {
                          msg = isTamil
                            ? `அடுத்த நாளுக்குச் செல்லும் முன் நாள் ${activeDay}-க்கான சாக்கு எண்ணிக்கை மற்றும் ஒரு சாக்கு ஏற்றுக் கூலியை நிரப்பவும்.`
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
                        ? isTamil
                          ? 'உர & ஊட்டச்சத்து உள்ளீடுகள்'
                          : 'Fertilizer & Application Inputs'
                        : entry.isMachineMode || task.id === 'p4_harvest'
                        ? isTamil
                          ? 'இயந்திர வாடகை உள்ளீடுகள்'
                          : 'Machine Rent Inputs'
                        : task.isGunnyBags
                        ? isTamil
                          ? 'சாக்கு உள்ளீடுகள்'
                          : 'Gunny Bag Inputs'
                        : task.isTransportLoading
                        ? isTamil
                          ? 'ஏற்றுக்கூலி & போக்குவரத்து'
                          : 'Loading & Transport Inputs'
                        : task.isGrainYield
                        ? isTamil
                          ? 'தானிய மகசூல் உள்ளீடுகள்'
                          : 'Grain Yield Inputs'
                        : task.isStrawYield
                        ? isTamil
                          ? 'வைக்கோல் மகசூல் உள்ளீடுகள்'
                          : 'Straw Yield Inputs'
                        : task.isMandiTrip
                        ? isTamil
                          ? 'மண்டி போக்குவரத்து உள்ளீடுகள்'
                          : 'Mandi Logistics Inputs'
                        : isTamil
                        ? 'ஆட்கள் & ஊதிய உள்ளீடுகள்'
                        : 'Labour & Operation Rate Inputs'}
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
                          {isTamil ? 'வாடகை / சென்ட்' : 'RATE / CENT'}
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
                          {isTamil ? 'மொத்த பரப்பு' : 'TOTAL AREA'}
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
                          {isTamil ? `நாள் ${activeDay} இயந்திர வாடகை` : `Day ${activeDay} Machine Cost`}
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
                          {isTamil ? 'பயிரிடும் பரப்பு' : 'TOTAL AREA'}
                        </label>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white pt-0.5">
                          {userDetails.landSize} Cents
                        </div>
                      </div>
                    </div>
                  ) : task.isFertilizerWithLabour ? (
                    /* Fertilizer + Labour Inputs */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {isTamil ? 'உர அளவு' : 'FERTILIZER QTY'}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={entry.fertQty || ''}
                            onChange={(e) =>
                              handleFertilizerWithLabourChange(
                                task.id,
                                Number(e.target.value) || 0,
                                entry.fertPrice ?? 0,
                                entry.labourCount ?? 0,
                                entry.labourWage ?? 0,
                                entry.snackCost ?? 0,
                                entry.travelCost ?? 0
                              )
                            }
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">kg</span>
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {isTamil ? 'உர விலை' : 'FERT PRICE'}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={entry.fertPrice || ''}
                            onChange={(e) =>
                              handleFertilizerWithLabourChange(
                                task.id,
                                entry.fertQty ?? 0,
                                Number(e.target.value) || 0,
                                entry.labourCount ?? 0,
                                entry.labourWage ?? 0,
                                entry.snackCost ?? 0,
                                entry.travelCost ?? 0
                              )
                            }
                            data-mobile-input="true" className={inputStyleClass}
                            style={{ border: 'none', borderWidth: 0, outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {isTamil ? 'ஆட்கள் எண்ணிக்கை' : 'LABOUR COUNT'}
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={entry.labourCount || ''}
                            onChange={(e) =>
                              handleFertilizerWithLabourChange(
                                task.id,
                                entry.fertQty ?? 0,
                                entry.fertPrice ?? 0,
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
                          {isTamil ? 'தினக்கூலி' : 'WAGE / PERSON'}
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            disabled={isSkipped}
                            value={entry.labourWage || ''}
                            onChange={(e) =>
                              handleFertilizerWithLabourChange(
                                task.id,
                                entry.fertQty ?? 0,
                                entry.fertPrice ?? 0,
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
                    </div>
                  ) : task.isGunnyBags ? (
                    /* Gunny Bags (Task 19) */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.bagCount || (isTamil ? 'சாக்கு எண்ணிக்கை' : 'BAG COUNT')}
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
                          {t.step3.tableHeaders.bagPrice || (isTamil ? 'சாக்கு விலை' : 'PRICE / BAG')}
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
                          {t.step3.tableHeaders.transportBagCount || (isTamil ? 'சாக்கு எண்ணிக்கை' : 'BAG COUNT')}
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
                          {t.step3.tableHeaders.perBagLiftingCost || (isTamil ? 'ஏற்றுக்கூலி / சாக்கு' : 'LIFTING / BAG')}
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
                    </div>
                  ) : task.isGrainYield ? (
                    /* Grain Yield Sale (Task 23 - Phase 5) */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.yieldKg || (isTamil ? 'மொத்த மகசூல் (KG)' : 'TOTAL YIELD (KG)')}
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
                                bagWeightKg: Number(rawBagWeight) || 0,
                                bagPrice: Number(rawBagPrice) || 0,
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
                          {t.step3.tableHeaders.bagWeightKg || (isTamil ? 'சாக்கு எடை (KG)' : 'BAG WEIGHT (KG)')}
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
                                yieldKg: Number(rawYieldKg) || 0,
                                bagWeightKg: bw,
                                bagPrice: Number(rawBagPrice) || 0,
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
                          {t.step3.tableHeaders.grainPrice || (isTamil ? 'சாக்கு விலை (₹)' : 'PRICE / BAG (₹)')}
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
                                yieldKg: Number(rawYieldKg) || 0,
                                bagWeightKg: Number(rawBagWeight) || 0,
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
                          {t.step3.tableHeaders.bagCount || (isTamil ? 'மதிப்பீடு சாக்குகள்' : 'TOTAL BAGS')}
                        </label>
                        <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 pt-0.5">
                          {rawGrainBags} {t.step3.bagsUnit || 'Bags'}
                        </div>
                      </div>
                    </div>
                  ) : task.isStrawYield ? (
                    /* Straw & Fodder Biomass (Task 24 - Phase 5) */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.strawSacks || (isTamil ? 'வைக்கோல் கட்டுகள்' : 'STRAW SACKS')}
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
                                Number(rawStrawPrice) || 0
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
                          {t.step3.tableHeaders.strawPrice || (isTamil ? 'விலை / கட்டு (₹)' : 'PRICE / SACK (₹)')}
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
                                Number(rawStrawSacks) || 0,
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
                  ) : task.isMandiTrip ? (
                    /* Mandi Logistics */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {t.step3.tableHeaders.mandiLoads || (isTamil ? 'மண்டி நடைகள்' : 'MANDI TRIPS')}
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
                          {isTamil ? 'கட்டணம் / நடை (₹)' : 'RATE / TRIP (₹)'}
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
                          {t.step3.tableHeaders.stitchedBagCount || (isTamil ? 'தையல் சாக்கு எண்ணிக்கை' : 'STITCHED BAGS')}
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
                          {t.step3.tableHeaders.stitchingCostPerBag || (isTamil ? 'தையல் கூலி / சாக்கு (₹)' : 'COST / BAG (₹)')}
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

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {isTamil ? 'சிற்றுண்டி செலவு' : 'SNACK COST'}
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

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {isTamil ? 'பயணச் செலவு' : 'TRAVEL COST'}
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
                    </div>
                  ) : task.isMultiDayLabour ? (
                    /* Multi-Day Labour Grid */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {isTamil ? 'ஆட்கள் எண்ணிக்கை' : 'LABOUR COUNT'}
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
                          {isTamil ? 'தினக்கூலி' : 'WAGE / PERSON'}
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

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {isTamil ? 'சிற்றுண்டி செலவு' : 'SNACK COST'}
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

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {isTamil ? 'பயணச் செலவு' : 'TRAVEL COST'}
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
                    </div>
                  ) : (
                    /* Default Labour Grid */
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {isTamil ? 'ஆட்கள் எண்ணிக்கை' : 'LABOUR COUNT'}
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
                          {isTamil ? 'தினக்கூலி' : 'WAGE / PERSON'}
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

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {isTamil ? 'சிற்றுண்டி செலவு' : 'SNACK COST'}
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

                      <div className="rounded-xl glass-surface border border-white/10 dark:border-white/15 p-2.5 transition-all focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20">
                        <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-1">
                          {isTamil ? 'பயணச் செலவு' : 'TRAVEL COST'}
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
                    </div>
                  )}

                  {/* Card Subtotal / Realization Footer */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                      TASK {globalTaskNum} {activePhase.isProfitPhase ? (isTamil ? 'வருவாய் வரவு' : 'Realization') : isTamil ? 'துணை மொத்தம்' : 'Subtotal'}
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
            : isTamil
            ? 'படி 2'
            : 'Phase 0 / Step 2'}
        </button>

        <button
          type="button"
          disabled={savingNext}
          onClick={handleSaveAndProceed}
          className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-98 text-white keep-white px-4 py-3 text-xs font-black shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          {savingNext ? (
            <span>{isTamil ? 'சேமிக்கிறது...' : 'Saving...'}</span>
          ) : isPhase5 ? (
            <span>{isTamil ? 'திட்டம் முடிந்தது (சுருக்கம் காண்க) →' : 'Complete & Review Plan →'}</span>
          ) : (
            <span>
              {isTamil
                ? `சேமித்து ${getPhaseMeta(currentPhases[activePhaseIndex + 1]).month} செல்க →`
                : `Save & Go to ${getPhaseMeta(currentPhases[activePhaseIndex + 1]).month} →`}
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
            {isTamil
              ? `இந்த பருவத்தில் ${activePhase.tasks.length} விவசாய பணிகள் உள்ளன. தேவையான மதிப்பீடுகளை நிரப்பி 'சேமித்து செல்க' பொத்தானை கிளிக் செய்யவும்.`
              : `This cultivation phase contains ${activePhase.tasks.length} operational tasks spanning ${activePhaseMeta.daySpan}. Fill required inputs and proceed to calculate your nutrient budget.`}
          </p>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <div className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">
              {isTamil ? 'பயிரிடும் பரப்பு' : 'Cultivation Parameters'}:
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
