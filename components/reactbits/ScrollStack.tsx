'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRightIcon } from '@/components/icons/Icons';
import AnimatedContent from './AnimatedContent';
import { useLanguage } from '@/components/providers/LanguageProvider';

export interface ScrollStackItemData {
  id?: string | number;
  eyebrow?: string;
  title: string;
  body: string;
  image: string;
  accent?: string;
  tag?: string;
  meta?: React.ReactNode;
  link?: string;
  linkText?: string;
}

export interface ScrollStackItemProps {
  itemClassName?: string;
  className?: string;
  children: ReactNode;
}

export const ScrollStackItem: React.FC<ScrollStackItemProps> = ({
  itemClassName = '',
  className = '',
  children,
}) => (
  <div className={`scroll-stack-card relative w-full ${itemClassName} ${className}`.trim()}>
    {children}
  </div>
);

export interface ScrollStackProps {
  items?: ScrollStackItemData[];
  children?: ReactNode;
  className?: string;
  cardClassName?: string;
  /** Gap / scroll runway between cards before they stack (in px) */
  itemDistance?: number;
  /** Scale reduction per stacked card */
  itemScale?: number;
  /** Vertical offset between stacked cards (in px, 0 for flush stacking) */
  itemStackDistance?: number;
  /** Viewport / container top position where cards pin (px or string like "96px" or "15%") */
  stackPosition?: string | number;
  /** Position threshold where scaling concludes */
  scaleEndPosition?: string | number;
  /** Scale reached when completely stacked behind incoming cards */
  baseScale?: number;
  /** Blur radius (in px) applied to receding background cards */
  blurAmount?: number;
  /** How much background cards fade away (0 to 1, where 1 = completely transparent) */
  fadeAmount?: number;
  /** Whether to track global browser window scroll (default: true) */
  useWindowScroll?: boolean;
  /** Callback fired when all cards finish stacking */
  onStackComplete?: () => void;
  /** Enable 1-scroll per card smooth wheel stepping (default: true) */
  enableOneScrollStep?: boolean;
  /** Duration of scroll transition between cards in ms */
  scrollTransitionDuration?: number;

  // Compatibility props with existing code
  peek?: number;
  scaleStep?: number;
  blur?: number;
  dim?: number;
  topOffset?: number;
  isTamil?: boolean;
}

interface CardRenderProps {
  item: ScrollStackItemData;
  index: number;
  accentColor: string;
  cardClassName?: string;
  isTamil?: boolean;
}

