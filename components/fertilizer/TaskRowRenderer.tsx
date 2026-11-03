'use client';

import React from 'react';
import { Switch, Input } from 'antd';
import type { ExpenseEntry, ExpenseTask, PhaseGroup, UserDetails } from '@/lib/fertilizer/types';
import { formatCurrency as fmt } from '@/lib/fertilizer/calc';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface TaskRowRendererProps {
  task: ExpenseTask;
  phase: PhaseGroup;
  index: number;
  userDetails: UserDetails;
  entry: ExpenseEntry;
  meta: { name: string; dayRange: string; description: string; costEstimateHint: string };
  handleRateChange: (taskId: string, rate: number, travelCost?: number, hasTravelCost?: boolean) => void;
  handleLabourChange: (taskId: string, count: number, wage: number, snacks?: number, travel?: number) => void;
  handleFertilizerWithLabourChange: (taskId: string, fertQty: number, fertPrice: number, labourCount: number, labourWage: number) => void;
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
}) => {
  const { messages, locale } = useLanguage();
  const isTamil = locale === 'ta';
  const t = messages.fertilizer;
  const isSkipped = entry.isEnabled === false;

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
                    entry.ratePerCent !== 0 ? entry.ratePerCent : task.defaultRate,
                    entry.travelCost && entry.travelCost > 0 ? entry.travelCost : 100,
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
        <span className="font-bold text-slate-800 dark:text-slate-200">{meta.costEstimateHint}</span>
        <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
          {task.defaultDays} {messages.common.days}
        </span>
      </td>

      {/* 3. Input Controls */}
      <td className="py-4 px-4">
        {task.isFertilizerWithLabour ? (
          /* Fertilizer Quantity & Labour Fields */
          <div className="grid grid-cols-2 gap-2 max-w-sm">
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.fertQty || 'Fert Qty'}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.fertQty !== undefined && entry.fertQty !== 0 ? entry.fertQty : ''}
                onChange={(e) =>
                  handleFertilizerWithLabourChange(
                    task.id,
                    parseFloat(e.target.value) || 0,
                    entry.fertPrice ?? 0,
                    entry.labourCount ?? 0,
                    entry.labourWage ?? 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.fertPrice || 'Price (₹)'}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.fertPrice !== undefined && entry.fertPrice !== 0 ? entry.fertPrice : ''}
                onChange={(e) =>
                  handleFertilizerWithLabourChange(
                    task.id,
                    entry.fertQty ?? 0,
                    parseFloat(e.target.value) || 0,
                    entry.labourCount ?? 0,
                    entry.labourWage ?? 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.labourCount || 'Workers'}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.labourCount !== undefined && entry.labourCount !== 0 ? entry.labourCount : ''}
                onChange={(e) =>
                  handleFertilizerWithLabourChange(
                    task.id,
                    entry.fertQty ?? 0,
                    entry.fertPrice ?? 0,
                    parseFloat(e.target.value) || 0,
                    entry.labourWage ?? 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.labourWage || 'Wage (₹)'}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.labourWage !== undefined && entry.labourWage !== 0 ? entry.labourWage : ''}
                onChange={(e) =>
                  handleFertilizerWithLabourChange(
                    task.id,
                    entry.fertQty ?? 0,
                    entry.fertPrice ?? 0,
                    entry.labourCount ?? 0,
                    parseFloat(e.target.value) || 0
                  )
                }
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
          </div>
        ) : task.isLabour && !entry.isMachineMode ? (
          /* Labour Fields (Workers, Wage, Snacks, Travel) */
          <div className="grid grid-cols-2 gap-2 max-w-sm">
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.labourCount}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
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
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
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
                    bagWeightKg: entry.bagWeightKg ?? 75,
                    bagPrice: entry.grainBagPrice ?? 1650,
                  });
                }}
                className="w-full rounded-lg text-xs font-bold text-emerald-400"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.bagWeightKg || 'Bag Weight (KG)'}
              </label>
              <Input
                type="number"
                min="1"
                placeholder="75"
                value={entry.bagWeightKg !== undefined && entry.bagWeightKg !== 0 ? entry.bagWeightKg : ''}
                onChange={(e) => {
                  const bw = parseFloat(e.target.value) || 75;
                  handleGrainYieldChange(task.id, {
                    yieldKg: entry.yieldKg ?? ((entry.yieldTons ?? 14) * 1000),
                    bagWeightKg: bw,
                    bagPrice: entry.grainBagPrice ?? 1650,
                  });
                }}
                className="w-full rounded-lg text-xs font-bold text-text-main"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-0.5">
                {t.step3.tableHeaders.grainPrice || 'Price / Bag (₹)'}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={entry.grainBagPrice !== undefined && entry.grainBagPrice !== 0 ? entry.grainBagPrice : ''}
                onChange={(e) => {
                  const price = parseFloat(e.target.value) || 0;
                  handleGrainYieldChange(task.id, {
                    yieldKg: entry.yieldKg ?? ((entry.yieldTons ?? 14) * 1000),
                    bagWeightKg: entry.bagWeightKg ?? 75,
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
                suffix={<span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">/{messages.common.cents}</span>}
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
                  {`/${messages.common.cents}`}
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
              <span>{t.step3.tableHeaders.fertMaterial || 'Fert'}: ₹{fmt((entry.fertQty ?? 50) * (entry.fertPrice ?? 25))}</span>
              <span className="mx-1">•</span>
              <span>{t.step3.tableHeaders.fertLabour || 'Labour'}: ₹{fmt((entry.labourCount ?? 2) * (entry.labourWage ?? 500))}</span>
              <span className="block text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                (~₹{fmt(entry.ratePerCent)}/{t.step3.centsUnit})
              </span>
            </div>
          </div>
        ) : task.isLabour && !entry.isMachineMode ? (
          <div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-300">
              ₹{fmt(entry.totalCost)}
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <span>{entry.labourCount ?? 4} × ₹{fmt(entry.labourWage ?? 500)}</span>
              {(entry.snackCost ?? 0) > 0 && <span> + ₹{fmt(entry.snackCost ?? 0)}</span>}
              {(entry.travelCost ?? 0) > 0 && <span> + ₹{fmt(entry.travelCost ?? 0)}</span>}
              <span className="block text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                (~₹{fmt(entry.ratePerCent)}/{t.step3.centsUnit})
              </span>
            </div>
          </div>
        ) : task.isGunnyBags ? (
          <div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-300">
              ₹{fmt(entry.totalCost)}
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <span>{entry.bagCount ?? 120} bags × ₹{fmt(entry.bagPrice ?? 20)}</span>
              <span className="block text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                (~₹{fmt(entry.ratePerCent)}/{t.step3.centsUnit})
              </span>
            </div>
          </div>
        ) : task.isTransportLoading ? (
          <div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-300">
              ₹{fmt(entry.totalCost)}
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <span>Rent ₹{fmt(entry.transportRent ?? 1500)}</span>
              <span> + Load ₹{fmt((entry.loadingWorkers ?? 4) * (entry.loadingWage ?? 350))}</span>
              {(entry.loadingSnacks ?? 0) > 0 && <span> + ₹{fmt(entry.loadingSnacks ?? 0)}</span>}
              <span className="block text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                (~₹{fmt(entry.ratePerCent)}/{t.step3.centsUnit})
              </span>
            </div>
          </div>
        ) : task.isGrainYield ? (
          <div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
              ₹{fmt(entry.totalCost)}
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                {entry.grainBagCount ?? 140} {t.step3.centsUnit === 'சென்ட்' ? 'மூட்டை' : 'bags'}
              </span>
              <span className="block text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                ({fmt(entry.yieldKg ?? ((entry.yieldTons ?? 14) * 1000))} KG ÷ {entry.bagWeightKg ?? 75}kg) × ₹{fmt(entry.grainBagPrice ?? 1650)}
              </span>
            </div>
          </div>
        ) : task.isStrawYield ? (
          <div>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              ₹{fmt(entry.totalCost)}
            </div>
            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <span className="font-semibold text-amber-700 dark:text-amber-300">{entry.strawSackCount ?? 100} sacks</span>
              <span> × ₹{fmt(entry.strawPrice ?? 150)}</span>
              <span className="block text-[10px] text-slate-600 dark:text-slate-400 font-medium">
                (~₹{fmt(entry.ratePerCent)}/{t.step3.centsUnit})
              </span>
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
                  <span>₹{fmt(entry.ratePerCent)} × {userDetails.landSize} {t.step3.centsUnit}</span>
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
                <>
                  ₹{fmt(entry.ratePerCent)} {t.step3.perCentMultiplication} {userDetails.landSize} {t.step3.centsUnit}
                </>
              )}
            </div>
          </div>
        )}
      </td>
    </tr>
  );
};
