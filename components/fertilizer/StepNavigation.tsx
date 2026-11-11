'use client';

import React from 'react';
import type { StepId } from '@/lib/fertilizer/types';

interface StepItem {
  num: StepId;
  title: string;
  subtitle: string;
}

interface StepNavigationProps {
  currentStep: StepId;
  maxUnlockedStep?: 1 | 2 | 3;
  onSelectStep: (step: StepId) => void;
  stepsList: StepItem[];
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  maxUnlockedStep = 3,
  onSelectStep,
  stepsList,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 mb-6">
      {stepsList.map((item) => {
        const isActive = currentStep === item.num;
        const isCompleted = currentStep > item.num;
        const isLocked = item.num > maxUnlockedStep;
        return (
          <button
            key={item.num}
            id={`step-tab-${item.num}`}
            type="button"
            aria-disabled={isLocked}
            onClick={() => onSelectStep(item.num)}
            className={`flex flex-col text-left p-3 sm:p-4 rounded-xl glass-card transition-all duration-200 ${
              isLocked
                ? 'opacity-55 cursor-not-allowed border-border-subtle'
                : isActive
                  ? 'cursor-pointer border-emerald-500/90 shadow-[0_14px_30px_-6px_rgba(16,185,129,0.3),0_0_0_1px_rgba(52,211,153,0.35)] ring-1 ring-emerald-500/30'
                  : isCompleted
                    ? 'cursor-pointer hover:border-emerald-500/40 hover:bg-surface/80'
                    : 'cursor-pointer hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  isLocked
                    ? 'text-slate-500 dark:text-slate-400'
                    : isActive
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : isCompleted
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Step {item.num}
              </span>
              {isLocked ? (
                <span className="flex items-center gap-1 rounded-full bg-slate-500/15 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-400 border border-slate-500/25">
                  🔒 Locked
                </span>
              ) : item.num === 3 ? (
                <span className="flex items-center rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 px-2 py-0.5 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  5 Phases
                </span>
              ) : isCompleted ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/25 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  ✓
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold group-hover:text-emerald-400">
                  →
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm font-bold text-text-main line-clamp-1">{item.title}</div>
            <div className="text-[11px] text-text-secondary line-clamp-1 mt-0.5">{item.subtitle}</div>
          </button>
        );
      })}
    </div>
  );
};
