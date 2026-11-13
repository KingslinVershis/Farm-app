'use client';

import React from 'react';
import { Switch, Input, Tooltip, message } from 'antd';
import type { ExpenseEntry, ExpenseTask, PhaseGroup, UserDetails } from '@/lib/fertilizer/types';
import {
  formatCurrency as fmt,
  computeRecommendedFertilizerBagRange,
  computeRecommendedFertilizerMix,
} from '@/lib/fertilizer/calc';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { DayStepper } from './DayStepper';

interface TaskRowRendererProps {
  task: ExpenseTask;
  phase: PhaseGroup;
  index: number;
  userDetails: UserDetails;
  entry: ExpenseEntry;
  meta: { name: string; dayRange: string; description: string; costEstimateHint: string };
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
  maxDaysOverride?: number;
}

export const TaskRowRenderer: React.FC<TaskRowRendererProps> = ({
  task,
  phase,
  index,
  userDetails,
  entry,
  meta,
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
  maxDaysOverride,
}) => {
  const { messages, locale } = useLanguage();
  const isTamil = locale === 'ta';
  const t = messages.fertilizer;
  const isSkipped = entry.isEnabled === false;

  const maxDays = maxDaysOverride ?? task.maxDays ?? 7;
  const activeDay = Math.min(maxDays, Math.max(1, entry.activeDay ?? 1));
  const dayEntries = entry.dayEntries || [];
  const currentDayEntry = dayEntries.find((d) => d.day === activeDay) || {
    day: activeDay,
    labourCount: 0,
    labourWage: 0,
    snackCost: 0,
    travelCost: 0,
  };
  const isCurrentDayMandatoryFilled =
    currentDayEntry.labourCount > 0 && currentDayEntry.labourWage > 0;
  const filledMultiDays = dayEntries.filter(
    (d) => d.day <= maxDays && (d.labourCount > 0 || d.labourWage > 0 || d.snackCost > 0 || d.travelCost > 0)
  );

  const requiredMark = !task.isOptional ? (
    <span className="text-red-500 dark:text-rose-400 font-black ml-0.5" aria-hidden="true">
      *
    </span>
  ) : null;

  // Title with Nursery Bed removed as requested: always Seed Cost & Travel Cost
  const taskDisplayName = task.id === 'p1_nursery'
    ? (t.step3.seedCostAndTravelCostTitle || (isTamil ? '2. விதை செலவு & பயணச் செலவு' : '2. Seed Cost & Travel Cost'))
    : meta.name.replace(/Nursery\s*Bed\s*&?\s*/gi, '');

  return (
    <tr
      className={`border-b border-border-subtle transition-colors hover:bg-surface/40 ${
        isSkipped ? 'opacity-60 bg-slate-950/40' : index % 2 === 0 ? 'bg-transparent' : 'bg-surface/10'
      }`}
    >
      {/* 1. Operation Name & Details */}
      <td className="py-4 px-6">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`font-bold ${isSkipped ? 'line-through text-text-muted' : 'text-text-main'}`}>
            {taskDisplayName}
            {requiredMark}
          </span>
          <span className="rounded bg-slate-200/90 dark:bg-white/10 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
            {meta.dayRange}
          </span>
          {task.isOptional && (
            <button
              type="button"
              onClick={() => handleToggleOptional(task.id)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition-all cursor-pointer shadow-xs ${
                entry.isEnabled !== false
                  ? 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25'
                  : 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              <span>{entry.isEnabled !== false ? '✓' : '✕'}</span>
              <span>{entry.isEnabled !== false ? (t.step3.included || 'Included') : (t.step3.skipped || 'Skipped (₹0)')}</span>
              <span className="text-[9px] opacity-80 font-normal">({t.step3.optionalBadge || 'Optional'})</span>
            </button>
          )}
          {task.allowMachineToggle && (
            <button
              type="button"
              onClick={() => handleToggleMachineMode(task.id, task.defaultMachineRate ?? 25)}
              className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition-all cursor-pointer shadow-xs ${
                entry.isMachineMode
                  ? 'border-cyan-300 bg-cyan-100 text-cyan-800 hover:bg-cyan-200 dark:border-cyan-500/50 dark:bg-cyan-500/20 dark:text-cyan-300 dark:hover:bg-cyan-500/30'
                  : 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30'
              }`}
            >
              <span>{entry.isMachineMode ? '🚜' : '👷'}</span>
              <span>
                {entry.isMachineMode
                  ? (t.step3.machineTransplant || 'Machine Way')
                  : (t.step3.manualTransplant || 'Manual Labour')}
              </span>
            </button>
          )}
          {task.isGunnyBags && (
            <button
              type="button"
              onClick={() => handleToggleBagType(task.id, task.defaultPlasticPrice ?? 20, task.defaultTraditionalPrice ?? 45)}
              className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold border transition-all cursor-pointer shadow-xs ${
                entry.isPlasticBag !== false
                  ? 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:border-emerald-500/50 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30'
                  : 'border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30'
              }`}
            >
              <span>{entry.isPlasticBag !== false ? '🛍️' : '🌾'}</span>
              <span>
                {entry.isPlasticBag !== false
                  ? (t.step3.modernPlasticBags || 'Modern Plastic Bags')
                  : (t.step3.traditionalJuteBags || 'Traditional Gunny Bags')}
              </span>
            </button>
          )}
          {task.id === 'p1_nursery' && (
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 shadow-xs">
              <span>{t.step3.tableHeaders.travelCost || 'Seed Travel Cost'}:</span>
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
          {task.id === 'p3_herbicide' && (
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border border-purple-300 bg-purple-100 text-purple-800 dark:border-purple-500/40 dark:bg-purple-500/15 dark:text-purple-300 shadow-xs">
              <span>🔔 {isTamil ? 'களைக்கொல்லி அறிவிப்பு' : 'Herbicide Alert'}:</span>
              <Switch
                size="small"
                checked={entry.herbicideNotify !== false}
                onChange={(checked) =>
                  handleToggleNotify?.(task.id, 'Herbicide_notify', checked)
                }
              />
            </div>
          )}
          {(task.id === 'p1_fert' || task.id === 'p2_tillering') && (
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300 shadow-xs">
              <span>🔔 {isTamil ? 'பூச்சிக்கொல்லி அறிவிப்பு' : 'Pesticide Alert'}:</span>
              <Switch
                size="small"
                checked={entry.pesticideNotify !== false}
                onChange={(checked) =>
                  handleToggleNotify?.(task.id, 'pesticide_notify', checked)
                }
              />
            </div>
          )}
          {(task.id === 'p3_fert_dose3' || task.id === 'p3_potash_sulphide') && (
            <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border border-teal-300 bg-teal-100 text-teal-800 dark:border-teal-500/40 dark:bg-teal-500/15 dark:text-teal-300 shadow-xs">
              <span>🔔 {isTamil ? 'உர அறிவிப்பு' : 'Fertilizer Alert'}:</span>
              <Switch
                size="small"
                checked={entry.fertilizerNotify !== false}
                onChange={(checked) =>
                  handleToggleNotify?.(task.id, 'fertilizer_notify', checked)
                }
              />
            </div>
          )}
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed line-clamp-2 max-w-xl">
          {meta.description}
        </p>
      </td>

      {/* 2. Benchmark */}
      <td className="py-4 px-4 text-xs">
        <span className="font-bold text-text-main">{meta.costEstimateHint}</span>
        {task.isMultiDayLabour && !entry.isMachineMode ? (
          <div className={`mt-2 ${isSkipped ? 'pointer-events-none opacity-50' : ''}`}>
            <DayStepper
              value={activeDay}
              min={1}
              max={maxDays}
              dayLabel={isTamil ? 'நாள்' : 'Day'}
              maxLabel={
                isTamil
                  ? `(${filledMultiDays.length}/${maxDays} நாள்)`
                  : `(${filledMultiDays.length}/${maxDays} days)`
              }
              disableNext={!isCurrentDayMandatoryFilled}
              nextDisabledReason={
                isTamil
                  ? `அடுத்த நாளுக்குச் செல்ல நாள் ${activeDay}-ன் கட்டாய விவரங்களை நிரப்பவும்`
                  : `Fill required fields for Day ${activeDay} to unlock Day ${activeDay + 1}`
              }
              onNextBlocked={() =>
                message.warning(
                  isTamil
                    ? `அடுத்த நாளுக்குச் செல்லும் முன் நாள் ${activeDay}-க்கான ஆட்கள் எண்ணிக்கை மற்றும் கூலியை நிரப்பவும்.`
                    : `Please fill Labour Count and Wage for Day ${activeDay} before moving to the next day.`
                )
              }
              onChange={(nextDay) => handleMultiDayChangeActiveDay?.(task.id, nextDay, maxDays)}
            />
          </div>
        ) : (
          <span className="block text-[11px] font-semibold text-text-secondary mt-0.5">
            {task.defaultDays} {messages.common.days}
          </span>
        )}
      </td>

      {/* 3. Input Controls */}
      <td className="py-4 px-4">
        {task.isFertilizerWithLabour ? (
          /* Fertilizer / Pesticide Quantity, Labour, Snacks & Travel Fields */
          (() => {
            const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
            const isPesticideDose = task.id === 'p1_fert' || task.id === 'p2_tillering';
            const isBagCountDose = task.id === 'p3_fert_dose3';
            const isPotashSulphide = task.id === 'p3_potash_sulphide';
            const bagRange = computeRecommendedFertilizerBagRange(cents);
            const fertMix = computeRecommendedFertilizerMix(cents);
            const enteredQty = Number(entry.fertQty) || 0;
            const splitHalfQty = Number((enteredQty / 2).toFixed(2));

            const qtyTooltipContent = isPesticideDose
              ? (isTamil
                  ? 'ஒரு கேனுக்கு 80 மி.லி பூச்சிக்கொல்லி அளவு'
                  : '80 ml pesticide dose per can')
              : isBagCountDose
                ? (
                  <div className="space-y-1 text-[11px]">
                    <div className="space-y-0.5">
                      <div>
                        {isTamil
                          ? `குறைந்தபட்சம்: ${bagRange.minBags} மூட்டை`
                          : `Minimum: ${bagRange.minBags} bags`}
                      </div>
                      <div>
                        {isTamil
                          ? `அதிகபட்சம்: ${bagRange.maxBags} மூட்டை`
                          : `Maximum: ${bagRange.maxBags} bags`}
                      </div>
                    </div>
                    <div className="border-t border-white/15 pt-1 space-y-0.5">
                      <div className="font-bold text-emerald-300">
                        {isTamil ? `பரிந்துரை அளவு (${cents} சென்ட்):` : `Suggested Mix (${cents} cents):`}
                      </div>
                      <div>{isTamil ? `யூரியா: ${fertMix.ureaKg} கிலோ` : `Urea: ${fertMix.ureaKg} kg`}</div>
                      <div>{isTamil ? `காம்ப்ளக்ஸ்: ${fertMix.complexKg} கிலோ` : `Complex: ${fertMix.complexKg} kg`}</div>
                      <div>{isTamil ? `பொட்டாஷ்: ${fertMix.potashKg} கிலோ` : `Potash: ${fertMix.potashKg} kg`}</div>
                      <div>{isTamil ? `டி.ஏ.பி (DAP): ${fertMix.dapKg} கிலோ` : `DAP: ${fertMix.dapKg} kg`}</div>
                      <div>{isTamil ? `வேப்பம் தூள்: ${fertMix.vembuPowderKg} கிலோ` : `Vembu Powder: ${fertMix.vembuPowderKg} kg`}</div>
                    </div>
                  </div>
                )
                : isPotashSulphide
                  ? (
                    <div className="space-y-0.5 text-[11px]">
                      <div>{isTamil ? `பொட்டாஷ்: ${splitHalfQty} கிலோ` : `Potash: ${splitHalfQty} kg`}</div>
                      <div>{isTamil ? `சல்பைட்: ${splitHalfQty} கிலோ` : `Sulphide: ${splitHalfQty} kg`}</div>
                    </div>
                  )
                  : null;

            const qtyLabelText = isPesticideDose
              ? (t.step3.tableHeaders.pesticideQty || (isTamil ? 'பூச்சிக்கொல்லி அளவு (லி)' : 'Pesticide Qty (L)'))
              : isBagCountDose
                ? (t.step3.tableHeaders.fertilizerBagCount || (isTamil ? 'மூட்டை எண்ணிக்கை' : 'Bag Count'))
                : (t.step3.tableHeaders.fertQty || 'Fert Qty');

            return (
              <div className="grid grid-cols-2 gap-2 max-w-sm">
                <div>
                  <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                    {qtyTooltipContent ? (
                      <Tooltip title={qtyTooltipContent} placement="top">
                        <span className="inline-flex items-center gap-1 cursor-help border-b border-dotted border-slate-400 dark:border-slate-500">
                          <span>
                            {qtyLabelText}
                            {requiredMark}
                          </span>
                          <span className="text-[10px] opacity-80">ⓘ</span>
                        </span>
                      </Tooltip>
                    ) : (
                      <>
                        {qtyLabelText}
                        {requiredMark}
                      </>
                    )}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    disabled={isSkipped}
                    value={entry.fertQty !== undefined && entry.fertQty !== 0 ? entry.fertQty : ''}
                    onChange={(e) =>
                      handleFertilizerWithLabourChange(
                        task.id,
                        parseFloat(e.target.value) || 0,
                        entry.fertPrice ?? 0,
                        entry.labourCount ?? 0,
                        entry.labourWage ?? 0,
                        entry.snackCost ?? 0,
                        entry.travelCost ?? 0
                      )
                    }
                    suffix={
                      isPesticideDose ? (
                        <span className="text-[10px] font-bold text-text-secondary">
                          {isTamil ? 'லி' : 'L'}
                        </span>
                      ) : isBagCountDose ? (
                        <span className="text-[10px] font-bold text-text-secondary">
                          {isTamil ? 'மூட்டை' : 'bags'}
                        </span>
                      ) : undefined
                    }
                    className="w-full rounded-lg text-xs font-bold text-text-main"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                    {t.step3.tableHeaders.fertPrice || 'Price (₹)'}
                    {requiredMark}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    disabled={isSkipped}
                    value={entry.fertPrice !== undefined && entry.fertPrice !== 0 ? entry.fertPrice : ''}
                    onChange={(e) =>
                      handleFertilizerWithLabourChange(
                        task.id,
                        entry.fertQty ?? 0,
                        parseFloat(e.target.value) || 0,
                        entry.labourCount ?? 0,
                        entry.labourWage ?? 0,
                        entry.snackCost ?? 0,
                        entry.travelCost ?? 0
                      )
                    }
                    className="w-full rounded-lg text-xs font-bold text-text-main"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                    {t.step3.tableHeaders.labourCount || 'Workers'}
                    {requiredMark}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    disabled={isSkipped}
                    value={entry.labourCount !== undefined && entry.labourCount !== 0 ? entry.labourCount : ''}
                    onChange={(e) =>
                      handleFertilizerWithLabourChange(
                        task.id,
                        entry.fertQty ?? 0,
                        entry.fertPrice ?? 0,
                        parseFloat(e.target.value) || 0,
                        entry.labourWage ?? 0,
                        entry.snackCost ?? 0,
                        entry.travelCost ?? 0
                      )
                    }
                    className="w-full rounded-lg text-xs font-bold text-text-main"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                    {t.step3.tableHeaders.labourWage || 'Wage (₹)'}
                    {requiredMark}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    disabled={isSkipped}
                    value={entry.labourWage !== undefined && entry.labourWage !== 0 ? entry.labourWage : ''}
                    onChange={(e) =>
                      handleFertilizerWithLabourChange(
                        task.id,
                        entry.fertQty ?? 0,
                        entry.fertPrice ?? 0,
                        entry.labourCount ?? 0,
                        parseFloat(e.target.value) || 0,
                        entry.snackCost ?? 0,
                        entry.travelCost ?? 0
                      )
                    }
                    className="w-full rounded-lg text-xs font-bold text-text-main"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                    {t.step3.tableHeaders.snackCost}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    disabled={isSkipped}
                    value={entry.snackCost !== undefined && entry.snackCost !== 0 ? entry.snackCost : ''}
                    onChange={(e) =>
                      handleFertilizerWithLabourChange(
                        task.id,
                        entry.fertQty ?? 0,
                        entry.fertPrice ?? 0,
                        entry.labourCount ?? 0,
                        entry.labourWage ?? 0,
                        parseFloat(e.target.value) || 0,
                        entry.travelCost ?? 0
                      )
                    }
                    className="w-full rounded-lg text-xs font-bold text-text-main"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                    {t.step3.tableHeaders.travelCost}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    disabled={isSkipped}
                    value={entry.travelCost !== undefined && entry.travelCost !== 0 ? entry.travelCost : ''}
                    onChange={(e) =>
                      handleFertilizerWithLabourChange(
                        task.id,
                        entry.fertQty ?? 0,
                        entry.fertPrice ?? 0,
                        entry.labourCount ?? 0,
                        entry.labourWage ?? 0,
                        entry.snackCost ?? 0,
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full rounded-lg text-xs font-bold text-text-main"
                  />
                </div>
              </div>
            );
          })()
        ) : task.isMultiDayLabour && !entry.isMachineMode ? (
          /* Day-Wise Labour Fields (Day 1 to maxDays controlled via DayStepper in Estimation column) */
          <div className="grid grid-cols-2 gap-2 max-w-sm">
              {(
                [
                  {
                    key: 'labourCount',
                    label: t.step3.tableHeaders.labourCount,
                    val: currentDayEntry.labourCount,
                    required: true,
                  },
                  {
                    key: 'labourWage',
                    label: t.step3.tableHeaders.labourWage,
                    val: currentDayEntry.labourWage,
                    required: true,
                  },
                  ...(task.hasSnacks
                    ? [
                        {
                          key: 'snackCost' as const,
                          label: t.step3.tableHeaders.snackCost,
                          val: currentDayEntry.snackCost,
                          required: false,
                        },
                      ]
                    : []),
                  ...(task.hasTravel
                    ? [
                        {
                          key: 'travelCost' as const,
                          label: t.step3.tableHeaders.travelCost,
                          val: currentDayEntry.travelCost,
                          required: false,
                        },
                      ]
                    : []),
                ] as const
              ).map((field) => (
                <div key={field.key}>
                  <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                    {field.label}
                    {field.required && requiredMark}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    disabled={isSkipped}
                    value={field.val !== undefined && field.val !== 0 ? field.val : ''}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value) || 0;
                      handleMultiDayLabourChange?.(
                        task.id,
                        activeDay,
                        field.key === 'labourCount' ? num : currentDayEntry.labourCount,
                        field.key === 'labourWage' ? num : currentDayEntry.labourWage,
                        field.key === 'snackCost' ? num : currentDayEntry.snackCost,
                        field.key === 'travelCost' ? num : currentDayEntry.travelCost,
                        maxDays
                      );
                    }}
                    className="w-full rounded-lg text-xs font-bold text-text-main"
                  />
                </div>
              ))}
          </div>
        ) : task.isLabour && !entry.isMachineMode ? (
          /* Labour Fields (Workers, Wage, Snacks, Travel) */
          <div className="grid grid-cols-2 gap-2 max-w-sm">
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.labourCount}
                {requiredMark}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                disabled={isSkipped}
                value={entry.labourCount !== undefined && entry.labourCount !== 0 ? entry.labourCount : ''}
                onChange={(e) =>
                  handleLabourChange(
                    task.id,
                    parseFloat(e.target.value) || 0,
                    entry.labourWage ?? 0,
                    entry.snackCost,
                    entry.travelCost
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.labourWage}
                {requiredMark}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                disabled={isSkipped}
                value={entry.labourWage !== undefined && entry.labourWage !== 0 ? entry.labourWage : ''}
                onChange={(e) =>
                  handleLabourChange(
                    task.id,
                    entry.labourCount ?? 0,
                    parseFloat(e.target.value) || 0,
                    entry.snackCost,
                    entry.travelCost
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            {task.hasSnacks && (
              <div>
                <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                  {t.step3.tableHeaders.snackCost}
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={isSkipped}
                  value={entry.snackCost !== undefined && entry.snackCost !== 0 ? entry.snackCost : ''}
                  onChange={(e) =>
                    handleLabourChange(
                      task.id,
                      entry.labourCount ?? 0,
                      entry.labourWage ?? 0,
                      parseFloat(e.target.value) || 0,
                      entry.travelCost
                    )
                  }
                  className="w-full rounded-lg text-xs font-bold text-text-main"
                />
              </div>
            )}
            {task.hasTravel && (
              <div>
                <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                  {t.step3.tableHeaders.travelCost}
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={isSkipped}
                  value={entry.travelCost !== undefined && entry.travelCost !== 0 ? entry.travelCost : ''}
                  onChange={(e) =>
                    handleLabourChange(
                      task.id,
                      entry.labourCount ?? 0,
                      entry.labourWage ?? 0,
                      entry.snackCost,
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full rounded-lg text-xs font-bold text-text-main"
                />
              </div>
            )}
          </div>
        ) : task.isGunnyBags ? (
          /* Gunny Bags (Count, Price) */
          <div className="grid grid-cols-2 gap-2 max-w-xs">
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.bagCount}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.bagCount !== undefined && entry.bagCount !== 0 ? entry.bagCount : ''}
                onChange={(e) =>
                  handleGunnyBagsChange(
                    task.id,
                    parseFloat(e.target.value) || 0,
                    entry.bagPrice ?? 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.bagPrice}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.bagPrice !== undefined && entry.bagPrice !== 0 ? entry.bagPrice : ''}
                onChange={(e) =>
                  handleGunnyBagsChange(
                    task.id,
                    entry.bagCount ?? 0,
                    parseFloat(e.target.value) || 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
          </div>
        ) : task.isTransportLoading ? (
          /* Transport & Mandi Logistics */
          <div className="grid grid-cols-2 gap-2 max-w-sm">
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.transportRent}
                {requiredMark}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.transportRent !== undefined && entry.transportRent !== 0 ? entry.transportRent : ''}
                onChange={(e) =>
                  handleTransportLoadingChange(
                    task.id,
                    parseFloat(e.target.value) || 0,
                    entry.loadingWorkers ?? 0,
                    entry.loadingWage ?? 0,
                    entry.loadingSnacks ?? 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.loadingWorkers}
                {requiredMark}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.loadingWorkers !== undefined && entry.loadingWorkers !== 0 ? entry.loadingWorkers : ''}
                onChange={(e) =>
                  handleTransportLoadingChange(
                    task.id,
                    entry.transportRent ?? 0,
                    parseFloat(e.target.value) || 0,
                    entry.loadingWage ?? 0,
                    entry.loadingSnacks ?? 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.loadingWage}
                {requiredMark}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.loadingWage !== undefined && entry.loadingWage !== 0 ? entry.loadingWage : ''}
                onChange={(e) =>
                  handleTransportLoadingChange(
                    task.id,
                    entry.transportRent ?? 0,
                    entry.loadingWorkers ?? 0,
                    parseFloat(e.target.value) || 0,
                    entry.loadingSnacks ?? 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.snackCost}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.loadingSnacks !== undefined && entry.loadingSnacks !== 0 ? entry.loadingSnacks : ''}
                onChange={(e) =>
                  handleTransportLoadingChange(
                    task.id,
                    entry.transportRent ?? 0,
                    entry.loadingWorkers ?? 0,
                    entry.loadingWage ?? 0,
                    parseFloat(e.target.value) || 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
          </div>
        ) : task.isGrainYield ? (
          /* Grain Yield (Always 3 editable fields in KG + 1 disabled calculated Bags field) */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-lg">
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.yieldKg || 'Total Yield (KG)'}
                {requiredMark}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={
                  entry.yieldKg !== undefined && entry.yieldKg !== 0
                    ? entry.yieldKg
                    : (entry.yieldTons ? entry.yieldTons * 1000 : '')
                }
                onChange={(e) => {
                  const kg = parseFloat(e.target.value) || 0;
                  handleGrainYieldChange(task.id, {
                    yieldKg: kg,
                    bagWeightKg: entry.bagWeightKg ?? 0,
                    bagPrice: entry.grainBagPrice ?? 0,
                  });
                }}
                className="w-full rounded-lg text-xs font-bold text-emerald-400"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.bagWeightKg || 'Bag Weight (KG)'}
                {requiredMark}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.bagWeightKg !== undefined && entry.bagWeightKg !== 0 ? entry.bagWeightKg : ''}
                onChange={(e) => {
                  const bw = parseFloat(e.target.value) || 0;
                  handleGrainYieldChange(task.id, {
                    yieldKg: entry.yieldKg ?? ((entry.yieldTons ?? 0) * 1000),
                    bagWeightKg: bw,
                    bagPrice: entry.grainBagPrice ?? 0,
                  });
                }}
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.grainPrice || 'Price / Bag (₹)'}
                {requiredMark}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.grainBagPrice !== undefined && entry.grainBagPrice !== 0 ? entry.grainBagPrice : ''}
                onChange={(e) => {
                  const price = parseFloat(e.target.value) || 0;
                  handleGrainYieldChange(task.id, {
                    yieldKg: entry.yieldKg ?? ((entry.yieldTons ?? 0) * 1000),
                    bagWeightKg: entry.bagWeightKg ?? 0,
                    bagPrice: price,
                  });
                }}
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            <div>
              <label className="text-[10px] text-cyan-400 block font-semibold mb-0.5">
                {t.step3.tableHeaders.bagCount || 'Total Bags (Est.)'}
              </label>
              <Input
                type="text"
                disabled
                value={`${entry.grainBagCount ?? 0} ${t.step3.bagsUnit || 'bags'}`}
                className="w-full rounded-lg bg-surface/80 border border-cyan-500/30 text-xs font-black text-cyan-300 cursor-not-allowed select-none"
              />
            </div>
          </div>
        ) : task.isStrawYield ? (
          /* Straw Yield (Sacks, Price) */
          <div className="grid grid-cols-2 gap-2 max-w-xs">
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.strawSacks}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.strawSackCount !== undefined && entry.strawSackCount !== 0 ? entry.strawSackCount : ''}
                onChange={(e) =>
                  handleStrawYieldChange(
                    task.id,
                    parseFloat(e.target.value) || 0,
                    entry.strawPrice ?? 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.strawPrice}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.strawPrice !== undefined && entry.strawPrice !== 0 ? entry.strawPrice : ''}
                onChange={(e) =>
                  handleStrawYieldChange(
                    task.id,
                    entry.strawSackCount ?? 0,
                    parseFloat(e.target.value) || 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
          </div>
        ) : task.isMandiTrip ? (
          /* Mandi Trips */
          <div className="grid grid-cols-2 gap-2 max-w-xs">
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.mandiLoads}
                {requiredMark}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.mandiCount !== undefined && entry.mandiCount !== 0 ? entry.mandiCount : ''}
                onChange={(e) =>
                  handleMandiChange(
                    task.id,
                    parseFloat(e.target.value) || 0,
                    entry.mandiRate ?? 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.mandiRate}
                {requiredMark}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.mandiRate !== undefined && entry.mandiRate !== 0 ? entry.mandiRate : ''}
                onChange={(e) =>
                  handleMandiChange(
                    task.id,
                    entry.mandiCount ?? 0,
                    parseFloat(e.target.value) || 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
          </div>
        ) : task.id === 'p1_nursery' ? (
          /* Seed Cost with Optional Travel Cost Switch */
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-36 max-w-[160px]">
              <Input
                type="number"
                min="0"
                placeholder="0"
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
                suffix={<span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">₹</span>}
                className={`w-full rounded-lg text-xs font-bold text-text-main outline-none transition-all ${
                  isSkipped ? 'bg-slate-900/50 cursor-not-allowed opacity-50' : 'focus:border-emerald-500'
                }`}
              />
            </div>

            {/* When isTravelCost is enabled show the travel cost field; if false do not show */}
            {entry.hasTravelCost !== false && (
              <div className="relative w-36 max-w-[160px]">
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
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
                  suffix={
                    <span className="text-[10px] font-bold text-amber-300/80">
                      ₹ {t.step3.tableHeaders?.travelCost || 'Travel'}
                    </span>
                  }
                  className="w-full rounded-lg text-xs font-bold text-amber-300 border-amber-500/40 outline-none"
                />
              </div>
            )}
          </div>
        ) : (
          /* Standard Rate per Cent Input */
          <div className="relative max-w-[170px]">
            <Input
              type="number"
              min="0"
              placeholder="0"
              disabled={isSkipped}
              value={entry.ratePerCent !== undefined && entry.ratePerCent !== 0 ? entry.ratePerCent : ''}
              onChange={(e) => handleRateChange(task.id, parseFloat(e.target.value) || 0)}
              suffix={
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                  ₹
                </span>
              }
              className={`w-full rounded-lg text-xs font-bold text-text-main outline-none transition-all ${
                isSkipped ? 'bg-slate-900/50 cursor-not-allowed opacity-50' : 'focus:border-emerald-500'
              }`}
            />
          </div>
        )}
      </td>

      {/* 4. Total Output Realization */}
      <td className="py-4 px-6 text-right">
        {isSkipped ? (
          <div>
            <div className="text-base font-bold text-slate-400 dark:text-slate-500 line-through">₹0</div>
            <div className="text-[11px] text-amber-500 dark:text-amber-400 font-semibold">{t.step3.skipped || 'Skipped (₹0)'}</div>
          </div>
        ) : task.isFertilizerWithLabour ? (
          <div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-300">
              ₹{fmt(entry.totalCost)}
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <span>{t.step3.tableHeaders.fertMaterial || 'Fert'}: ₹{fmt((entry.fertQty ?? 0) * (entry.fertPrice ?? 0))}</span>
              <span className="mx-1">•</span>
              <span>{t.step3.tableHeaders.fertLabour || 'Labour'}: ₹{fmt((entry.labourCount ?? 0) * (entry.labourWage ?? 0))}</span>
              {((entry.snackCost ?? 0) > 0 || (entry.travelCost ?? 0) > 0) && (
                <span className="block text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                  {(entry.snackCost ?? 0) > 0 && `+ ₹${fmt(entry.snackCost ?? 0)} snacks `}
                  {(entry.travelCost ?? 0) > 0 && `+ ₹${fmt(entry.travelCost ?? 0)} travel`}
                </span>
              )}
            </div>
          </div>
        ) : task.isMultiDayLabour && !entry.isMachineMode ? (
          <div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-300">
              ₹{fmt(entry.totalCost)}
            </div>
          </div>
        ) : task.isLabour && !entry.isMachineMode ? (
          <div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-300">
              ₹{fmt(entry.totalCost)}
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <span>{entry.labourCount ?? 0} × ₹{fmt(entry.labourWage ?? 0)}</span>
              {(entry.snackCost ?? 0) > 0 && <span> + ₹{fmt(entry.snackCost ?? 0)}</span>}
              {(entry.travelCost ?? 0) > 0 && <span> + ₹{fmt(entry.travelCost ?? 0)}</span>}
            </div>
          </div>
        ) : task.isGunnyBags ? (
          <div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-300">
              ₹{fmt(entry.totalCost)}
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <span>{entry.bagCount ?? 0} bags × ₹{fmt(entry.bagPrice ?? 0)}</span>
            </div>
          </div>
        ) : task.isTransportLoading ? (
          <div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-300">
              ₹{fmt(entry.totalCost)}
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <span>Rent ₹{fmt(entry.transportRent ?? 0)}</span>
              <span> + Load ₹{fmt((entry.loadingWorkers ?? 0) * (entry.loadingWage ?? 0))}</span>
              {(entry.loadingSnacks ?? 0) > 0 && <span> + ₹{fmt(entry.loadingSnacks ?? 0)}</span>}
            </div>
          </div>
        ) : task.isGrainYield ? (
          <div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
              ₹{fmt(entry.totalCost)}
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                {entry.grainBagCount ?? 0} {t.step3.centsUnit === 'சென்ட்' ? 'மூட்டை' : 'bags'}
              </span>
              <span className="block text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                ({fmt(entry.yieldKg ?? ((entry.yieldTons ?? 0) * 1000))} KG ÷ {entry.bagWeightKg ?? 0}kg) × ₹{fmt(entry.grainBagPrice ?? 0)}
              </span>
            </div>
          </div>
        ) : task.isStrawYield ? (
          <div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              ₹{fmt(entry.totalCost)}
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <span className="font-semibold text-amber-700 dark:text-amber-300">{entry.strawSackCount ?? 0} sacks</span>
              <span> × ₹{fmt(entry.strawPrice ?? 0)}</span>
            </div>
          </div>
        ) : task.id === 'p1_nursery' ? (
          <div>
            <div
              className={`text-base font-extrabold ${
                isSkipped
                  ? 'text-slate-400 dark:text-slate-500 line-through'
                  : 'text-emerald-600 dark:text-emerald-300'
              }`}
            >
              ₹{isSkipped ? 0 : fmt(entry.totalCost)}
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              {isSkipped ? (
                <span className="text-slate-500 font-semibold">{t.step3.skipped || 'Skipped (₹0)'}</span>
              ) : (
                <>
                  <span>{isTamil ? 'விதை' : 'Seed'}: ₹{fmt(entry.ratePerCent)}</span>
                  {entry.hasTravelCost !== false && (entry.travelCost ?? 0) > 0 && (
                    <span className="text-amber-600 dark:text-amber-300"> + ₹{fmt(entry.travelCost ?? 0)} travel</span>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div
              className={`text-base font-extrabold ${
                isSkipped
                  ? 'text-slate-400 dark:text-slate-500 line-through'
                  : phase.isProfitPhase
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-emerald-600 dark:text-emerald-300'
              }`}
            >
              ₹{isSkipped ? 0 : fmt(entry.totalCost)}
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              {isSkipped ? (
                <span className="text-slate-500 font-semibold">{t.step3.skipped || 'Skipped (₹0)'}</span>
              ) : (
                <span>
                  {isTamil ? 'நேரடி தொகை' : 'Total Cost'}: ₹{fmt(entry.ratePerCent)}
                </span>
              )}
            </div>
          </div>
        )}
      </td>
    </tr>
  );
};
