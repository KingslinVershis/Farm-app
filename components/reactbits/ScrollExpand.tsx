'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import './ScrollExpand.css';

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};

type ConfigKey =
  | 'startWidth'
  | 'startHeight'
  | 'startRadius'
  | 'endRadius'
  | 'mediaZoom'
  | 'scrollDistance'
  | 'holdDistance'
  | 'smoothing'
  | 'overlayScrim'
  | 'useWindowScroll'
  | 'enabled';

export interface ScrollExpandProps {
  src?: string;
  mediaType?: 'image' | 'video';
  poster?: string;
  alt?: string;
  title?: ReactNode;
  tractor?: ReactNode;
  explosion?: ReactNode;
  scrollHint?: string;
  startWidth?: number;
  startHeight?: number;
  startRadius?: number;
  endRadius?: number;
  mediaZoom?: number;
  scrollDistance?: number;
  holdDistance?: number;
  smoothing?: number;
  overlayScrim?: number;
  useWindowScroll?: boolean;
  enabled?: boolean;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}

const ScrollExpand: React.FC<ScrollExpandProps> = ({
  src = '',
  mediaType = 'image',
  poster = '',
  alt = '',
  title = '',
  tractor,
  explosion,
  scrollHint = '',
  startWidth = 42,
  startHeight = 58,
  startRadius = 24,
  endRadius = 0,
  mediaZoom = 1.35,
  scrollDistance = 1.2,
  holdDistance = 0.35,
  smoothing = 0.1,
  overlayScrim = 0.45,
  useWindowScroll = false,
  enabled = true,
  children,
  className = '',
  style,
  ...rest
}: ScrollExpandProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const tractorRef = useRef<HTMLDivElement | null>(null);
  const vehicleRef = useRef<HTMLDivElement | null>(null);
  const explosionRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const isIntersectingRef = useRef<boolean>(false);

  const playVideoSafely = useCallback(() => {
    const video = mediaRef.current;
    if (video instanceof HTMLVideoElement) {
      video.muted = true;
      video.defaultMuted = true;
      if (video.paused || video.ended) {
        const p = video.play();
        if (p !== undefined) {
          p.catch(() => {
            // Browser autoplay policy deferral; retried on scroll/interaction
          });
        }
      }
    }
  }, []);

  const propsRef = useRef<Required<Pick<ScrollExpandProps, ConfigKey>>>(
    {} as Required<Pick<ScrollExpandProps, ConfigKey>>
  );
  propsRef.current = {
    startWidth,
    startHeight,
    startRadius,
    endRadius,
    mediaZoom,
    scrollDistance,
    holdDistance,
    smoothing,
    overlayScrim,
    useWindowScroll,
    enabled,
  };

  const applyProgress = useCallback((p: number) => {
    const frame = frameRef.current;
    const media = mediaRef.current;
    if (!frame || !media) return;
    const c = propsRef.current;

    const e = smoothstep(0, 1, p);

    const w = c.startWidth + (100 - c.startWidth) * e;
    const h = c.startHeight + (100 - c.startHeight) * e;
    const ix = Math.max(0, (100 - w) / 2);
    const iy = Math.max(0, (100 - h) / 2);
    const r = c.startRadius + (c.endRadius - c.startRadius) * e;
    frame.style.clipPath = `inset(${iy}% ${ix}% ${iy}% ${ix}% round ${r}px)`;

    media.style.transform = `scale(${c.mediaZoom + (1 - c.mediaZoom) * e})`;

    if (scrimRef.current) scrimRef.current.style.opacity = `${c.overlayScrim * e}`;

    if (titleRef.current) {
      const out = smoothstep(0.22, 0.65, p);
      titleRef.current.style.opacity = `${1 - out}`;
      titleRef.current.style.transform = `translate3d(0, ${-32 * out}px, 0) scale(${1 + 0.05 * out})`;
    }

    if (tractorRef.current) {
      // Tractor starts centered initially (posX = 0 at p = 0) and drives to the right end
      // When reaching the right end, the explosion detonates!
      const stageW = stageRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200);
      const maxDistance = Math.min(stageW * 0.44, 750);

      // Travel progresses from center (0) at p = 0 to right end (+maxDistance)
      // Driving takes place smoothly as user scrolls between p = 0 and p = 0.76
      const driveProgress = clamp(p / 0.76, 0, 1);
      const easeDrive = driveProgress * driveProgress * (3 - 2 * driveProgress);
      const posX = easeDrive * maxDistance;

      // Natural tractor terrain physics (suspension bob and slight dynamic pitch)
      const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      const isPreExplosion = p < 0.76;
      const bump = reduceMotion || !isPreExplosion ? 0 : Math.sin(p * 28) * 3.2;
      const tilt = reduceMotion || !isPreExplosion ? 0 : Math.sin(p * 20) * 1.8;

      tractorRef.current.style.transform = `translate3d(${posX}px, ${bump}px, 0) rotate(${tilt}deg)`;

      // When reaching the right end (p >= 0.74), trigger explosion!
      const impact = smoothstep(0.73, 0.78, p);
      if (vehicleRef.current) {
        vehicleRef.current.style.opacity = `${1 - impact}`;
        vehicleRef.current.style.transform = `scale(${1 - 0.4 * impact})`;
      }

      if (explosionRef.current) {
        // Explosion bursts open at impact, then fades out as cards settle
        const explodeFade = smoothstep(0.86, 0.96, p);
        const explosionOpacity = impact * (1 - explodeFade);
        explosionRef.current.style.opacity = `${explosionOpacity}`;
        explosionRef.current.style.transform = `scale(${0.6 + 0.6 * impact})`;
        explosionRef.current.style.display = impact > 0.05 && explodeFade < 1 ? 'flex' : 'none';
      }
    }

    if (hintRef.current) {
      const gone = smoothstep(0, 0.12, p);
      hintRef.current.style.opacity = `${1 - gone}`;
      hintRef.current.style.transform = `translate3d(0, ${8 * gone}px, 0)`;
    }

    if (overlayRef.current) {
      const inn = smoothstep(0.68, 1, p);
      overlayRef.current.style.opacity = `${inn}`;
      overlayRef.current.style.transform = `translate3d(0, ${18 * (1 - inn)}px, 0)`;
      overlayRef.current.style.pointerEvents = inn > 0.4 ? 'auto' : 'none';
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!root || !track || !stage) return;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    let raf = 0;
    let current = 0;
    let target = 0;
    let stageH = 0;
    let running = false;

    const measure = () => {
      const c = propsRef.current;
      stageH = c.useWindowScroll ? window.innerHeight : root.clientHeight;
      if (stageH <= 0) return;
      stage.style.height = `${stageH}px`;
      track.style.height = `${stageH * (1 + Math.max(0, c.scrollDistance) + Math.max(0, c.holdDistance))}px`;

      const w = root.clientWidth || stageH;
      stage.style.setProperty('--se-title-size', `${clamp(w * 0.065, 22, 72)}px`);
    };

    const readProgress = () => {
      const c = propsRef.current;
      if (!c.enabled) return 1;
      const span = stageH * Math.max(0.01, c.scrollDistance);
      if (c.useWindowScroll) {
        const top = track.getBoundingClientRect().top;
        return clamp(-top / span, 0, 1);
      }
      return clamp(root.scrollTop / span, 0, 1);
    };

    const tick = () => {
      const c = propsRef.current;
      const k = c.smoothing <= 0 ? 1 : 1 - Math.exp(-1 / (60 * c.smoothing));
      current += (target - current) * k;
      if (Math.abs(target - current) < 0.0004) {
        current = target;
        running = false;
      }
      if (isIntersectingRef.current) {
        playVideoSafely();
      }
      applyProgress(current);
      raf = running ? requestAnimationFrame(tick) : 0;
    };

    const kick = () => {
      if (running) return;
      running = true;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = readProgress();
      if (isIntersectingRef.current) {
        playVideoSafely();
      }
      if (propsRef.current.smoothing <= 0 || reduceMotion) {
        current = target;
        applyProgress(current);
        return;
      }
      kick();
    };

    const onResize = () => {
      measure();
      target = readProgress();
      current = target;
      applyProgress(current);
    };

    measure();
    target = readProgress();
    current = target;
    applyProgress(current);

    // Initial DOM property setup & play attempt for video
    if (mediaRef.current instanceof HTMLVideoElement) {
      mediaRef.current.muted = true;
      mediaRef.current.defaultMuted = true;
      playVideoSafely();
    }

    // IntersectionObserver to ensure playback starts/resumes whenever video is in or approaching viewport
    let io: IntersectionObserver | null = null;
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            isIntersectingRef.current = entry.isIntersecting;
            if (entry.isIntersecting) {
              playVideoSafely();
            }
          }
        },
        { rootMargin: '300px 0px 300px 0px', threshold: [0, 0.1, 0.25, 0.5] }
      );
      io.observe(root);
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isIntersectingRef.current) {
        playVideoSafely();
      }
    };
    const handleWindowFocus = () => {
      if (isIntersectingRef.current) {
        playVideoSafely();
      }
    };
    const handleInteraction = () => {
      if (isIntersectingRef.current) {
        playVideoSafely();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('pointerdown', handleInteraction, { passive: true });

    const scroller = useWindowScroll ? window : root;
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(root);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [applyProgress, playVideoSafely, useWindowScroll]);

  const isCloudinary = typeof src === 'string' && src.includes('cloudinary.com');
  const optimizedSrc =
    isCloudinary && src.endsWith('.mov')
      ? src.replace('/upload/', '/upload/f_auto,q_auto/').replace(/\.mov$/, '.mp4')
      : src;

  const derivedPoster =
    poster ||
    (isCloudinary
      ? optimizedSrc
          .replace(/\.(mp4|mov|webm)(\?.*)?$/i, '.jpg$2')
          .replace('/upload/', '/upload/so_0,f_auto,q_auto/')
      : undefined);

  const media =
    mediaType === 'video' ? (
      <video
        ref={mediaRef as React.RefObject<HTMLVideoElement>}
        className="scroll-expand__media"
        src={optimizedSrc}
        poster={derivedPoster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
        onCanPlay={playVideoSafely}
        onLoadedData={playVideoSafely}
        onPause={() => {
          if (isIntersectingRef.current) {
            playVideoSafely();
          }
        }}
        onEnded={playVideoSafely}
      />
    ) : (
      <img
        ref={mediaRef as React.RefObject<HTMLImageElement>}
        className="scroll-expand__media"
        src={src}
        alt={alt}
        draggable={false}
      />
    );

  return (
    <div
      ref={rootRef}
      className={`scroll-expand ${useWindowScroll ? '' : 'scroll-expand--scroller'} ${className}`.trim()}
      style={style}
      {...rest}
    >
      <div ref={trackRef} className="scroll-expand__track">
        <div ref={stageRef} className="scroll-expand__stage">
          <div ref={frameRef} className="scroll-expand__frame">
            {media}
            <div ref={scrimRef} className="scroll-expand__scrim" />
            {children ? (
              <div ref={overlayRef} className="scroll-expand__overlay">
                {children}
              </div>
            ) : null}
          </div>
          {(title || tractor) ? (
            <div className="scroll-expand__header-wrapper">
              {title ? (
                <div ref={titleRef} className="scroll-expand__title">
                  {title}
                </div>
              ) : null}
              {tractor ? (
                <div ref={tractorRef} className="scroll-expand__tractor">
                  <div ref={vehicleRef} className="scroll-expand__vehicle">
                    {tractor}
                  </div>
                  {explosion ? (
                    <div ref={explosionRef} className="scroll-expand__explosion">
                      {explosion}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          {scrollHint ? (
            <div ref={hintRef} className="scroll-expand__hint">
              {scrollHint}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ScrollExpand;
