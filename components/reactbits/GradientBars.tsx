'use client';

import React, { useEffect, useRef } from 'react';
import './GradientBars.css';

export interface GradientBarsProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  children?: React.ReactNode;
  barCount?: number;
  gradientPower?: number;
  balance?: number;
  speed?: number;
  phaseSpread?: number;
  mirrorRepeat?: number;
  alternateDirection?: number;
  invertSpeed?: number;
  phaseRange?: number;
  curvePower?: number;
  easingMode?: number; // 0=in, 1=out, 2=in-out
  color?: string;
  tintColor?: string;
  backgroundColor?: string;
  cursorInteraction?: boolean;
  style?: React.CSSProperties;
}

const hexToRgb = (hex: string): [number, number, number] => {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return [16, 185, 129];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

export const GradientBars: React.FC<GradientBarsProps> = ({
  width = '100%',
  height = '100%',
  className = '',
  children,
  barCount = 8,
  gradientPower = 0.25,
  balance = 0.15,
  speed = 0.12,
  phaseSpread = 4,
  mirrorRepeat = 2,
  alternateDirection = 0,
  invertSpeed = 0.2,
  phaseRange = 2,
  curvePower = 1,
  easingMode = 0,
  color,
  tintColor,
  backgroundColor = '#030712',
  cursorInteraction = true,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeColor = tintColor || color || '#10b981';
  const colorRgbRef = useRef(hexToRgb(activeColor));
  const bgRgbRef = useRef(hexToRgb(backgroundColor));

  useEffect(() => {
    colorRgbRef.current = hexToRgb(activeColor);
    bgRgbRef.current = hexToRgb(backgroundColor);
  }, [activeColor, backgroundColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let startTime = performance.now();
    let isVisible = true;
    let widthPx = container.clientWidth || window.innerWidth;
    let heightPx = container.clientHeight || window.innerHeight;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const mouse = {
      x: 0.5,
      y: 0.5,
      targetX: 0.5,
      targetY: 0.5,
      active: false,
    };

    const dpr = Math.min(2.0, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

    const resize = () => {
      widthPx = container.clientWidth || window.innerWidth;
      heightPx = container.clientHeight || window.innerHeight;
      canvas.width = Math.floor(widthPx * dpr);
      canvas.height = Math.floor(heightPx * dpr);
    };
    resize();

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];
      isVisible = entry ? entry.isIntersecting : true;
      if (isVisible && !animId) {
        animId = requestAnimationFrame(render);
      }
    });
    intersectionObserver.observe(container);

    const handlePointerMove = (e: PointerEvent) => {
      if (!cursorInteraction) return;
      const rect = container.getBoundingClientRect();
      mouse.targetX = clamp((e.clientX - rect.left) / widthPx, 0, 1);
      mouse.targetY = clamp((e.clientY - rect.top) / heightPx, 0, 1);
      mouse.active = true;
    };

    const handlePointerLeave = () => {
      mouse.targetX = 0.5;
      mouse.targetY = 0.5;
      mouse.active = false;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', handlePointerLeave);

    const numBars = clamp(Math.round(barCount), 1, 32);
    const repeats = clamp(Math.round(mirrorRepeat), 1, 8);
    const totalBars = numBars * repeats;

    const applyEasing = (tNorm: number, mode: number, power: number): number => {
      const p = Math.max(0.2, power);
      const val = clamp(tNorm, 0, 1);
      if (mode === 0) {
        // Ease in
        return Math.pow(val, p);
      }
      if (mode === 1) {
        // Ease out
        return 1 - Math.pow(1 - val, p);
      }
      // Ease in-out
      return val < 0.5
        ? Math.pow(2 * val, p) / 2
        : 1 - Math.pow(-2 * val + 2, p) / 2;
    };

    const render = (now: number) => {
      animId = 0;
      if (!isVisible) return;

      const t = (now - startTime) / 1000;

      // Mouse smoothing
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(dpr, dpr);

      const [tr, tg, tb] = colorRgbRef.current;
      const [br, bg, bb] = bgRgbRef.current;

      // Fill background
      ctx.fillStyle = `rgb(${br}, ${bg}, ${bb})`;
      ctx.fillRect(0, 0, widthPx, heightPx);

      const barWidth = widthPx / totalBars;
      const animSpeed = prefersReducedMotion ? 0.03 : speed * 1.8;

      for (let i = 0; i < totalBars; i++) {
        const mirrorIdx = Math.floor(i / numBars);
        const barInGroup = i % numBars;

        // Symmetric mirror logic
        const col = mirrorIdx % 2 === 1 ? numBars - 1 - barInGroup : barInGroup;

        // Phase offset calculation
        const spreadPhase = (col / Math.max(1, numBars - 1)) * phaseSpread;
        const dir = alternateDirection === 1 && col % 2 === 1 ? -1 : 1;
        const invertFactor = Math.sin(t * invertSpeed * Math.PI) > 0 ? 1 : -1;

        // Wave formula
        const timeFactor = t * animSpeed * Math.PI * 2 * dir * invertFactor;
        const rawWave = Math.sin(timeFactor + spreadPhase);

        // Normalize to 0..1
        let waveNorm = rawWave * 0.5 + 0.5;

        // Cursor modulation if enabled
        if (cursorInteraction && mouse.active) {
          const barNormalizedX = (i + 0.5) / totalBars;
          const distToCursor = Math.abs(barNormalizedX - mouse.x);
          const cursorInfluence = Math.max(0, 1 - distToCursor * 3.5);
          waveNorm = clamp(
            waveNorm + (1 - mouse.y - 0.5) * cursorInfluence * 0.5,
            0,
            1
          );
        }

        // Apply easing curve & power
        const easedWave = applyEasing(waveNorm, easingMode, curvePower);

        // Calculate vertical gradient wave shift
        const waveShift = (easedWave - 0.5) * heightPx * (phaseRange * 0.35);
        const balanceOffset = (balance - 0.5) * heightPx * 0.6;
        const centerY = heightPx * 0.5 + waveShift + balanceOffset;

        // Gradient spread based on gradientPower
        const span = Math.max(80, heightPx * (0.3 + gradientPower * 0.9));
        const topY = centerY - span;
        const bottomY = centerY + span;

        const x = i * barWidth;
        const w = barWidth + 0.5; // avoid subpixel seams

        const grad = ctx.createLinearGradient(x, topY, x, bottomY);
        // Base dark fade
        grad.addColorStop(0, `rgba(${br}, ${bg}, ${bb}, 1)`);
        // Mid-glow transition
        grad.addColorStop(0.35, `rgba(${tr}, ${tg}, ${tb}, ${Math.min(1, 0.45 + gradientPower * 0.35).toFixed(3)})`);
        // Peak bright wave center
        grad.addColorStop(0.5, `rgba(${Math.min(255, tr + 45)}, ${Math.min(255, tg + 45)}, ${Math.min(255, tb + 45)}, 0.98)`);
        // Lower glow transition
        grad.addColorStop(0.65, `rgba(${tr}, ${tg}, ${tb}, ${Math.min(1, 0.45 + gradientPower * 0.35).toFixed(3)})`);
        // Fade to base dark
        grad.addColorStop(1, `rgba(${br}, ${bg}, ${bb}, 1)`);

        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, w, heightPx);

        // Subtle bar separator hairline for the "bars" definition
        ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, 0.28)`;
        ctx.fillRect(x + w - 1, 0, 1, heightPx);
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [
    barCount,
    gradientPower,
    balance,
    speed,
    phaseSpread,
    mirrorRepeat,
    alternateDirection,
    invertSpeed,
    phaseRange,
    curvePower,
    easingMode,
    cursorInteraction,
  ]);

  return (
    <div
      ref={containerRef}
      className={`gradient-bars-container ${className}`.trim()}
      style={{
        width,
        height,
        '--gb-bg': backgroundColor,
        ...style,
      } as React.CSSProperties}
    >
      <canvas ref={canvasRef} className="gradient-bars-canvas" aria-hidden="true" />
      {children && <div className="gradient-bars-content">{children}</div>}
    </div>
  );
};

export default GradientBars;

