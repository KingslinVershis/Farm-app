'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SavedPlanRecord } from '@/lib/fertilizer/types';
import { formatCurrency as fmt } from '@/lib/fertilizer/calc';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { SavedPlanCard } from './SavedPlanCard';
import PaperCrumple from '@/components/reactbits/PaperCrumple';
import { generateCardSvgDataUrl } from './generateCardSvg';
import { AlertTriangle, Trash2, X } from '@/components/icons/FlaticonIcons';
import AnimatedContent from '@/components/reactbits/AnimatedContent';

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
  const { messages, locale } = useLanguage();
  const isTamil = locale === 'ta';
  const t = messages.fertilizer;

  // 3D Paper Crumple Trash Action State
  const [draggingPlan, setDraggingPlan] = useState<SavedPlanRecord | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number>(0);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [isThrowing, setIsThrowing] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SavedPlanRecord | null>(null);

  const dustbinRef = useRef<HTMLDivElement | null>(null);
  const activePlanRef = useRef<SavedPlanRecord | null>(null);
  activePlanRef.current = draggingPlan;

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Generate SVG Data URL for the dragged card texture
  const activeCardSvgUrl = useMemo(() => {
    if (!draggingPlan) return '';
    return generateCardSvgDataUrl(draggingPlan, draggingIndex, savedPlans.length, isTamil);
  }, [draggingPlan, draggingIndex, savedPlans.length, isTamil]);

  // Start Hold & Drag handler
  const handleStartHoldDrag = useCallback(
    (
      plan: SavedPlanRecord,
      initialPoint: { clientX: number; clientY: number },
      rect: DOMRect | null,
      index: number
    ) => {
      setDraggingPlan(plan);
      setDraggingIndex(index);
      setOriginRect(rect);
      setPointerPos({ x: initialPoint.clientX, y: initialPoint.clientY });
      setIsOverTrash(false);
      setIsThrowing(false);
      setIsReturning(false);
    },
    []
  );

  // Global window listeners for pointer movement and release
  useEffect(() => {
    if (!draggingPlan) return;

    const handlePointerMove = (e: PointerEvent) => {
      setPointerPos({ x: e.clientX, y: e.clientY });

      if (dustbinRef.current) {
        const dRect = dustbinRef.current.getBoundingClientRect();
        const centerX = dRect.left + dRect.width / 2;
        const centerY = dRect.top + dRect.height / 2;
        const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        setIsOverTrash(dist < 145);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const plan = activePlanRef.current;
      if (!plan) return;

      let droppedInTrash = false;
      if (dustbinRef.current) {
        const dRect = dustbinRef.current.getBoundingClientRect();
        const centerX = dRect.left + dRect.width / 2;
        const centerY = dRect.top + dRect.height / 2;
        const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        if (dist < 145) {
          droppedInTrash = true;
        }
      }

      if (droppedInTrash) {
        setIsThrowing(true);
        setTimeout(() => {
          setPlanToDelete(plan);
          setDraggingPlan(null);
          setIsThrowing(false);
          setIsOverTrash(false);
        }, 360);
      } else {
        setIsReturning(true);
        setTimeout(() => {
          setDraggingPlan(null);
          setIsReturning(false);
          setIsOverTrash(false);
        }, 280);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsReturning(true);
        setTimeout(() => {
          setDraggingPlan(null);
          setIsReturning(false);
          setIsOverTrash(false);
        }, 240);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [draggingPlan]);

  return (
    <div className="space-y-6 sm:space-y-8 relative">
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
              <span
                className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-400 border border-emerald-500/30"
                suppressHydrationWarning
              >
                {isMounted ? `${savedPlans.length} ${savedPlans.length === 1 ? 'Record' : 'Records'}` : '— Records'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
              {t.step3.savedPlansSubtitle ||
                'Review previously generated farm budgets, input schedules, and commercial realization records. Click any card to inspect full executive audit or create a new cultivation scenario.'}
            </p>
          </div>

          {/* Primary Create New Record Button */}
          <div className="shrink-0">
            <button
              type="button"
              id="btn-create-new-record-main"
              onClick={onCreateNewRecord}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 px-6 py-3 text-sm font-black text-white keep-white shadow-[0_10px_30px_rgba(16,185,129,0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <span className="text-base font-black">➕</span>
              <span>{t.step3.createNewRecordBtn || 'Create New Record'}</span>
            </button>
          </div>
        </div>

        {/* Informational Row inside Saved Cultivation Records banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-border-subtle">
          <span className="text-xs font-semibold text-text-muted">
            Select any card to view its executive audit dossier:
          </span>
          <span
            className="text-xs text-emerald-600 dark:text-emerald-400 font-bold"
            suppressHydrationWarning
          >
            {isMounted ? `Showing ${savedPlans.length} ${savedPlans.length === 1 ? 'Plan' : 'Plans'}` : ''}
          </span>
        </div>
      </div>

      {/* Main Records Container */}
      {!isMounted ? (
        /* Hydration Skeleton Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl glass-panel p-5 sm:p-6 border border-white/5 shadow-xl animate-pulse min-h-[360px] flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-5 w-24 bg-white/10 rounded-md" />
                <div className="h-6 w-36 bg-white/10 rounded-lg" />
                <div className="h-24 bg-white/5 rounded-xl mt-4" />
              </div>
              <div className="h-10 bg-white/5 rounded-xl" />
            </div>
          ))}
        </div>
      ) : savedPlans.length === 0 ? (
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
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-white keep-white shadow-glow hover:bg-emerald-400 active:scale-95 transition-all cursor-pointer"
            >
              <span>➕</span>
              <span>Create Your First Cultivation Record</span>
            </button>
          </div>
        </div>
      ) : (
        /* Cards Grid with AnimatedContent reveal at initial render */
        <div className="space-y-4">
          <AnimatedContent
            key={`saved-plans-grid-${savedPlans.length}`}
            distance={120}
            direction="vertical"
            duration={1.4}
            ease="elastic.out(1, 0.55)"
            blur={0}
            stagger={0.08}
            threshold={0.1}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {savedPlans.map((plan, idx) => (
              <SavedPlanCard
                key={plan.id}
                plan={plan}
                index={idx}
                totalCount={savedPlans.length}
                isSelected={activePlanId === plan.id}
                isDraggingThisCard={draggingPlan?.id === plan.id}
                onSelect={onSelectPlan}
                onEdit={onEditPlan}
                onDelete={onDeletePlan}
                onStartHoldDrag={handleStartHoldDrag}
              />
            ))}
          </AnimatedContent>
        </div>
      )}

      {/* Full-Screen Dark Backdrop (Clean with zero green fog effects) */}
      <AnimatePresence>
        {draggingPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 pointer-events-none overflow-hidden"
          >
            {/* Clean dark backdrop without green fog */}
            <div className="absolute inset-0 bg-black/80 dark:bg-black/85 backdrop-blur-sm" />

            {/* Top Banner Guide - High contrast in both themes, moved cleanly below topbar */}
            <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-6 py-3 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white border-2 border-rose-500/80 shadow-[0_10px_35px_rgba(0,0,0,0.35)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.7)] backdrop-blur-xl z-50 text-xs sm:text-sm font-black tracking-wide pointer-events-none">
              <span className="text-lg">🗑️</span>
              <span className="text-slate-900 dark:text-white font-extrabold">
                {t.step3.throwCardToDustbinGuide}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prominent Animated Big Dustbin Icon at Right Bottom Corner (Red Theme) */}
      <AnimatePresence>
        {draggingPlan && (
          <motion.div
            ref={dustbinRef}
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{
              scale: isThrowing ? 1.25 : isOverTrash ? 1.18 : 1,
              opacity: 1,
              y: 0,
            }}
            exit={{ scale: 0, opacity: 0, y: 50 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 24,
            }}
            className="fixed bottom-8 right-8 z-50 flex flex-col items-center justify-center cursor-pointer select-none"
          >
            {/* Radial rose/red pulse glow */}
            <div
              className={`absolute -inset-6 rounded-full transition-all duration-300 ${isOverTrash || isThrowing
                ? 'bg-rose-500 opacity-95 blur-2xl animate-pulse'
                : 'bg-rose-600 opacity-70 blur-xl animate-pulse'
                }`}
            />

            {/* Outer glowing border ring in Red */}
            <div
              className={`absolute -inset-2.5 rounded-3xl border-2 transition-all duration-300 ${isOverTrash || isThrowing
                ? 'border-rose-300 shadow-[0_0_55px_rgba(244,63,94,0.95)] scale-110'
                : 'border-rose-400/90 shadow-[0_0_40px_rgba(225,29,72,0.75)]'
                }`}
            />

            {/* Dustbin Container in Red */}
            <div
              className={`relative h-24 w-24 sm:h-28 sm:w-28 rounded-3xl flex flex-col items-center justify-center p-3 sm:p-4 border-2 transition-all duration-300 ${isOverTrash || isThrowing
                ? 'bg-[#3b0816]/95 border-rose-300 shadow-[0_0_60px_rgba(244,63,94,0.9)]'
                : 'bg-[#22040c]/95 border-rose-400 shadow-[0_0_45px_rgba(225,29,72,0.7)]'
                }`}
            >
              {/* Animated SVG Trash with Lid Opening */}
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                {/* Dustbin Lid */}
                <motion.svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{
                    y: isOverTrash || isThrowing ? -10 : 0,
                    rotate: isOverTrash || isThrowing ? -28 : 0,
                    transformOrigin: 'top left',
                  }}
                  transition={{ type: 'spring', stiffness: 450, damping: 22 }}
                  className={`absolute top-0 w-12 h-6 sm:w-14 sm:h-7 transition-colors duration-200 ${isOverTrash || isThrowing ? 'text-rose-100' : 'text-rose-300'
                    }`}
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </motion.svg>

                {/* Dustbin Body */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`w-12 h-12 sm:w-14 sm:h-14 transition-colors duration-200 ${isOverTrash || isThrowing ? 'text-rose-100' : 'text-rose-300'
                    }`}
                >
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>

                {/* Inner suction glow when open */}
                {(isOverTrash || isThrowing) && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-x-2 top-2 h-4 bg-rose-400 blur-sm rounded-full"
                  />
                )}
              </div>

              {/* Dustbin label */}
              <span
                className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider mt-1.5 text-center transition-colors duration-200 ${isOverTrash || isThrowing ? 'text-rose-100 font-extrabold' : 'text-rose-300'
                  }`}
              >
                {isOverTrash || isThrowing
                  ? t.step3.dropToDelete
                  : t.step3.dustbinLabel}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating 3D Squeezed Paper Ball Element using PaperCrumple */}
      <AnimatePresence>
        {draggingPlan && activeCardSvgUrl && (
          <motion.div
            key={draggingPlan.id}
            style={{
              position: 'fixed',
              left: isReturning && originRect ? originRect.left : pointerPos.x - 180,
              top: isReturning && originRect ? originRect.top : pointerPos.y - 190,
              width: 360,
              height: 380,
              zIndex: 55,
              pointerEvents: 'none',
              transformOrigin: 'center center',
            }}
            animate={{
              scale: isThrowing ? 0 : isOverTrash ? 0.6 : 0.82,
              rotate: isOverTrash ? 25 : [0, -4, 4, 0],
              opacity: isThrowing ? 0 : 1,
            }}
            transition={
              isThrowing
                ? { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
                : isReturning
                  ? { type: 'spring', stiffness: 320, damping: 26 }
                  : { duration: 0 }
            }
          >
            <PaperCrumple
              src={activeCardSvgUrl}
              alt={`Cultivation record for ${draggingPlan.userDetails.name || 'Farmer'}`}
              width={360}
              height={380}
              sceneHeight={380}
              isHeld={true}
              crumpleAmount={isOverTrash ? 0.98 : 0.92}
              crumpleDuration={0.3}
              releaseDuration={0.35}
              releaseBehavior="restore"
              foldCount={7}
              foldSharpness={0.7}
              wrinkleDepth={0.8}
              creaseStrength={0.25}
              paperColor="#f4f6f8"
              paperTexture={0.12}
              draggable={false}
              returnToOrigin={false}
              imageFit="contain"
              roughness={0.88}
              lightIntensity={2.4}
              shadow
              shadowOpacity={0.3}
              dragRotation={14}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal triggered by throwing into dustbin */}
      <AnimatePresence>
        {planToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 dark:bg-black/80 backdrop-blur-md p-4"
            onClick={() => setPlanToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-white dark:bg-[#0f182a] p-6 shadow-[0_25px_60px_-15px_rgba(244,63,94,0.35)] space-y-5 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setPlanToDelete(null)}
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
                    {t.step3.deleteRecordModalTitle}
                  </h4>
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1 m-0">
                    {t.step3.deleteRecordModalPermanent}
                  </p>
                </div>
              </div>

              {/* Record Summary Preview Box */}
              <div className="rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Farmer:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                    {planToDelete.userDetails.name || 'Unnamed Farm Plot'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Land Cultivation:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {planToDelete.userDetails.landSize} Cents ({planToDelete.cultivation.toUpperCase()})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Net Profit Estimate:</span>
                  <span className="font-bold text-cyan-700 dark:text-cyan-400">
                    ₹{fmt(planToDelete.totals.netProfit)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-white/10 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Saved Date:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {planToDelete.updated_at || planToDelete.created_at}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed m-0">
                {t.step3.deleteRecordModalWarning}
              </p>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setPlanToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    const id = planToDelete.id;
                    setPlanToDelete(null);
                    onDeletePlan(id, e);
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
    </div>
  );
};