function DefaultCardContent({
  item,
  index,
  accentColor,
  cardClassName = '',
  isTamil = false,
}: CardRenderProps) {
  const { messages } = useLanguage();
  const stk = messages.dashboard.scrollStack;
  return (
    <div
      className={`relative rounded-[28px] sm:rounded-[36px] border border-border-light bg-surface dark:bg-[#0c1322] backdrop-blur-2xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.45)] overflow-hidden p-6 sm:p-8 lg:p-10 ${cardClassName}`}
    >
      {/* Top Subtle Luminous Accent Line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-75 pointer-events-none z-30"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />

      {/* Lite Blur Effect at Top of Card while scrolled */}
      <div
        className="absolute top-0 left-0 right-0 h-28 pointer-events-none rounded-t-[28px] sm:rounded-t-[36px] overflow-hidden z-20"
        style={{
          background:
            'linear-gradient(to bottom, rgba(12, 19, 34, 0.72) 0%, rgba(12, 19, 34, 0.3) 45%, transparent 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          maskImage: 'linear-gradient(to bottom, black 35%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 35%, transparent 100%)',
        }}
      />

      {/* Ambient Subtle Accent Glow */}
      <div
        className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Eyebrow, Title, Body, Metadata & CTA */}
        <div className="lg:col-span-6 space-y-5">
          {item.eyebrow && (
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest border"
              style={{
                borderColor: `${accentColor}40`,
                backgroundColor: `${accentColor}15`,
                color: accentColor,
              }}
            >
              <span>{item.eyebrow}</span>
            </div>
          )}

          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-text-main leading-tight m-0">
            {item.title}
          </h3>

          <p className="text-sm sm:text-base text-text-secondary leading-relaxed font-normal m-0">
            {item.body}
          </p>

          <div className="pt-2 flex items-center gap-4 flex-wrap">
            <Link
              href={item.link || '/fertilizer'}
              className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer text-white !text-white hover:brightness-110 active:scale-95"
              style={{ backgroundColor: accentColor }}
            >
              <span className="text-white !text-white">{item.linkText || stk.exploreProtocol}</span>
              <ArrowUpRightIcon size={14} className="text-white !text-white" />
            </Link>
          </div>
        </div>

        {/* Right Column: High-Res Visual Showcase */}
        <div className="lg:col-span-6 relative">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl aspect-[16/10] group bg-black/20">
            <Image
              src={item.image}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={index <= 1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScrollStack({
  items,
  children,
  className = '',
  cardClassName = '',
  itemDistance = 160,
  itemScale = 0.04,
  itemStackDistance = 0,
  stackPosition = 96,
  baseScale = 0.93,
  blurAmount = 3.5,
  fadeAmount = 0.92,
  useWindowScroll = true,
  onStackComplete,
  // Fallbacks / aliases
  peek,
  scaleStep,
  blur,
  dim,
  topOffset,
  isTamil = false,
}: ScrollStackProps) {
  // Normalize prop aliases
  const effectiveDistance = itemDistance;
  const effectiveScaleStep = scaleStep ?? itemScale;
  const effectiveStackDistance = peek ?? itemStackDistance;
  const effectiveStackPosition = topOffset ?? stackPosition;
  const effectiveBlur = blur ?? blurAmount;
  const effectiveFade = dim ?? fadeAmount;

  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const lastTransformsRef = useRef<Map<number, { scale: number; opacity: number; blur: number }>>(
    new Map()
  );
  const animationFrameRef = useRef<number | null>(null);
  const stackCompletedRef = useRef(false);

  const totalCards = items?.length ?? React.Children.count(children);

  const parsePercentage = useCallback(
    (value: string | number, containerHeight: number) => {
      if (typeof value === 'string') {
        if (value.includes('%')) {
          return (parseFloat(value) / 100) * containerHeight;
        }
        return parseFloat(value) || 0;
      }
      return value;
    },
    []
  );

  const stackPositionPx = typeof effectiveStackPosition === 'number'
    ? effectiveStackPosition
    : 96;

  const updateCardTransforms = useCallback(() => {
    if (totalCards <= 0) return;

    const viewportHeight = window.innerHeight;
    const currentStackPositionPx = parsePercentage(effectiveStackPosition, viewportHeight);

    let allStacked = true;

    for (let i = 0; i < totalCards; i++) {
      const card = cardsRef.current[i];
      if (!card) continue;

      const isLastCard = i === totalCards - 1;

      // The last card never scales down or fades away
      if (isLastCard) {
        const lastCardRect = card.getBoundingClientRect();
        const targetTop = currentStackPositionPx + i * effectiveStackDistance;
        if (lastCardRect.top > targetTop + 5) {
          allStacked = false;
        }

        // Keep last card pristine
        const cached = lastTransformsRef.current.get(i);
        if (!cached || cached.scale !== 1 || cached.opacity !== 1 || cached.blur !== 0) {
          card.style.transform = 'scale(1)';
          card.style.opacity = '1';
          card.style.filter = 'none';
          lastTransformsRef.current.set(i, { scale: 1, opacity: 1, blur: 0 });
        }
        continue;
      }

      // For cards before the last one, check the incoming next card (i + 1)
      const nextCard = cardsRef.current[i + 1];
      if (!nextCard) continue;

      const nextCardRect = nextCard.getBoundingClientRect();
      const nextTargetTop = currentStackPositionPx + (i + 1) * effectiveStackDistance;

      // Generous, smooth transition runway across card arrival (tuned for 1 continuous fluid scroll)
      const cardHeight = card.offsetHeight || 440;
      const transitionRunway = Math.max(260, Math.min(cardHeight * 0.95, effectiveDistance + 240));

      // Calculate arrival progress of next card (0 = far away, 1 = landed on top of card i)
      const distanceRemaining = nextCardRect.top - nextTargetTop;
      let progress = 0;

      if (distanceRemaining <= 0) {
        progress = 1;
      } else if (distanceRemaining < transitionRunway) {
        progress = 1 - distanceRemaining / transitionRunway;
      } else {
        progress = 0;
        allStacked = false;
      }

      // Smooth cubic ease-out curve for natural, elegant motion without abrupt snaps
      const easedProgress = Math.min(1, Math.max(0, 1 - Math.pow(1 - progress, 2.5)));

      // Calculate scale, opacity, and lite blur
      const targetScale = Math.max(baseScale, 1 - effectiveScaleStep * (totalCards - i));
      const currentScale = 1 - easedProgress * (1 - targetScale);
      const currentOpacity = Math.max(0.42, 1 - easedProgress * effectiveFade);
      const currentBlur = easedProgress * effectiveBlur;

      const roundedScale = Math.round(currentScale * 1000) / 1000;
      const roundedOpacity = Math.round(currentOpacity * 100) / 100;
      const roundedBlur = Math.round(currentBlur * 10) / 10;

      // Check cache to avoid unnecessary DOM writes
      const last = lastTransformsRef.current.get(i);
      if (
        !last ||
        Math.abs(last.scale - roundedScale) > 0.002 ||
        Math.abs(last.opacity - roundedOpacity) > 0.01 ||
        Math.abs(last.blur - roundedBlur) > 0.1
      ) {
        card.style.transform = `scale(${roundedScale})`;
        card.style.opacity = `${roundedOpacity}`;
        card.style.filter = roundedBlur > 0 ? `blur(${roundedBlur}px)` : 'none';
        lastTransformsRef.current.set(i, {
          scale: roundedScale,
          opacity: roundedOpacity,
          blur: roundedBlur,
        });
      }
    }

    if (allStacked && !stackCompletedRef.current) {
      stackCompletedRef.current = true;
      if (onStackComplete) {
        onStackComplete();
      }
    } else if (!allStacked && stackCompletedRef.current) {
      stackCompletedRef.current = false;
    }
  }, [
    totalCards,
    effectiveStackPosition,
    effectiveStackDistance,
    effectiveDistance,
    effectiveScaleStep,
    baseScale,
    effectiveFade,
    effectiveBlur,
    parsePercentage,
    onStackComplete,
  ]);

  // Window scroll & resize listeners for continuous smooth card transforms
  useEffect(() => {
    const handleScroll = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(updateCardTransforms);
    };

    const targetElement = useWindowScroll ? window : containerRef.current;
    if (targetElement) {
      targetElement.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('resize', handleScroll, { passive: true });

    // Initial calculation
    handleScroll();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (targetElement) {
        targetElement.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', handleScroll);
    };
  }, [useWindowScroll, updateCardTransforms]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      style={{
        overflow: useWindowScroll ? 'visible' : 'auto',
      }}
    >
      {items && items.length > 0 ? (
        items.map((item, index) => {
          const isLast = index === items.length - 1;
          const topValue = stackPositionPx + index * effectiveStackDistance;
          const accentColor = item.accent || '#10b981';

          return (
            <div
              key={item.id ?? index}
              ref={(el) => {
                cardsRef.current[index] = el;
              }}
              style={{
                position: 'sticky',
                top: `${topValue}px`,
                zIndex: 10 + index,
                marginBottom: isLast ? 0 : `${effectiveDistance}px`,
                transformOrigin: 'top center',
                willChange: 'transform, opacity, filter',
              }}
              className="w-full"
            >
              <AnimatedContent
                distance={120}
                direction="horizontal"
                duration={1.1}
                ease="back.out(1.6)"
                blur={0}
                stagger={0.08}
                threshold={0.1}
                className="w-full"
              >
                <DefaultCardContent
                  item={item}
                  index={index}
                  accentColor={accentColor}
                  cardClassName={cardClassName}
                  isTamil={isTamil}
                />
              </AnimatedContent>
            </div>
          );
        })
      ) : children ? (
        React.Children.map(children, (child, index) => {
          const isLast = index === React.Children.count(children) - 1;
          const topValue = stackPositionPx + index * effectiveStackDistance;

          return (
            <div
              key={index}
              ref={(el) => {
                cardsRef.current[index] = el;
              }}
              style={{
                position: 'sticky',
                top: `${topValue}px`,
                zIndex: 10 + index,
                marginBottom: isLast ? 0 : `${effectiveDistance}px`,
                transformOrigin: 'top center',
                willChange: 'transform, opacity, filter',
              }}
              className={`w-full ${cardClassName}`}
            >
              <AnimatedContent
                distance={120}
                direction="horizontal"
                duration={1.1}
                ease="back.out(1.6)"
                blur={0}
                stagger={0.08}
                threshold={0.1}
                className="w-full"
              >
                {child}
              </AnimatedContent>
            </div>
          );
        })
      ) : null}

      {/* Spacer so the last card rests comfortably before transitioning to the next section */}
      <div className="w-full h-[15vh] sm:h-[20vh] pointer-events-none" />
    </div>
  );
}
