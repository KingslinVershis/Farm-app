'use client';

import React, { useEffect, useRef, useState } from 'react';
import './Lightspeed.css';

export interface LightspeedProps {
  width?: number | string;
  height?: number | string;
  speed?: number;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  streakCount?: number;
  stretchFactor?: number;
  intensity?: number;
  interactionEnabled?: boolean;
  rotation?: number;
  fadePower?: number;
  opacity?: number;
  quality?: 'low' | 'medium' | 'high';
  maxFPS?: number;
  pauseWhenOffscreen?: boolean;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

interface Star {
  x: number;
  y: number;
  z: number;
  colorType: 0 | 1 | 2;
  size: number;
  baseAlpha: number;
}

const hexToRgb = (hex: string): [number, number, number] => {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

export const Lightspeed: React.FC<LightspeedProps> = ({
  width = '100%',
  height = '100%',
  speed = 1.0,
  primaryColor = '#10b981',
  secondaryColor = '#06b6d4',
  tertiaryColor = '#3b82f6',
  streakCount = 140,
  stretchFactor = 0.05,
  intensity = 1.0,
  interactionEnabled = true,
  rotation = 0,
  fadePower = 2.0,
  opacity = 1.0,
  quality = 'medium',
  maxFPS = 60,
  pauseWhenOffscreen = true,
  className = '',
  children,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Parse color arrays for canvas rendering
  const colorsRef = useRef({
    primary: hexToRgb(primaryColor),
    secondary: hexToRgb(secondaryColor),
    tertiary: hexToRgb(tertiaryColor),
  });

  useEffect(() => {
    colorsRef.current = {
      primary: hexToRgb(primaryColor),
      secondary: hexToRgb(secondaryColor),
      tertiary: hexToRgb(tertiaryColor),
    };
  }, [primaryColor, secondaryColor, tertiaryColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();
    let isVisible = true;
    let widthPx = container.clientWidth || window.innerWidth;
    let heightPx = container.clientHeight || window.innerHeight;

    // Check user preference for reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Pointer state for reactive hyperspace steering & warp click
    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      active: false,
      warpBoost: 1.0,
    };

    // Quality scaling factor
    const dpr =
      quality === 'low'
        ? 1
        : quality === 'medium'
        ? Math.min(1.5, window.devicePixelRatio || 1)
        : Math.min(2.0, window.devicePixelRatio || 1);

    const resize = () => {
      widthPx = container.clientWidth || window.innerWidth;
      heightPx = container.clientHeight || window.innerHeight;
      canvas.width = Math.floor(widthPx * dpr);
      canvas.height = Math.floor(heightPx * dpr);
    };
    resize();

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(container);

    // Visibility observer to pause animation when offscreen
    let intersectionObserver: IntersectionObserver | null = null;
    if (pauseWhenOffscreen) {
      intersectionObserver = new IntersectionObserver((entries) => {
        const entry = entries[0];
        isVisible = entry ? entry.isIntersecting : true;
        if (isVisible && !animId) {
          lastTime = performance.now();
          animId = requestAnimationFrame(render);
        }
      });
      intersectionObserver.observe(container);
    }

    // Pointer events
    const handlePointerMove = (e: PointerEvent) => {
      if (!interactionEnabled) return;
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / widthPx - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / heightPx - 0.5) * 2;
      pointer.targetX = nx * 80;
      pointer.targetY = ny * 80;
      pointer.active = true;
    };

    const handlePointerDown = () => {
      if (!interactionEnabled) return;
      pointer.warpBoost = 2.4;
    };

    const handlePointerUp = () => {
      pointer.warpBoost = 1.0;
    };

    const handlePointerLeave = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
      pointer.active = false;
      pointer.warpBoost = 1.0;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('blur', handlePointerLeave);

    // Initialize 3D Stars
    const MAX_DEPTH = 1600;
    const FOV = 280;
    const count = Math.max(30, Math.min(500, streakCount));
    const stars: Star[] = [];

    const initStar = (s?: Star): Star => {
      const spread = Math.max(widthPx, heightPx) * 1.4;
      const star = s || {
        x: 0,
        y: 0,
        z: 0,
        colorType: 0,
        size: 1,
        baseAlpha: 1,
      };

      // Distribute in a cylinder radiating outwards
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * spread;
      star.x = Math.cos(angle) * dist;
      star.y = Math.sin(angle) * dist;
      star.z = s ? MAX_DEPTH : Math.random() * MAX_DEPTH;
      star.colorType = (Math.random() < 0.4 ? 0 : Math.random() < 0.7 ? 1 : 2) as 0 | 1 | 2;
      star.size = 0.8 + Math.random() * 1.6;
      star.baseAlpha = 0.6 + Math.random() * 0.4;
      return star;
    };

    for (let i = 0; i < count; i++) {
      stars.push(initStar());
    }

    // Frame-rate limiting
    const frameInterval = 1000 / Math.max(15, Math.min(120, maxFPS));
    let rotAngle = rotation;

    const render = (now: number) => {
      animId = 0;
      if (!isVisible) return;

      const elapsed = now - lastTime;
      if (elapsed < frameInterval) {
        animId = requestAnimationFrame(render);
        return;
      }
      lastTime = now - (elapsed % frameInterval);

      // Smooth pointer interpolation
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;

      const effectiveSpeed = prefersReducedMotion
        ? 0.15
        : speed * pointer.warpBoost * 8.5;

      // Clear with soft alpha trail or full clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(dpr, dpr);

      // Center vanishing point
      const cx = widthPx / 2 + pointer.x;
      const cy = heightPx / 2 + pointer.y;

      // Apply overall rotation if specified
      if (rotAngle !== 0) {
        ctx.translate(cx, cy);
        ctx.rotate(rotAngle);
        ctx.translate(-cx, -cy);
      }

      // Draw subtle hyperspace core glow at vanishing point
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(120, widthPx * 0.22));
      const [cr, cg, cb] = colorsRef.current.primary;
      coreGrad.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${0.12 * intensity})`);
      coreGrad.addColorStop(0.5, `rgba(${colorsRef.current.secondary[0]}, ${colorsRef.current.secondary[1]}, ${colorsRef.current.secondary[2]}, ${0.04 * intensity})`);
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(120, widthPx * 0.22), 0, Math.PI * 2);
      ctx.fill();

      // Update and draw each streaking star
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Move star closer
        star.z -= effectiveSpeed;
        if (star.z <= 1) {
          initStar(star);
          continue;
        }

        // Current head position
        const k = FOV / star.z;
        const px = cx + star.x * k;
        const py = cy + star.y * k;

        // Tail position (streak stretching)
        const streakLength = effectiveSpeed * stretchFactor * 140;
        const tailZ = star.z + streakLength;
        const tk = FOV / tailZ;
        const tx = cx + star.x * tk;
        const ty = cy + star.y * tk;

        // Offscreen check
        if (
          (px < -80 && tx < -80) ||
          (px > widthPx + 80 && tx > widthPx + 80) ||
          (py < -80 && ty < -80) ||
          (py > heightPx + 80 && ty > heightPx + 80)
        ) {
          initStar(star);
          continue;
        }

        // Depth-based fade
        const depthRatio = Math.max(0, Math.min(1, 1 - star.z / MAX_DEPTH));
        const alpha = Math.pow(depthRatio, fadePower) * star.baseAlpha * intensity;
        if (alpha <= 0.01) continue;

        const rgb =
          star.colorType === 0
            ? colorsRef.current.primary
            : star.colorType === 1
            ? colorsRef.current.secondary
            : colorsRef.current.tertiary;

        const [r, g, b] = rgb;

        // Draw relativistic light streak with gradient
        const grad = ctx.createLinearGradient(tx, ty, px, py);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        grad.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.45).toFixed(3)})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${Math.min(1, alpha * 0.95).toFixed(3)})`);

        const lineWidth = Math.max(1.0, star.size * k * 0.7);

        ctx.strokeStyle = grad;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(px, py);
        ctx.stroke();

        // Bright star head dot
        if (depthRatio > 0.3) {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha * 1.1).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.8, lineWidth * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('blur', handlePointerLeave);
    };
  }, [
    speed,
    streakCount,
    stretchFactor,
    intensity,
    interactionEnabled,
    rotation,
    fadePower,
    quality,
    maxFPS,
    pauseWhenOffscreen,
  ]);

  return (
    <div
      ref={containerRef}
      className={`lightspeed-container ${className}`.trim()}
      style={{
        width,
        height,
        opacity,
        ...style,
      }}
    >
      <canvas ref={canvasRef} className="lightspeed-canvas" aria-hidden="true" />
      {children && <div className="lightspeed-content">{children}</div>}
    </div>
  );
};

export default Lightspeed;

