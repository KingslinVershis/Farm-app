'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons/Icons';

interface MotionFreeScrollCarouselProps {
  children: React.ReactNode;
  gap?: number;
  className?: string;
  showArrows?: boolean;
  itemCount?: number;
}

export default function MotionFreeScrollCarousel({
  children,
  gap = 20,
  className = '',
  showArrows = true,
  itemCount,
}: MotionFreeScrollCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [maxDrag, setMaxDrag] = useState<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const x = useMotionValue(0);
  const targetXRef = useRef<number>(0);

  const updateConstraints = useCallback(() => {
    if (!containerRef.current || !trackRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const trackWidth = trackRef.current.scrollWidth;
    const max = Math.max(0, trackWidth - containerWidth);
    setMaxDrag(max);

    // Keep current x within new bounds
    const currentX = x.get();
    if (currentX < -max) {
      targetXRef.current = -max;
      animate(x, -max, { duration: 0.2, ease: 'easeOut' });
    } else if (currentX > 0) {
      targetXRef.current = 0;
      animate(x, 0, { duration: 0.2, ease: 'easeOut' });
    } else {
      targetXRef.current = currentX;
    }
  }, [x]);

  // Update bounds on mount, resize, and when items change
  useEffect(() => {
    updateConstraints();
    const handleResize = () => updateConstraints();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateConstraints, itemCount, children]);

  // Monitor scroll arrows visibility based on x position
  useEffect(() => {
    const unsubscribe = x.on('change', (latest) => {
      setCanScrollLeft(latest < -8);
      setCanScrollRight(latest > -(maxDrag - 8));
    });
    return () => unsubscribe();
  }, [x, maxDrag]);

  // Initial check for canScrollRight
  useEffect(() => {
    setCanScrollRight(maxDrag > 10);
  }, [maxDrag]);

  const scrollBy = (offset: number) => {
    const current = targetXRef.current;
    const target = Math.max(-maxDrag, Math.min(0, current + offset));
    targetXRef.current = target;
    animate(x, target, {
      type: 'spring',
      stiffness: 300,
      damping: 32,
      mass: 0.8,
    });
  };

  // Seamless horizontal scroll on mouse wheel (converts vertical wheel scroll into X-axis scroll)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheelHandler = (e: WheelEvent) => {
      if (maxDrag <= 0) return;

      // Detect movement on either wheel axis (deltaY from standard mouse wheel or deltaX from trackpad)
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta === 0) return;

      const current = x.get();
      // Allow default vertical scroll if already at edge boundary
      const canScrollThisDirection =
        (delta > 0 && current > -maxDrag + 1) || (delta < 0 && current < -1);

      if (canScrollThisDirection) {
        e.preventDefault();
      } else {
        return;
      }

      // Smooth horizontal spring acceleration based on wheel delta
      const multiplier = 1.3;
      const nextTarget = Math.max(-maxDrag, Math.min(0, targetXRef.current - delta * multiplier));
      targetXRef.current = nextTarget;

      animate(x, nextTarget, {
        type: 'spring',
        stiffness: 340,
        damping: 30,
        mass: 0.35,
      });
    };

    container.addEventListener('wheel', onWheelHandler, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheelHandler);
    };
  }, [maxDrag, x]);

  return (
    <div className={`relative w-full select-none ${className}`}>
      {/* Top Header Controls: Navigation Arrow Buttons & Status */}
      {showArrows && maxDrag > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Free scroll carousel • Drag or swipe horizontally</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollBy(340)}
              disabled={!canScrollLeft}
              aria-label="Previous items"
              className="w-8 h-8 rounded-xl glass-surface border border-border-light hover:border-sky-400/50 flex items-center justify-center text-text-secondary hover:text-sky-400 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-sm active:scale-95"
            >
              <ChevronLeftIcon size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(-340)}
              disabled={!canScrollRight}
              aria-label="Next items"
              className="w-8 h-8 rounded-xl glass-surface border border-border-light hover:border-sky-400/50 flex items-center justify-center text-text-secondary hover:text-sky-400 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-sm active:scale-95"
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Free Scroll Carousel Viewport */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden py-2"
        style={{
          // Subtle edge fade masking when content overflows
          maskImage:
            maxDrag > 0
              ? `linear-gradient(to right, ${
                  canScrollLeft ? 'transparent 0%, black 36px' : 'black 0%'
                }, black calc(100% - ${canScrollRight ? '36px' : '0%'}), ${
                  canScrollRight ? 'transparent 100%' : 'black 100%'
                })`
              : 'none',
          WebkitMaskImage:
            maxDrag > 0
              ? `linear-gradient(to right, ${
                  canScrollLeft ? 'transparent 0%, black 36px' : 'black 0%'
                }, black calc(100% - ${canScrollRight ? '36px' : '0%'}), ${
                  canScrollRight ? 'transparent 100%' : 'black 100%'
                })`
              : 'none',
        }}
      >
        <motion.div
          ref={trackRef}
          style={{ x }}
          drag="x"
          dragConstraints={{ left: -maxDrag, right: 0 }}
          dragElastic={0.08}
          dragTransition={{
            power: 0.25,
            timeConstant: 250,
            bounceStiffness: 350,
            bounceDamping: 35,
          }}
          onDragStart={() => {
            setIsDragging(true);
            targetXRef.current = x.get();
          }}
          onDrag={() => {
            targetXRef.current = x.get();
          }}
          onDragEnd={() => {
            targetXRef.current = x.get();
            // Small timeout before resetting isDragging to avoid click conflicts
            setTimeout(() => setIsDragging(false), 50);
          }}
          className={`flex items-stretch cursor-grab active:cursor-grabbing will-change-transform ${
            isDragging ? 'pointer-events-none' : ''
          }`}
          css-gap={gap}
        >
          <div className="flex items-stretch gap-5 shrink-0 pr-4">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
