'use client';

import React, { memo, useEffect, useLayoutEffect, useRef } from 'react';
import './ReflectiveCard.css';

export interface ReflectiveCardProps {
  children: React.ReactNode;
  enableTilt?: boolean;
  tiltStrength?: number;
  glare?: number;
  intro?: boolean;
  width?: number | string;
  height?: number | string;
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toPx = (value: number | string) => (typeof value === 'number' ? `${value}px` : value);

/**
 * Interactive 3D-tilting reflective iPhone-glass card with spring physics,
 * pointer-tracked specular glare, brushed sheen, and `.glass-panel` transparency.
 */
const ReflectiveCard: React.FC<ReflectiveCardProps> = ({
  children,
  enableTilt = true,
  tiltStrength = 10,
  glare = 0.85,
  intro = true,
  width = '100%',
  height = 'auto',
  radius = 24,
  className = '',
  style,
  onClick,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);

  const settingsRef = useRef({
    enableTilt,
    tiltStrength: clamp(tiltStrength, 0, 24),
    glare: clamp(glare, 0, 1),
    intro,
  });
  settingsRef.current = {
    enableTilt,
    tiltStrength: clamp(tiltStrength, 0, 24),
    glare: clamp(glare, 0, 1),
    intro,
  };

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !settingsRef.current.intro) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.style.setProperty('--rc-presence', '0');
    root.style.setProperty('--rc-lift', '12px');
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const x = { p: 0, v: 0, target: 0 };
    const y = { p: 0, v: 0, target: 0 };
    const light = { p: 0, target: 0 };
    const pointer = { xPct: 50, yPct: 50 };
    let presence = settingsRef.current.intro && !reduced ? 0 : 1;
    const presenceStart = performance.now();
    let raf = 0;
    let last = 0;

    const write = () => {
      const { enableTilt: tiltOn, tiltStrength: strength, glare: maxGlare } = settingsRef.current;
      const angle = tiltOn && !reduced ? strength : 0;
      root.style.setProperty('--rc-rotate-x', `${(y.p * angle).toFixed(3)}deg`);
      root.style.setProperty('--rc-rotate-y', `${(-x.p * angle).toFixed(3)}deg`);
      root.style.setProperty('--rc-pointer-x', `${pointer.xPct.toFixed(2)}%`);
      root.style.setProperty('--rc-pointer-y', `${pointer.yPct.toFixed(2)}%`);
      root.style.setProperty('--rc-glare-opacity', `${(light.p * maxGlare).toFixed(3)}`);
      const eased = 1 - Math.pow(1 - presence, 3);
      root.style.setProperty('--rc-presence', eased.toFixed(4));
      root.style.setProperty('--rc-lift', `${((1 - eased) * 12).toFixed(2)}px`);
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;

      const stiffness = 130;
      const damping = 17;
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;

      for (let i = 0; i < steps; i++) {
        for (const axis of [x, y]) {
          axis.v += (stiffness * (axis.target - axis.p) - damping * axis.v) * h;
          axis.p += axis.v * h;
        }
      }

      const tau = light.target > light.p ? 0.16 : 0.4;
      light.p += (light.target - light.p) * (1 - Math.exp(-dt / tau));
      if (presence < 1) {
        presence = clamp((now - presenceStart) / 550, 0, 1);
      }

      const moving =
        Math.abs(x.target - x.p) > 0.0005 ||
        Math.abs(y.target - y.p) > 0.0005 ||
        Math.abs(x.v) > 0.0005 ||
        Math.abs(y.v) > 0.0005 ||
        Math.abs(light.target - light.p) > 0.002 ||
        presence < 1;

      if (!moving) {
        x.p = x.target;
        y.p = y.target;
        x.v = 0;
        y.v = 0;
        light.p = light.target;
      }

      write();
      if (moving) {
        raf = requestAnimationFrame(frame);
      }
    };

    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    wakeRef.current = wake;

    const aimAt = (clientX: number, clientY: number) => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const rx = clamp((clientX - rect.left) / rect.width, 0, 1);
      const ry = clamp((clientY - rect.top) / rect.height, 0, 1);
      pointer.xPct = rx * 100;
      pointer.yPct = ry * 100;
      x.target = rx * 2 - 1;
      y.target = ry * 2 - 1;
      light.target = 1;
      wake();
    };

    const release = () => {
      x.target = 0;
      y.target = 0;
      light.target = 0;
      wake();
    };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') aimAt(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') aimAt(e.clientX, e.clientY);
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') release();
    };

    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);

    write();
    if (presence < 1) wake();

    return () => {
      cancelAnimationFrame(raf);
      wakeRef.current = null;
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  const corner = Math.max(0, radius);
  const cardStyle: React.CSSProperties = {
    '--rc-width': toPx(width),
    '--rc-height': toPx(height),
    '--rc-radius': `${corner}px`,
    '--rc-pad': `${Math.round(clamp(corner * 0.85, 16, 22))}px`,
    '--rc-tile-radius': `${Math.round(clamp(corner * 0.5, 8, 14))}px`,
    ...style,
  } as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`reflective-card ${onClick ? 'cursor-pointer' : ''} ${className}`.trim()}
      style={cardStyle}
    >
      <div className="reflective-card__body glass-panel shadow-xl">
        <div className="reflective-card__sheen" aria-hidden="true" />
        <div className="reflective-card__glare" aria-hidden="true" />
        <div className="reflective-card__content">{children}</div>
        <span className="reflective-card__rim" aria-hidden="true" />
      </div>
    </div>
  );
};

export default memo(ReflectiveCard);

