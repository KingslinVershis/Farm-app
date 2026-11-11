'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export const TopProgressBar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startProgress = () => {
    if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    setIsVisible(true);
    setProgress(15);

    // Incrementally creep progress to show activity
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) return prev + 12;
        if (prev < 75) return prev + 6;
        if (prev < 88) return prev + 2;
        return prev;
      });
    }, 120);
  };

  const finishProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);

    finishTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 250);
  };

  // Complete progress whenever the route or search parameters change
  useEffect(() => {
    finishProgress();
  }, [pathname, searchParams]);

  // Intercept click on internal links to start progress immediately
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      try {
        const target = (event.target as HTMLElement)?.closest('a');
        if (!target) return;

        const href = target.getAttribute('href');
        const targetAttr = target.getAttribute('target');

        // Ignore external links, downloads, new tabs, or anchor jumps on same page
        if (
          !href ||
          targetAttr === '_blank' ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('#') ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        const isInternal =
          href.startsWith('/') ||
          (href.startsWith('http') && href.startsWith(window.location.origin));

        if (isInternal) {
          const currentUrl = window.location.pathname + window.location.search;
          const targetUrl = href.replace(window.location.origin, '');

          // If navigating to a different URL or page, show progress bar
          if (targetUrl !== currentUrl && !targetUrl.startsWith(`${window.location.pathname}#`)) {
            startProgress();
          }
        }
      } catch {
        // Fallback safely
      }
    };

    // Attach programmatic global helpers
    if (typeof window !== 'undefined') {
      (window as any).__startTopProgress = startProgress;
      (window as any).__finishTopProgress = finishProgress;
    }

    document.addEventListener('click', handleAnchorClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleAnchorClick, { capture: true });
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 pointer-events-none z-[999999]"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.25s ease-out',
      }}
    >
      {/* Primary Blue Progress Line */}
      <div
        className="h-[3px] w-full"
        style={{
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 25%, #3b82f6 60%, #60a5fa 90%, #93c5fd 100%)',
          boxShadow: '0 0 14px rgba(59, 130, 246, 0.95), 0 0 6px rgba(96, 165, 250, 0.85)',
          transition: progress === 100 ? 'width 0.15s ease-out' : 'width 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      />
      {/* Glowing tip at progress head */}
      <div
        className="absolute top-0 h-[3px] w-8 -ml-8"
        style={{
          left: `${progress}%`,
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.85))',
          boxShadow: '0 0 10px #60a5fa, 0 0 15px #3b82f6',
        }}
      />
    </div>
  );
};

