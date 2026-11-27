'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Dropdown, Select } from 'antd';
import ParticleChart from '@/components/reactbits/ParticleChart';
import PlanSummaryReflectiveCard, { CheckmarkBadgeIcon, FingerPrintIcon } from '@/components/reactbits/PlanSummaryReflectiveCard';
import { DropletsIcon, SproutIcon, TractorIcon } from '@/components/icons/Icons';
import AnimatedContent from '@/components/reactbits/AnimatedContent';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { formatCurrency as fmt, computeDailyLabourCost } from '@/lib/fertilizer/calc';
import {
  printDossierAsPdf,
  printSimplePhaseSummaryPdf,
  downloadSimplePhaseSummaryFile,
  downloadSimplePhaseSummaryCsv,
} from '@/lib/fertilizer/printDossier';
import type {
  CultivationType,
  ExpenseEntry,
  ExpenseTask,
  PhaseGroup,
  SavedPlanRecord,
  UserDetails,
} from '@/lib/fertilizer/types';

const CheckCircleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const MapPinIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const SparkleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
  </svg>
);

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
  onEditPhase?: (phaseIdx: number) => void;
  onBackToPhase5?: () => void;
  onOpenSavedRecords?: () => void;
  onCreateNewRecord?: () => void;
}

function getWorkBreakdownDetails(
  task: ExpenseTask,
  entry: ExpenseEntry | undefined,
  t4: any
): Array<{ label: string; value: string; subtext?: string; icon?: string }> {
  if (!entry) return [];
  const lines: Array<{ label: string; value: string; subtext?: string; icon?: string }> = [];

  const isBagTask = task.id === 'p3_fert_dose3' || task.id === 'p2_fert_labour';
  const isPesticide = task.id === 'p1_fert' || task.id === 'p2_tillering';

  if (task.isGunnyBags) {
    const isPlastic = entry.isPlasticBag !== false;
    const bagType = isPlastic ? t4.plasticBags : t4.gunnyBags;
    const bCount = entry.bagCount ?? 0;
    const bPrice = entry.bagPrice ?? (isPlastic ? 20 : 45);
    lines.push({
      icon: '🛍️',
      label: bagType,
      value: `₹${fmt(entry.totalCost || bCount * bPrice)}`,
      subtext: `${bCount} ${t4.bags} × ₹${fmt(bPrice)}`,
    });
  } else if (task.isTransportLoading) {
    if ((entry.transportRent ?? 0) > 0) {
      lines.push({
        icon: '🚚',
        label: t4.transportRent,
        value: `₹${fmt(entry.transportRent ?? 0)}`,
      });
    }
    const loadW = entry.loadingWorkers ?? 0;
    const loadWage = entry.loadingWage ?? 0;
    if (loadW > 0 || loadWage > 0) {
      lines.push({
        icon: '📦',
        label: t4.loadingLabour,
        value: `₹${fmt(loadW * loadWage)}`,
        subtext: `${loadW} ${t4.workers} × ₹${fmt(loadWage)}`,
      });
    }
    if ((entry.loadingSnacks ?? 0) > 0) {
      lines.push({
        icon: '☕',
        label: t4.snacks,
        value: `₹${fmt(entry.loadingSnacks ?? 0)}`,
      });
    }
    if (lines.length === 0 && (entry.totalCost || entry.ratePerCent)) {
      lines.push({
        icon: '🚚',
        label: t4.transport,
        value: `₹${fmt(entry.totalCost || entry.ratePerCent)}`,
      });
    }
  } else if (task.isGrainYield) {
    if (entry.yieldMode !== 'bags') {
      lines.push({
        icon: '🌾',
        label: t4.yieldTons,
        value: `${entry.yieldTons ?? 0} T`,
        subtext: `${entry.bagWeightKg ?? 50} kg/${t4.bag}`,
      });
    }
    lines.push({
      icon: '💰',
      label: t4.grainSales,
      value: `₹${fmt(entry.totalCost || (entry.grainBagCount ?? 0) * (entry.grainBagPrice ?? 0))}`,
      subtext: `${entry.grainBagCount ?? 0} ${t4.bags} × ₹${fmt(entry.grainBagPrice ?? 0)}`,
    });
  } else if (task.isStrawYield) {
    lines.push({
      icon: '🌾',
      label: t4.strawSales,
      value: `₹${fmt(entry.totalCost || (entry.strawSackCount ?? 0) * (entry.strawPrice ?? 0))}`,
      subtext: `${entry.strawSackCount ?? 0} ${t4.sacks} × ₹${fmt(entry.strawPrice ?? 0)}`,
    });
  } else if (task.isMandiTrip) {
    lines.push({
      icon: '🏪',
      label: t4.mandiTrips,
      value: `₹${fmt(entry.totalCost || (entry.mandiCount ?? 0) * (entry.mandiRate ?? 0))}`,
      subtext: `${entry.mandiCount ?? 0} ${t4.trips} × ₹${fmt(entry.mandiRate ?? 0)}`,
    });
  } else if (task.isFertilizerWithLabour) {
    if (isBagTask) {
      lines.push({
        icon: '🌱',
        label: t4.fertilizer,
        value: `₹${fmt((entry.fertQty ?? 0) * (entry.fertPrice ?? 0))}`,
        subtext: `${entry.fertQty ?? 0} ${t4.bag} × ₹${fmt(entry.fertPrice ?? 0)}`,
      });
    } else if (isPesticide) {
      lines.push({
        icon: '🧪',
        label: t4.pesticide,
        value: `₹${fmt((entry.fertQty ?? 0) * (entry.fertPrice ?? 0))}`,
        subtext: `${entry.fertQty ?? 0} L × ₹${fmt(entry.fertPrice ?? 0)}`,
      });
    } else {
      lines.push({
        icon: '🌱',
        label: t4.material,
        value: `₹${fmt((entry.fertQty ?? 0) * (entry.fertPrice ?? 0))}`,
        subtext: `${entry.fertQty ?? 0} × ₹${fmt(entry.fertPrice ?? 0)}`,
      });
    }

    if (task.isMultiDayLabour && !entry.isMachineMode) {
      const activeDays = (entry.dayEntries || []).filter(
        (d) => d.labourCount > 0 || d.labourWage > 0 || d.snackCost > 0 || d.travelCost > 0
      );
      if (activeDays.length > 0) {
        activeDays.forEach((d) => {
          const dayCost = computeDailyLabourCost(d);
          const extras: string[] = [];
          if (d.snackCost > 0) extras.push(`+ ₹${fmt(d.snackCost)} ${t4.snacks}`);
          if (d.travelCost > 0) extras.push(`+ ₹${fmt(d.travelCost)} ${t4.travel}`);
          const mathParts = [`${d.labourCount} ${t4.workers} × ₹${fmt(d.labourWage)}`];
          if (extras.length > 0) mathParts.push(extras.join(' '));
          lines.push({
            icon: '👷',
            label: `${t4.day} ${d.day}`,
            value: `₹${fmt(dayCost)}`,
            subtext: mathParts.join(' '),
          });
        });
      }
    } else {
      const lCount = entry.labourCount ?? 0;
      const lWage = entry.labourWage ?? 0;
      if (lCount > 0 || lWage > 0) {
        lines.push({
          icon: '👷',
          label: t4.labour,
          value: `₹${fmt(lCount * lWage)}`,
          subtext: `${lCount} ${t4.workers} × ₹${fmt(lWage)}`,
        });
      }
      if ((entry.snackCost ?? 0) > 0) {
        lines.push({
          icon: '☕',
          label: t4.snacks,
          value: `₹${fmt(entry.snackCost ?? 0)}`,
        });
      }
      if ((entry.travelCost ?? 0) > 0) {
        lines.push({
          icon: '🚗',
          label: t4.travel,
          value: `₹${fmt(entry.travelCost ?? 0)}`,
        });
      }
    }
  } else if (task.id === 'p1_nursery') {
    lines.push({
      icon: '🌱',
      label: t4.seedsCost,
      value: `₹${fmt(entry.ratePerCent)}`,
    });
    if (entry.hasTravelCost !== false && (entry.travelCost ?? 0) > 0) {
      lines.push({
        icon: '🚗',
        label: t4.travel,
        value: `₹${fmt(entry.travelCost ?? 0)}`,
      });
    }
  } else if (task.id === 'p1_fuel') {
    lines.push({
      icon: '⛽',
      label: t4.fuel,
      value: `₹${fmt(entry.ratePerCent)}`,
    });
    if (entry.hasRepairCost && (entry.repairCost ?? 0) > 0) {
      lines.push({
        icon: '🔧',
        label: t4.repair,
        value: `₹${fmt(entry.repairCost ?? 0)}`,
        subtext: entry.mechanicName ? `(${entry.mechanicName})` : undefined,
      });
    }
  } else if (task.isMultiDayLabour && !entry.isMachineMode) {
    const activeDays = (entry.dayEntries || []).filter(
      (d) => d.labourCount > 0 || d.labourWage > 0 || d.snackCost > 0 || d.travelCost > 0
    );
    if (activeDays.length > 0) {
      activeDays.forEach((d) => {
        const dayCost = computeDailyLabourCost(d);
        const extras: string[] = [];
        if (d.snackCost > 0) extras.push(`+ ₹${fmt(d.snackCost)} ${t4.snacks}`);
        if (d.travelCost > 0) extras.push(`+ ₹${fmt(d.travelCost)} ${t4.travel}`);
        const mathParts = [`${d.labourCount} ${t4.workers} × ₹${fmt(d.labourWage)}`];
        if (extras.length > 0) mathParts.push(extras.join(' '));
        lines.push({
          icon: '👷',
          label: `${t4.day} ${d.day}`,
          value: `₹${fmt(dayCost)}`,
          subtext: mathParts.join(' '),
        });
      });
    }
  } else if (task.isLabour) {
    if (entry.isMachineMode) {
      lines.push({
        icon: '🚜',
        label: t4.machineHire,
        value: `₹${fmt(entry.ratePerCent)}`,
      });
    } else {
      const lCount = entry.labourCount ?? 0;
      const lWage = entry.labourWage ?? 0;
      if (lCount > 0 || lWage > 0) {
        lines.push({
          icon: '👷',
          label: t4.labour,
          value: `₹${fmt(lCount * lWage)}`,
          subtext: `${lCount} ${t4.workers} × ₹${fmt(lWage)}`,
        });
      }
      if ((entry.snackCost ?? 0) > 0) {
        lines.push({
          icon: '☕',
          label: t4.snacks,
          value: `₹${fmt(entry.snackCost ?? 0)}`,
        });
      }
      if ((entry.travelCost ?? 0) > 0) {
        lines.push({
          icon: '🚗',
          label: t4.travel,
          value: `₹${fmt(entry.travelCost ?? 0)}`,
        });
      }
    }
  } else if (entry.totalCost > 0) {
    lines.push({
      icon: '💵',
      label: t4.cost,
      value: `₹${fmt(entry.ratePerCent || entry.totalCost)}`,
    });
  }

  return lines;
}

