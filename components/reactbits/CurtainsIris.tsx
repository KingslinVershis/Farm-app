'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from '@/components/providers/ThemeProvider';
import MagicRings from './MagicRings';
import {
  NAV_START_EVENT,
  NAV_PROGRESS_EVENT,
  NAV_FINISH_EVENT,
  NavStartDetail,
} from '@/lib/navigationEvents';

export interface CurtainsIrisOrigin {
  x: number | string;
  y: number | string;
}

export interface CurtainsOptions {
  effect?: { type: string; origin?: CurtainsIrisOrigin };
  duration?: number;
}

/**
 * Helper matching Motion+ `iris()` API
 */
export function iris(options?: { origin?: CurtainsIrisOrigin }) {
  return {
    type: 'iris' as const,
    origin: options?.origin,
  };
}

/**
 * Curtains: Iris Motion Style Page Transition Component.
 * Synchronized directly with the top progress line loading logic.
 * Covers the screen on navigation start, displays continuous progress with MagicRings,
 * and reveals the destination page once fully mounted and rendered.
 */
export const CurtainsIris: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>(theme || 'dark');
  const [curtainProgress, setCurtainProgress] = useState<number>(0);

  useEffect(() => {
    const syncTheme = () => {
      const dataTheme = document.documentElement.getAttribute('data-theme');
      if (dataTheme === 'light' || dataTheme === 'dark') {
        setActiveTheme(dataTheme);
      } else {
        setActiveTheme(theme === 'light' ? 'light' : 'dark');
      }
    };
    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });
    return () => observer.disconnect();
  }, [theme]);

  const curtainRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<'idle' | 'covering' | 'covered' | 'revealing'>('idle');
  const originRef = useRef<{ x: string; y: string }>({ x: '50%', y: '50%' });
  const animRef = useRef<Animation | null>(null);
  const emergencyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setOriginVars = (x: string, y: string) => {
    if (curtainRef.current) {
      curtainRef.current.style.setProperty('--iris-x', x);
      curtainRef.current.style.setProperty('--iris-y', y);
    }
  };

  const reveal = useCallback(async (origin: { x: string; y: string }, duration = 300) => {
    const el = curtainRef.current;
    if (!el) return;

    if (emergencyTimerRef.current) {
      clearTimeout(emergencyTimerRef.current);
      emergencyTimerRef.current = null;
    }
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }

    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      el.style.display = 'none';
      statusRef.current = 'idle';
      setCurtainProgress(0);
      return;
    }

    if (animRef.current) {
      animRef.current.cancel();
      animRef.current = null;
    }

    statusRef.current = 'revealing';
    setOriginVars(origin.x, origin.y);

    const anim = el.animate(
      [
        { clipPath: `circle(150% at ${origin.x} ${origin.y})` },
        { clipPath: `circle(0% at ${origin.x} ${origin.y})` },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        fill: 'forwards',
      }
    );
    animRef.current = anim;

    try {
      await anim.finished;
    } catch {}

    el.style.display = 'none';
    statusRef.current = 'idle';
    setCurtainProgress(0);
    animRef.current = null;
  }, []);

  const cover = useCallback(async (origin: { x: string; y: string }, duration = 320) => {
    const el = curtainRef.current;
    if (!el) return;

    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      return;
    }

    if (animRef.current) {
      animRef.current.cancel();
      animRef.current = null;
    }

    originRef.current = origin;
    setOriginVars(origin.x, origin.y);

    statusRef.current = 'covering';
    el.style.display = 'block';

    const anim = el.animate(
      [
        { clipPath: `circle(0% at ${origin.x} ${origin.y})` },
        { clipPath: `circle(150% at ${origin.x} ${origin.y})` },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        fill: 'forwards',
      }
    );
    animRef.current = anim;

    try {
      await anim.finished;
    } catch {}

    animRef.current = null;
    if (statusRef.current === 'covering') {
      statusRef.current = 'covered';
    }

    // Safety timeout: 5s maximum so user is never permanently stuck
    if (emergencyTimerRef.current) clearTimeout(emergencyTimerRef.current);
    emergencyTimerRef.current = setTimeout(() => {
      if (statusRef.current !== 'idle') {
        reveal(originRef.current);
      }
    }, 5000);
  }, [reveal]);

  // Synchronize directly with navigation progress event bus
  useEffect(() => {
    const handleNavStart = (e: Event) => {
      const customEvent = e as CustomEvent<NavStartDetail>;
      const origin = customEvent.detail?.origin || { x: '50%', y: '50%' };
      setCurtainProgress(15);
      cover(origin, 320);
    };

    const handleNavProgress = (e: Event) => {
      const customEvent = e as CustomEvent<{ progress: number }>;
      const p = customEvent.detail?.progress ?? 0;
      setCurtainProgress(p);
    };

    const handleNavFinish = () => {
      setCurtainProgress(100);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
      // Wait 200ms matching top progress bar settling time before opening aperture
      finishTimeoutRef.current = setTimeout(() => {
        if (statusRef.current === 'covered' || statusRef.current === 'covering') {
          reveal(originRef.current);
        }
      }, 200);
    };

    window.addEventListener(NAV_START_EVENT, handleNavStart);
    window.addEventListener(NAV_PROGRESS_EVENT, handleNavProgress);
    window.addEventListener(NAV_FINISH_EVENT, handleNavFinish);

    return () => {
      window.removeEventListener(NAV_START_EVENT, handleNavStart);
      window.removeEventListener(NAV_PROGRESS_EVENT, handleNavProgress);
      window.removeEventListener(NAV_FINISH_EVENT, handleNavFinish);
      if (emergencyTimerRef.current) clearTimeout(emergencyTimerRef.current);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, [cover, reveal]);

  // Pathname / SearchParams change listener (safety backup)
  useEffect(() => {
    if (statusRef.current === 'covered') {
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = setTimeout(() => {
        reveal(originRef.current);
      }, 200);
    }
  }, [pathname, searchParams, reveal]);

  // Keyboard and click escape hatches: clicking anywhere on the curtain or pressing Escape dismisses it
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && statusRef.current !== 'idle') {
        reveal(originRef.current, 200);
      }
    };
    const handlePopState = () => {
      cover({ x: '50%', y: '50%' }, 280);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [reveal, cover]);

  // Programmatic global helper hooks
  useEffect(() => {
    (window as any).__startCurtains = (origin?: { x: string; y: string }) => {
      cover(origin || { x: '50%', y: '50%' }, 320);
    };
    (window as any).__finishCurtains = () => {
      reveal(originRef.current, 280);
    };
    (window as any).__triggerCurtainsIris = async (
      navigate: () => Promise<void> | void,
      options?: CurtainsOptions
    ) => {
      let origin = { x: '50%', y: '50%' };
      if (options?.effect?.origin) {
        const ox = options.effect.origin.x;
        const oy = options.effect.origin.y;
        origin = {
          x: typeof ox === 'number' ? `${ox * 100}%` : ox,
          y: typeof oy === 'number' ? `${oy * 100}%` : oy,
        };
      }
      await cover(origin, options?.duration || 320);
      await navigate();
    };

    return () => {
      delete (window as any).__startCurtains;
      delete (window as any).__finishCurtains;
      delete (window as any).__triggerCurtainsIris;
    };
  }, [cover, reveal]);

  return (
    <div
      ref={curtainRef}
      aria-hidden="true"
      onClick={() => {
        // Click-to-dismiss safety valve if stuck
        if (statusRef.current !== 'idle') {
          reveal(originRef.current, 200);
        }
      }}
      className="fixed inset-0 z-[9999999] select-none overflow-hidden bg-black text-white cursor-pointer"
      style={{
        display: 'none',
        clipPath: 'circle(0% at 50% 50%)',
        backgroundColor: '#000000',
      }}
      title="Click or press Escape to dismiss"
    >
      {/* MagicRings Dynamic Shader Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <MagicRings
          color="#10B981"
          colorTwo="#059669"
          motion="pulse"
          ringCount={6}
          speed={1.2}
          lineThickness={1.5}
          glow={0.75}
          baseRadius={0.32}
          radiusStep={0.09}
          expansion={0.12}
          taper={1.5}
          theme="dark"
          intro={true}
          followMouse={false}
        />
      </div>

      {/* Center Motion Loading Progress Bar (Directly Synchronized with Top Blue Line) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-6">
        <div className="w-full max-w-[260px] sm:max-w-[300px] flex flex-col items-center space-y-3">
          {/* Progress Track */}
          <div className="relative w-full h-1.5 sm:h-2 rounded-full overflow-hidden bg-white/10 border border-white/5">
            {/* Animated Loading Indicator matching TopProgressBar progress */}
            <div
              className="absolute top-0 bottom-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.9)]"
              style={{
                width: `${curtainProgress > 0 ? curtainProgress : 20}%`,
                transition: curtainProgress === 100 ? 'width 0.15s ease-out' : 'width 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            />
          </div>
          {/* Subtle Loading Text */}
          <span className="text-[11px] font-mono font-bold tracking-[0.28em] uppercase text-emerald-400 animate-pulse">
            LOADING
          </span>
        </div>
      </div>
    </div>
  );
};

export function useCurtains() {
  const [isPending, setIsPending] = useState(false);
  const triggerCurtains = useCallback(
    async (callback: () => Promise<void> | void, options?: CurtainsOptions) => {
      setIsPending(true);
      try {
        if (typeof window !== 'undefined' && (window as any).__triggerCurtainsIris) {
          await (window as any).__triggerCurtainsIris(callback, options);
        } else {
          await callback();
        }
      } finally {
        setIsPending(false);
      }
    },
    []
  );
  return [triggerCurtains, isPending] as const;
}

export default CurtainsIris;
