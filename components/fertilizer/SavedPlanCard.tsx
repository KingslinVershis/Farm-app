'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { SavedPlanRecord } from '@/lib/fertilizer/types';
import { formatCurrency as fmt } from '@/lib/fertilizer/calc';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface SavedPlanCardProps {
  plan: SavedPlanRecord;
  index: number;
  totalCount: number;
  isSelected?: boolean;
  onSelect: (planId: string) => void;
  onEdit: (planId: string, e: React.MouseEvent) => void;
  onDelete: (planId: string, e: React.MouseEvent) => void;
}

export const SavedPlanCard: React.FC<SavedPlanCardProps> = ({
  plan,
  index,
  totalCount,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const { messages } = useLanguage();
  const t = messages.fertilizer;
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // Derive values directly from phase expenses without relying on separate highlight objects
  const grainTask = plan.expenseMap?.phase_5?.grain_yield || plan.expenseMap?.phase_5?.bunch_sales;
  const strawTask = plan.expenseMap?.phase_5?.straw_yield;
  const gunnyTask = plan.expenseMap?.phase_4?.gunny_bags;
  const transportTask = plan.expenseMap?.phase_4?.transport;

  const yieldMode = grainTask?.yieldMode ?? 'tons';
  const yieldTons = grainTask?.yieldTons ?? 14;
  const bagWeightKg = grainTask?.bagWeightKg ?? 75;
  const grainBagCount =
    grainTask?.grainBagCount && !isNaN(grainTask.grainBagCount)
      ? grainTask.grainBagCount
      : Number(((yieldTons * 1000) / (bagWeightKg || 75)).toFixed(2));
  const grainBagPrice = (grainTask?.grainBagPrice && grainTask.grainBagPrice > 0)
    ? grainTask.grainBagPrice
    : (grainTask?.pricePerBag && grainTask.pricePerBag > 0 ? grainTask.pricePerBag : 1650);
  const strawSackCount = strawTask?.strawSackCount ?? (strawTask?.SackCount ?? 100);
  const strawPrice = strawTask?.strawPrice ?? (strawTask?.SackPrice ?? 150);
  const gunnyCount = gunnyTask?.bagCount ?? 120;
  const gunnyType = gunnyTask?.isPlastic !== false && gunnyTask?.isPlasticBag !== false ? 'plastic' : 'traditional';
  const transportRent = transportTask?.transportRent ?? 1500;
  const loadingWorkers = transportTask?.loadingWorkers ?? (transportTask?.loadingLabourCount ?? 4);

  return (
    <>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 dark:bg-black/70 backdrop-blur-xs p-4"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/12 bg-white dark:bg-[#0f182a] p-6 shadow-[0_20px_40px_-10px_rgba(15,23,42,0.2)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] space-y-5 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button matching other modals */}
              <button
                type="button"
                aria-label="Close"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                className="absolute top-4 right-4 h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div className="flex items-start gap-3.5 pr-8">
                <div className="h-11 w-11 rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight m-0">
                    Delete Cultivation Record?
                  </h4>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1 m-0">
                    This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>

              {/* Record Summary Preview Box */}
              <div className="rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Farmer:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                    {plan.userDetails.name || 'Unnamed Farm Plot'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Land Cultivation:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {plan.userDetails.landSize} Cents ({plan.cultivation.toUpperCase()})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Net Profit Estimate:</span>
                  <span className="font-bold text-cyan-700 dark:text-cyan-400">
                    ₹{fmt(plan.totals.netProfit)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-white/10 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Saved Date:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {plan.updated_at || plan.created_at}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed m-0">
                Deleting this record will immediately remove all phase-wise budget allocations, seed telemetry, and harvest yield records from your account.
              </p>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(false);
                    onDelete(plan.id, e);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-rose-500 to-red-600 hover:brightness-110 text-white keep-white shadow-lg shadow-rose-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Yes, Delete</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        id={`saved-card-${plan.id}`}
        onClick={() => onSelect(plan.id)}
        className={`rounded-2xl glass-panel p-5 shadow-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl cursor-pointer relative group flex flex-col justify-between border ${isSelected
          ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-950/30'
          : 'border-white/10 hover:border-emerald-500/50'
          }`}
      >
        <div>
          {/* Top Metadata, Edit & Delete Action */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-200/90 text-slate-800 dark:bg-white/10 dark:text-text-secondary tracking-wider">
                Record #{totalCount - index}
              </span>
              <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100 border-emerald-300 dark:text-emerald-400 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border dark:border-emerald-500/20">
                🌾 Paddy
              </span>
              {plan.isCompleted ? (
                <span className="text-[10px] font-bold text-emerald-950 bg-emerald-200/90 border-emerald-400 dark:text-emerald-300 dark:bg-emerald-500/20 px-2 py-0.5 rounded-md border dark:border-emerald-500/40 flex items-center gap-1 shadow-2xs">
                  <span>✓</span> Completed
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border-amber-300 dark:text-amber-400 dark:bg-amber-500/15 px-2 py-0.5 rounded-md border dark:border-amber-500/30">
                  📝 In Progress
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-600 dark:text-text-muted font-medium mr-1">
                {plan.updated_at || plan.created_at}
              </span>
              {/* Show Edit button only when plan is not completed */}
              {!plan.isCompleted ? (
                <button
                  type="button"
                  title="Edit this record from Step 1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(plan.id, e);
                  }}
                  className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              ) : (
                <span
                  title="Completed plan is finalized and non-editable"
                  className="p-1.5 text-slate-500 cursor-not-allowed text-xs flex items-center"
                >
                  🔒
                </span>
              )}
              <button
                type="button"
                title="Delete this record"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>

          {/* Farmer & Land Identity */}
          <div className="mb-3.5">
            <h4 className="font-display text-lg font-black text-text-main group-hover:text-emerald-400 transition-colors tracking-tight">
              {plan.userDetails.name || 'Unnamed Farm Plot'}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary mt-1">
              <span className="font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                {plan.userDetails.landSize} {messages.common.cents}
              </span>
              <span>•</span>
              <span className="truncate max-w-[200px] text-text-muted">
                {[plan.userDetails.village, plan.userDetails.district, plan.userDetails.state].filter(Boolean).join(', ') || plan.userDetails.address || ''}
              </span>
              {plan.userDetails.phone && (
                <>
                  <span>•</span>
                  <span className="text-text-muted">+91 {plan.userDetails.phone}</span>
                </>
              )}
            </div>
          </div>

          {/* User Entered Details Highlight Grid (Exterior Preview) */}
          <div className="rounded-xl glass-surface p-3.5 mb-4 border border-white/5 space-y-2 text-xs">
            {/* Grain Yield */}
            <div className="flex items-center justify-between">
              <span className="text-text-muted">{t.step3.cardLabels?.grainYield || 'Grain Yield'}:</span>
              <span className="font-bold text-text-main">
                {yieldMode === 'tons'
                  ? `${yieldTons} Tons (${grainBagCount} Bags)`
                  : `${grainBagCount} Bags`}
              </span>
            </div>

            {/* Mandi Price */}
            <div className="flex items-center justify-between">
              <span className="text-text-muted">{t.step3.cardLabels?.mandiPrice || 'Mandi Price'}:</span>
              <span className="font-extrabold text-emerald-400">
                ₹{fmt(grainBagPrice)} / Bag
              </span>
            </div>

            {/* Straw Byproduct */}
            <div className="flex items-center justify-between">
              <span className="text-text-muted">{t.step3.cardLabels?.strawYield || 'Straw Byproduct'}:</span>
              <span className="font-medium text-text-secondary">
                {strawSackCount} Sacks @ ₹{fmt(strawPrice)}
              </span>
            </div>

            {/* Gunny Bags */}
            <div className="flex items-center justify-between">
              <span className="text-text-muted">{t.step3.cardLabels?.gunnyBags || 'Gunny Bags'}:</span>
              <span className="font-medium text-text-secondary">
                {gunnyCount} ({gunnyType === 'plastic' ? 'Modern Plastic' : 'Traditional'})
              </span>
            </div>

            {/* Transport & Mandi */}
            <div className="flex items-center justify-between">
              <span className="text-text-muted">{t.step3.cardLabels?.transport || 'Transport & Mandi'}:</span>
              <span className="font-medium text-text-secondary">
                ₹{fmt(transportRent)} Rent • {loadingWorkers} Workers
              </span>
            </div>
          </div>

          {/* Financial Realization Box */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-xl bg-black/25 p-2.5 border border-white/5">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">
                {t.step3.cardLabels?.outlay || 'Cultivation Outlay'}
              </span>
              <span className="text-sm font-extrabold text-amber-400">₹{fmt(plan.totals.grandTotal)}</span>
            </div>
            <div className="rounded-xl bg-black/25 p-2.5 border border-white/5">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">
                {t.step3.cardLabels?.revenue || 'Gross Revenue'}
              </span>
              <span className="text-sm font-extrabold text-cyan-400">₹{fmt(plan.totals.revenueTotal)}</span>
            </div>
            <div className="col-span-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 border border-emerald-300 dark:border-emerald-500/25 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-emerald-800 dark:text-emerald-300 uppercase font-black tracking-wider block">
                  {t.step3.cardLabels?.netProfit || 'Net Farm Profit'}
                </span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">₹{fmt(plan.totals.netProfit)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-600 dark:text-text-muted font-bold block">
                  {t.step3.cardLabels?.roi || 'Est. ROI'}
                </span>
                <span className="text-xs font-black text-emerald-950 bg-emerald-200/90 border border-emerald-400 dark:text-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/30 px-2 py-0.5 rounded shadow-2xs">
                  {plan.totals.grandTotal > 0
                    ? Math.round((plan.totals.netProfit / plan.totals.grandTotal) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Call to Action */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
          <span>{t.step3.viewSummaryCardBtn || 'View Summary Dossier →'}</span>
          <span className="transition-transform group-hover:translate-x-1.5 font-black text-sm">→</span>
        </div>
      </div>
    </>
  );
};