const PhaseParticleBarChart: React.FC<{
  phase: PhaseGroup;
  tasks: ExpenseTask[];
  expenseMap: Record<string, ExpenseEntry>;
  getTaskMeta: (task: ExpenseTask) => { name: string; dayRange: string; description: string; costEstimateHint: string };
  isDark: boolean;
  t4: any;
  mounted: boolean;
}> = ({ phase, tasks, expenseMap, getTaskMeta, isDark, t4, mounted }) => {
  if (!mounted) {
    return (
      <div className="w-full h-72 rounded-xl bg-black/10 dark:bg-white/[0.02] animate-pulse flex items-center justify-center text-xs text-text-muted">
        {t4.loadingChart}
      </div>
    );
  }

  const chartData = tasks.map((task, idx) => {
    const tMeta = getTaskMeta(task);
    const entry = expenseMap[task.id];
    const isSkipped = task.isOptional && entry?.isEnabled === false;
    const cost = isSkipped ? 0 : (entry?.totalCost || 0);
    const workIndex = idx + 1;
    const breakdown = getWorkBreakdownDetails(task, entry, t4);

    return {
      label: String(workIndex),
      value: cost,
      fullName: tMeta.name,
      dayRange: tMeta.dayRange,
      breakdown,
      isSkipped,
      isProfit: phase.isProfitPhase,
      workIndex,
    };
  });

  return (
    <div className="w-full pt-28 sm:pt-32 pb-2">
      <ParticleChart
        data={chartData}
        accentColor={phase.color}
        theme={isDark ? "dark" : "light"}
        height={260}
        barWidth={Math.max(48, Math.min(84, Math.floor(580 / Math.max(1, tasks.length))))}
        grain={2.2}
        spacing={2.8}
        mound={0.6}
        pour="stream"
        arc={0.5}
        speed={1.1}
        gravity={1}
        prefix="₹"
        suffix=""
        decimals={0}
        summary={false}
        values={true}
        labels={true}
        track={true}
        baseline={true}
        surface={false}
        interactive={true}
        renderTooltip={(hoveredIdx) => {
          const d = chartData[hoveredIdx];
          if (!d) return null;
          return (
            <div className="w-full rounded-xl glass-panel p-3.5 shadow-2xl border border-slate-200/80 dark:border-white/20 text-xs space-y-2 backdrop-blur-xl pointer-events-none bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <span
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black text-white shrink-0 shadow-sm mt-0.5"
                    style={{ backgroundColor: phase.color }}
                  >
                    {d.workIndex}
                  </span>
                  <div className="font-extrabold text-slate-900 dark:text-white text-xs leading-snug break-words">
                    {d.fullName ? d.fullName.replace(/^\s*\d+\.\s*/, '') : ''}
                  </div>
                </div>
                {d.dayRange && (
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium bg-black/5 dark:bg-black/40 px-1.5 py-0.5 rounded border border-black/5 dark:border-white/5 whitespace-nowrap shrink-0">
                    {d.dayRange}
                  </span>
                )}
              </div>

              {d.isSkipped ? (
                <div className="text-amber-600 dark:text-amber-400 font-semibold text-xs py-1">
                  ⚠️ {t4.skippedZero}
                </div>
              ) : d.breakdown && d.breakdown.length > 0 ? (
                <div className="pt-2 pb-1 border-t border-slate-200 dark:border-white/10 space-y-1">
                  {d.breakdown.map((item: any, bIdx: number) => (
                    <div key={bIdx} className="py-0.5 border-b border-slate-200/50 dark:border-white/5 last:border-0">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-semibold shrink-0">
                          {item.icon && <span>{item.icon}</span>}
                          <span>{item.label}:</span>
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono text-right">
                          {item.value}
                        </span>
                      </div>
                      {item.subtext && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 pl-4 mt-0.5 leading-snug break-words font-medium">
                          {item.subtext}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
                <span className="text-slate-600 dark:text-slate-400 font-bold text-xs">
                  {d.isProfit ? t4.totalRevenue : t4.workCost}:
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                  {d.isSkipped ? '₹0' : `₹${fmt(d.value)}`}
                </span>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
};

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
  onEditPhase,
  onBackToPhase5,
  onOpenSavedRecords,
  onCreateNewRecord,
}) => {
  const router = useRouter();
  const { messages, locale } = useLanguage();
  const isTamil = locale === 'ta';
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = messages.fertilizer;
  const [activePhaseIdx, setActivePhaseIdx] = React.useState<number>(0);
  const [mounted, setMounted] = React.useState<boolean>(false);

  const currentPlan = savedPlans.find((p) => String(p.id) === String(activePlanId));
  const isPlanCompleted = currentPlan ? Boolean(currentPlan.isCompleted) : false;

  // Complete location information string
  const completeLocation = [
    userDetails.address,
    userDetails.village || userDetails.city,
    userDetails.taluk,
    userDetails.district,
    userDetails.state,
    userDetails.pincode ? `${t.step4.pincode} ${userDetails.pincode}` : '',
  ]
    .filter(Boolean)
    .filter((item, idx, arr) => arr.indexOf(item) === idx)
    .join(', ');

  const completeInfo = completeLocation || userDetails.location || userDetails.address || t.step4.defaultLocation;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleNavigateToPhase = (phaseIdx: number) => {
    if (onEditPhase) {
      onEditPhase(phaseIdx);
    } else {
      const targetUrl = activePlanId ? `/fertilizer/step3/${activePlanId}` : '/fertilizer/create/step3';
      router.push(targetUrl);
    }
  };

  const cultivationDisplay =
    cultivation.toLowerCase() === 'paddy'
      ? t.step4.paddyCultivation
      : cultivation.toLowerCase() === 'banana'
        ? t.step4.bananaCultivation
        : cultivation;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Dossier Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel rounded-2xl p-4 sm:p-6 shadow-2xl">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 dark:border-emerald-500/30">
              {t.step4.badge}
            </span>
            {activePlanId && (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${isPlanCompleted
                ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
                : 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-500/40'
                }`}>
                {isPlanCompleted ? t.step4.finalizedPlan : t.step4.storedPlan}
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
          {!isPlanCompleted && (
            <button
              type="button"
              onClick={() => handleNavigateToPhase(activePhaseIdx)}
              className="rounded-xl glass-surface px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>✏️</span>
              <span>{t.step4.editPlan}</span>
            </button>
          )}
          {onOpenSavedRecords && (
            <button
              type="button"
              onClick={onOpenSavedRecords}
              className="rounded-xl glass-surface px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <span>🗂️</span>
              <span>{t.step4.allSavedRecords}</span>
            </button>
          )}
          {/* Download Cost Summary (Simple Phase 1-5 design) */}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'pdf',
                  icon: <span className="text-sm">📄</span>,
                  label: (
                    <span className="font-semibold text-xs">
                      {t.step4.saveAsPdf}
                    </span>
                  ),
                  onClick: () =>
                    printSimplePhaseSummaryPdf({
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
                      isTamil,
                    }),
                },
                {
                  key: 'html',
                  icon: <span className="text-sm">🌐</span>,
                  label: (
                    <span className="font-semibold text-xs">
                      {t.step4.downloadHtml}
                    </span>
                  ),
                  onClick: () =>
                    downloadSimplePhaseSummaryFile({
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
                      isTamil,
                    }),
                },
                {
                  key: 'csv',
                  icon: <span className="text-sm">📊</span>,
                  label: (
                    <span className="font-semibold text-xs">
                      {t.step4.downloadCsv}
                    </span>
                  ),
                  onClick: () =>
                    downloadSimplePhaseSummaryCsv({
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
                      isTamil,
                    }),
                },
              ],
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <button
              type="button"
              className="rounded-xl glass-surface px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title={t.step4.downloadSummaryTooltip}
            >
              <span>📥</span>
              <span>{t.step4.downloadSummary}</span>
              <span className="text-[10px] opacity-60 ml-0.5">▾</span>
            </button>
          </Dropdown>

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
                isTamil,
              })
            }
            className="rounded-xl glass-surface px-3.5 py-2 text-xs font-bold text-text-main hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
          >
            🖨️ {messages.common.print}
          </button>
        </div>
      </div>

      {/* Saved Records Dropdown Selector */}
      {savedPlans.length > 0 && (
        <div className="rounded-xl glass-surface p-3.5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base">🗂️</span>
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              {t.step4.savedPlans} ({savedPlans.length}):
            </span>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Select
              value={activePlanId || (savedPlans[0]?.id ?? undefined)}
              onChange={(val) => onLoadPlan(val)}
              className="w-full sm:w-80 custom-antd-select"
              popupMatchSelectWidth={false}
              options={savedPlans.map((plan, idx) => ({
                value: plan.id,
                label: (
                  <div className="flex items-center justify-between gap-3 py-0.5 text-xs">
                    <span className="font-bold truncate">#{savedPlans.length - idx} {plan.userDetails.name || t.step4.plan}</span>
                    <span className="text-[10px] text-text-muted shrink-0 font-medium">{plan.userDetails.landSize} {t.step4.centsAbbr}</span>
                    <span className="font-extrabold text-emerald-500 shrink-0">₹{fmt(plan.totals.netProfit)}</span>
                  </div>
                ),
              }))}
            />
          </div>
        </div>
      )}

      {/* Dossier Meta + 3 High-Impact Reflective KPI Cards */}
      <AnimatedContent
        key={`dossier-kpis-${activePlanId || userDetails.name || 'default'}`}
        distance={120}
        direction="vertical"
        duration={1.4}
        ease="elastic.out(1, 0.55)"
        blur={0}
        stagger={0.08}
        threshold={0.1}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        {/* Card 1: Farmer & Plot Parameters Card */}
        <PlanSummaryReflectiveCard
          videoSrc="https://res.cloudinary.com/chk0va7a/video/upload/v1795760505/fertilizer.mp4"
          theme="dark"
          tint="#ffffff"
          metalness={0.9}
          roughness={0.3}
          blurStrength={6}
          shine={1}
          glare={0.5}
          warp={0.5}
          bevel={3}
          radius={20}
          enableTilt
          height="100%"
          className="min-h-[295px] shadow-xl"
        >
          <div className="h-full flex flex-col justify-between text-left select-none">
            {/* Header: Checkmark icon + two-line title on left, Location badge on right */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center text-white shrink-0">
                  <CheckCircleIcon size={12} />
                </span>
                <div className="leading-tight text-left">
                  <div className="text-[11px] font-bold text-white">
                    {t.step4.farmerPlot}
                  </div>
                  <div className="text-[11px] font-bold text-white">
                    {t.step4.parameters}
                  </div>
                </div>
              </div>
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold shadow-sm max-w-[210px] sm:max-w-[250px]"
                title={completeInfo}
              >
                <MapPinIcon size={11} className="shrink-0 text-emerald-400" />
                <span className="truncate">{completeInfo}</span>
              </div>
            </div>

            {/* DETAILS AT CENTER: Name, Crop Type, Key-Values */}
            <div className="my-auto py-2.5 space-y-2 text-left">
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {userDetails.name || t.step4.defaultFarmer}
                </h3>
                <p className="text-xs font-bold text-emerald-400 mt-0.5">
                  {cultivationDisplay} ({totalCropDays} {messages.common.days})
                </p>
              </div>

              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 font-medium">
                    {t.step4.totalArea}:
                  </span>
                  <span className="font-extrabold text-emerald-400">
                    {userDetails.landSize} {messages.common.cents}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-white/70 font-medium shrink-0 pt-0.5">
                    {t.step4.zone}:
                  </span>
                  <span className="font-semibold text-slate-200 text-right line-clamp-2" title={completeInfo}>
                    {completeInfo}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 font-medium">
                    {t.step4.pincode}
                  </span>
                  <span className="font-semibold text-slate-200 font-mono">
                    {userDetails.pincode || '627808'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer: MOBILE & Fingerprint tile */}
            <div className="plan-reflective-card__footer !pt-2">
              <div className="plan-reflective-card__id text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  {t.step4.mobile}
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  +91 {userDetails.phone || '1111111111'}
                </span>
              </div>
              <span className="plan-reflective-card__tile text-slate-300">
                <FingerPrintIcon size={20} />
              </span>
            </div>
          </div>
        </PlanSummaryReflectiveCard>

        {/* Card 2: Total Cultivation Outlay */}
        <PlanSummaryReflectiveCard
          videoSrc="https://res.cloudinary.com/chk0va7a/video/upload/v1795760505/fertilizer.mp4"
          theme="dark"
          tint="#f59e0b"
          metalness={0.9}
          roughness={0.3}
          blurStrength={6}
          shine={1}
          glare={0.5}
          warp={0.5}
          bevel={3}
          radius={20}
          enableTilt
          height="100%"
          className="min-h-[295px] shadow-xl"
        >
          <div className="h-full flex flex-col justify-between text-left select-none">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <SproutIcon size={18} className="text-amber-400 shrink-0" />
                <span className="text-xs font-bold leading-tight">
                  {t.step4.kpi1Title}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-[11px] font-bold shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
                {t.step4.costTag}
              </div>
            </div>

            {/* DETAILS AT CENTER */}
            <div className="my-auto py-2.5 space-y-1 text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                {t.step4.totalCultivationOutlay}
              </div>
              <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight my-1 drop-shadow-sm">
                ₹{fmt(grandTotal)}
              </div>
              <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
                {t.step4.kpi1Desc}
              </p>
            </div>

            {/* Footer */}
            <div className="plan-reflective-card__footer !pt-2">
              <div className="plan-reflective-card__id text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  {t.step4.costPerCent}
                </span>
                <span className="text-sm font-black text-white font-mono">
                  ₹{fmt(costPerCent)}
                </span>
              </div>
              <span className="plan-reflective-card__tile text-amber-400">
                <SproutIcon size={20} />
              </span>
            </div>
          </div>
        </PlanSummaryReflectiveCard>

        {/* Card 3: Gross Revenue Realization (Ph 5) */}
        <PlanSummaryReflectiveCard
          videoSrc="https://res.cloudinary.com/chk0va7a/video/upload/v1795760505/fertilizer.mp4"
          theme="dark"
          tint="#06b6d4"
          metalness={0.9}
          roughness={0.3}
          blurStrength={6}
          shine={1}
          glare={0.5}
          warp={0.5}
          bevel={3}
          radius={20}
          enableTilt
          height="100%"
          className="min-h-[295px] shadow-xl"
        >
          <div className="h-full flex flex-col justify-between text-left select-none">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <TractorIcon size={18} className="text-cyan-400 shrink-0" />
                <span className="text-xs font-bold leading-tight">
                  {t.step4.kpi2Title}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 text-[11px] font-bold shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                {t.step4.yieldTag}
              </div>
            </div>

            {/* DETAILS AT CENTER */}
            <div className="my-auto py-2.5 space-y-1 text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                {t.step4.grossRevenueRealization}
              </div>
              <div className="text-3xl sm:text-4xl font-black text-cyan-400 tracking-tight my-1 drop-shadow-sm">
                ₹{fmt(revenueTotal)}
              </div>
              <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
                {t.step4.kpi2Desc}
              </p>
            </div>

            {/* Footer */}
            <div className="plan-reflective-card__footer !pt-2">
              <div className="plan-reflective-card__id text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  {t.step4.revenuePerCent}
                </span>
                <span className="text-sm font-black text-white font-mono">
                  ₹{fmt(revenuePerCent)}
                </span>
              </div>
              <span className="plan-reflective-card__tile text-cyan-400">
                <TractorIcon size={20} />
              </span>
            </div>
          </div>
        </PlanSummaryReflectiveCard>

        {/* Card 4: Net Farm Profit & ROI */}
        <PlanSummaryReflectiveCard
          videoSrc="https://res.cloudinary.com/chk0va7a/video/upload/v1795760505/fertilizer.mp4"
          theme="dark"
          tint="#10b981"
          metalness={0.9}
          roughness={0.3}
          blurStrength={6}
          shine={1}
          glare={0.5}
          warp={0.5}
          bevel={3}
          radius={20}
          enableTilt
          height="100%"
          className="min-h-[295px] shadow-xl"
        >
          <div className="h-full flex flex-col justify-between text-left select-none">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white">
                <DropletsIcon size={18} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-bold leading-tight">
                  {t.step4.kpi3Title}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                {t.step4.returnTag}
              </div>
            </div>

            {/* DETAILS AT CENTER */}
            <div className="relative my-auto py-2.5 space-y-1 text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                {t.step4.netFarmProfitRoi}
              </div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight my-1 drop-shadow-sm">
                ₹{fmt(netProfit)}
              </div>
              <p className="text-xs text-white/70 leading-relaxed line-clamp-2 pr-7">
                {t.step4.kpi3Desc}
              </p>
              <span className="absolute right-0 bottom-1 text-emerald-300/40 pointer-events-none">
                <SparkleIcon size={30} />
              </span>
            </div>

            {/* Footer */}
            <div className="plan-reflective-card__footer !pt-2">
              <div className="plan-reflective-card__id text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  {t.step4.profitRatio}
                </span>
                <span className="text-sm font-black text-white font-mono">
                  {roiPercentage}%
                </span>
              </div>
              <span className="plan-reflective-card__tile text-emerald-400">
                <DropletsIcon size={20} />
              </span>
            </div>
          </div>
        </PlanSummaryReflectiveCard>
      </AnimatedContent>

      {/* Phase-wise Distribution Bar */}
      <div className="rounded-2xl glass-panel p-5 sm:p-6 shadow-2xl">
        <h3 className="font-display text-sm sm:text-base font-bold text-text-main mb-4 flex items-center justify-between">
          <span>{t.step4.distributionTitle}</span>
          <span className="text-xs font-normal text-text-muted">
            {currentPhases.length} {messages.common.phases}
          </span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {currentPhases.map((phase, idx) => {
            const pMeta = getPhaseMeta(phase);
            const pTot = phaseTotals[phase.id]?.total || 0;
            const pct = grandTotal > 0 ? ((pTot / grandTotal) * 100).toFixed(1) : '0';
            const isSelected = activePhaseIdx === idx;
            return (
              <button
                type="button"
                key={phase.id}
                onClick={() => setActivePhaseIdx(idx)}
                className={`rounded-xl border p-3 text-xs flex flex-col justify-between text-left transition-all cursor-pointer ${isSelected
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

      {/* Individual Phase Audit Breakdown — Always rendered as Simple Bar Chart */}
      {(() => {
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
                    {t.step4.phaseOf.replace('{current}', String(activePhaseIdx + 1)).replace('{total}', String(currentPhases.length))}
                  </span>
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-text-main">
                  {selectedPhaseMeta.name}
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {selectedPhaseMeta.daySpan} • {t.step4.auditSubtitle}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                {!isPlanCompleted && (
                  <button
                    type="button"
                    onClick={() => handleNavigateToPhase(activePhaseIdx)}
                    title={t.step4.editPhase}
                    className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <span>✏️</span>
                    <span className="hidden sm:inline">{t.step4.editPhase}</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={activePhaseIdx === 0}
                  onClick={() => setActivePhaseIdx((prev) => Math.max(0, prev - 1))}
                  title={t.step4.prevPhase}
                  className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold glass-surface border border-white/10 text-text-secondary hover:text-text-main hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>←</span>
                  <span className="hidden sm:inline">{t.step4.prevPhase}</span>
                </button>
                <button
                  type="button"
                  disabled={activePhaseIdx === currentPhases.length - 1}
                  onClick={() => setActivePhaseIdx((prev) => Math.min(currentPhases.length - 1, prev + 1))}
                  title={t.step4.nextPhase}
                  className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold glass-surface border border-white/10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                >
                  <span className="hidden sm:inline">{t.step4.nextPhase}</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            <PhaseParticleBarChart
              phase={selectedPhase}
              tasks={selectedPhase.tasks}
              expenseMap={expenseMap}
              getTaskMeta={getTaskMeta}
              isDark={isDark}
              t4={t.step4}
              mounted={mounted}
            />
          </div>
        );
      })()}
    </div >
  );
};
