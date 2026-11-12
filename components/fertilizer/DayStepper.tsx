'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimate } from 'motion/react';

const snap = { type: 'spring', stiffness: 1218, damping: 70 } as const;
const ui = { type: 'spring', stiffness: 305, damping: 33 } as const;
const lively = { type: 'spring', stiffness: 622, damping: 17 } as const;

interface DayStepperProps {
  value: number;
  min?: number;
  max?: number;
  dayLabel?: string;
  maxLabel?: string;
  onChange: (nextDay: number) => void;
}

export const DayStepper: React.FC<DayStepperProps> = ({
  value,
  min = 1,
  max = 7,
  dayLabel = 'Day',
  maxLabel,
  onChange,
}) => {
  const [direction, setDirection] = useState(1);
  const [valueRef, animateValue] = useAnimate();
  const latest = useRef(value);

  useEffect(() => {
    latest.current = value;
  }, [value]);

  const step = (change: number) => {
    const next = Math.min(max, Math.max(min, latest.current + change));

    if (next === latest.current) {
      if (valueRef.current) {
        animateValue(
          valueRef.current,
          { x: [0, 5 * change, -3 * change, 0] },
          { duration: 0.3 }
        );
      }
      return;
    }

    latest.current = next;
    setDirection(change);
    onChange(next);
  };

  return (
    <div className="fert-st-stepper inline-flex flex-col items-start gap-1.5 select-none">
      <div className="fert-st-control inline-flex items-center gap-1 p-1 rounded-full bg-white dark:bg-slate-900/95 ring-1 ring-slate-900/10 dark:ring-white/20 shadow-sm">
        <StepButton
          change={-1}
          onStep={step}
          disabled={value <= min}
          ariaLabel={`Previous ${dayLabel}`}
        />
        <div
          ref={valueRef}
          className="fert-st-value inline-flex items-center justify-center gap-1 min-w-[66px] h-8 px-1.5 overflow-hidden"
          role="status"
          aria-live="polite"
          aria-label={`${dayLabel} ${value} of ${max}`}
        >
          <span className="text-xs font-bold text-slate-600 dark:text-slate-200 tracking-wide">
            {dayLabel}
          </span>
          <div className="relative w-4 h-7 overflow-hidden">
            <AnimatePresence initial={false} custom={direction}>
              <motion.span
                key={value}
                className="absolute inset-0 flex items-center justify-center text-base font-bold tabular-nums text-slate-900 dark:text-white"
                custom={direction}
                variants={{
                  enter: (d: number) => ({
                    y: 18 * d,
                    opacity: 0,
                    filter: 'blur(4px)',
                  }),
                  center: { y: 0, opacity: 1, filter: 'blur(0px)' },
                  exit: (d: number) => ({
                    y: -18 * d,
                    opacity: 0,
                    filter: 'blur(4px)',
                    transition: { ...snap, opacity: { duration: 0.12 } },
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={ui}
              >
                {value}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <StepButton
          change={1}
          onStep={step}
          disabled={value >= max}
          ariaLabel={`Next ${dayLabel}`}
        />
      </div>
      {maxLabel && (
        <span className="fert-st-hint text-[11px] font-semibold text-text-secondary">
          {maxLabel}
        </span>
      )}
    </div>
  );
};

function StepButton({
  change,
  onStep,
  disabled,
  ariaLabel,
}: {
  change: number;
  onStep: (change: number) => void;
  disabled: boolean;
  ariaLabel: string;
}) {
  const [scope, animate] = useAnimate();
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  };

  useEffect(() => clearTimers, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    clearTimers();
    onStep(change);
    if (scope.current) {
      animate(scope.current, { scale: [0.82, 1] }, lively);
    }
    holdTimeoutRef.current = setTimeout(() => {
      repeatIntervalRef.current = setInterval(() => {
        onStep(change);
      }, 100);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onStep(change);
    }
  };

  return (
    <motion.button
      ref={scope}
      type="button"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onPointerDown={handlePointerDown}
      onPointerUp={clearTimers}
      onPointerLeave={clearTimers}
      onPointerCancel={clearTimers}
      onKeyDown={handleKeyDown}
      whileTap={{ scale: 0.88, transition: snap }}
      transition={lively}
      className={`w-8 h-8 rounded-full border-0 p-0 flex items-center justify-center touch-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 ${
        disabled
          ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-900 dark:text-white cursor-pointer'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true">
        <path
          d={change > 0 ? 'M4 9h10M9 4v10' : 'M4 9h10'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
      </svg>
    </motion.button>
  );
}
