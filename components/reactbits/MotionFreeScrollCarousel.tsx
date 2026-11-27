'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons/Icons';
import AnimatedContent from '@/components/reactbits/AnimatedContent';

interface MotionFreeScrollCarouselProps {
  children: React.ReactNode;
  gap?: number;
  className?: string;
  showArrows?: boolean;
  itemCount?: number;
  helperText?: React.ReactNode;
  autoScroll?: boolean;
  autoScrollSpeed?: number;
  cardsPerScrollDesktop?: number;
  cardsPerScrollMobile?: number;
}

export default function MotionFreeScrollCarousel({
  children,
  gap = 16,
  className = '',
  showArrows = false,
  itemCount,
  helperText,
  autoScroll = true,
  autoScrollSpeed = 32,
  cardsPerScrollDesktop = 4,
  cardsPerScrollMobile = 2,
}: MotionFreeScrollCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [maxDrag, setMaxDrag] = useState<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isHoveredRef = useRef(false);
  const isInteractingRef = useRef(false);
  const isResettingRef = useRef(false);
  const lastFrameTimeRef = useRef(0);
  const userInteractingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const x = useMotionValue(0);
  const targetXRef = useRef<number>(0);

  const pauseAutoScrollTemporarily = useCallback((durationMs = 4500) => {
    isInteractingRef.current = true;
    if (userInteractingTimeoutRef.current) {
      clearTimeout(userInteractingTimeoutRef.current);
    }
    userInteractingTimeoutRef.current = setTimeout(() => {
      isInteractingRef.current = false;
    }, durationMs);
  }, []);

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

  const getScrollDistance = useCallback(() => {
    if (typeof window === 'undefined') return 340;
    const isMobile = window.innerWidth < 640;
    const cardsToScroll = isMobile ? cardsPerScrollMobile : cardsPerScrollDesktop;
    const firstChild = (trackRef.current?.firstElementChild as HTMLElement)?.firstElementChild as HTMLElement | null;
    const itemWidth = firstChild ? firstChild.offsetWidth + gap : isMobile ? 155 : 175;
    return itemWidth * cardsToScroll;
  }, [gap, cardsPerScrollDesktop, cardsPerScrollMobile]);

  const scrollBy = (offset: number) => {
    pauseAutoScrollTemporarily(5000);
    const current = x.get();
    const target = Math.max(-maxDrag, Math.min(0, current + offset));
    targetXRef.current = target;
    animate(x, target, {
      type: 'spring',
      stiffness: 300,
      damping: 32,
      mass: 0.8,
    });
  };

  // Continuous smooth auto-glide motion loop (silky frame-rate independent glide)
  useEffect(() => {
    if (!autoScroll || maxDrag <= 10) return;

    let rafId: number;
    lastFrameTimeRef.current = performance.now();

    const glideFrame = (now: number) => {
      const dt = Math.min((now - lastFrameTimeRef.current) / 1000, 0.08);
      lastFrameTimeRef.current = now;

      // Only advance when not hovered, not dragged, not manually interacting, and not in middle of reset animation
      if (
        !isHoveredRef.current &&
        !isDragging &&
        !isInteractingRef.current &&
        !isResettingRef.current
      ) {
        const currentX = x.get();
        const newX = currentX - autoScrollSpeed * dt;

        if (newX <= -maxDrag + 1) {
          // Reached the end of the 24-hour horizon: smoothly glide back to the start (Now)
          isResettingRef.current = true;
          targetXRef.current = 0;
          animate(x, 0, {
            duration: 1.8,
            ease: [0.25, 1, 0.5, 1],
            onComplete: () => {
              // Pause at start (Now) for 1.2s before resuming smooth glide
              setTimeout(() => {
                isResettingRef.current = false;
                lastFrameTimeRef.current = performance.now();
              }, 1200);
            },
          });
        } else {
          x.set(newX);
          targetXRef.current = newX;
        }
      }

      rafId = requestAnimationFrame(glideFrame);
    };

    rafId = requestAnimationFrame(glideFrame);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [autoScroll, maxDrag, isDragging, autoScrollSpeed, x]);

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
        pauseAutoScrollTemporarily(4500);
      } else {
        return;
      }

      // Smooth horizontal spring acceleration based on wheel delta
      const multiplier = 1.25;
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
  }, [maxDrag, x, pauseAutoScrollTemporarily]);

  return (
    <div
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
      }}
      className={`relative w-full select-none ${className}`}
    >
      {/* Top Header Controls: Navigation Arrow Buttons & Status (if enabled) */}
      {showArrows && (
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse shadow-sm" />
            <div className="carousel-helper-text text-slate-800 dark:text-white/90">
              {helperText || <span>Free scroll carousel • Drag or swipe horizontally</span>}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollBy(getScrollDistance())}
              disabled={!canScrollLeft}
              aria-label="Previous items"
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-white/20 hover:border-sky-400/50 flex items-center justify-center text-slate-700 dark:text-white transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer shadow-sm active:scale-95 backdrop-blur-md"
            >
              <ChevronLeftIcon size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(-getScrollDistance())}
              disabled={!canScrollRight}
              aria-label="Next items"
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-white/20 hover:border-sky-400/50 flex items-center justify-center text-slate-700 dark:text-white transition-all disabled:opacity-20 disabled:pointer-events-none cursor-pointer shadow-sm active:scale-95 backdrop-blur-md"
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
            pauseAutoScrollTemporarily(5000);
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
        >
          <AnimatedContent
            distance={120}
            direction="vertical"
            duration={1.4}
            ease="elastic.out(1, 0.55)"
            blur={0}
            stagger={0.08}
            threshold={0.1}
            className="flex items-stretch shrink-0 pr-4"
            style={{ gap: `${gap}px` }}
          >
            {children}
          </AnimatedContent>
        </motion.div>
      </div>
    </div>
  );
}
