'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface RisingLinesProps extends React.HTMLAttributes<HTMLDivElement> {
  lineColor?: string;
  glowColor?: string;
  particleColor?: string;
  lineCount?: number;
  particleCount?: number;
  speed?: number;
  horizonYPercent?: number;
}

interface RisingBeam {
  x: number;
  y: number; // tip y
  length: number;
  speed: number;
  width: number;
  opacity: number;
  maxOpacity: number;
  hasGlowHead: boolean;
}

interface Spark {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  maxOpacity: number;
  pulsePhase: number;
  pulseSpeed: number;
}

interface HorizonBristle {
  x: number;
  height: number;
  width: number;
  opacity: number;
  baseHeight: number;
  pulseSpeed: number;
  phase: number;
}

export function RisingLines({
  className,
  lineColor = '#ffffff',
  glowColor = '#10b981',
  particleColor = '#6ee7b7',
  lineCount = 95,
  particleCount = 65,
  speed = 1,
  horizonYPercent = 0.86,
  ...props
}: RisingLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const getHorizonY = () => height * horizonYPercent;

    // 1. Initialize Rising Beams - STRICTLY EMERGING FROM HORIZON LINE
    const beams: RisingBeam[] = [];
    const initBeams = () => {
      beams.length = 0;
      const horizonY = getHorizonY();
      for (let i = 0; i < lineCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const norm = (u + v) / 2;
        const x = norm * (width * 0.88) + width * 0.06;

        // Beams initialize at varied heights ABOVE the horizon line
        const beamLength = Math.random() * 140 + 35;
        const y = horizonY - Math.random() * (horizonY * 0.95);

        beams.push({
          x,
          y,
          length: beamLength,
          speed: (Math.random() * 1.5 + 0.8) * speed,
          width: Math.random() < 0.2 ? 1.8 : Math.random() * 0.8 + 0.6,
          opacity: Math.random() * 0.6 + 0.3,
          maxOpacity: Math.random() * 0.5 + 0.5,
          hasGlowHead: Math.random() > 0.3,
        });
      }
    };

    // 2. Initialize Sparks - Floating softly in space strictly ABOVE the horizon
    const sparks: Spark[] = [];
    const initSparks = () => {
      sparks.length = 0;
      const horizonY = getHorizonY();
      for (let i = 0; i < particleCount; i++) {
        sparks.push({
          x: Math.random() * (width * 0.86) + width * 0.07,
          y: Math.random() * (horizonY * 0.95),
          size: Math.random() * 2.0 + 0.8,
          speedY: (Math.random() * 0.55 + 0.18) * speed,
          speedX: (Math.random() - 0.5) * 0.25 * speed,
          opacity: Math.random() * 0.7 + 0.3,
          maxOpacity: Math.random() * 0.7 + 0.3,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.04 + 0.02,
        });
      }
    };

    // 3. Dense Horizon Bristles right on the horizontal line
    const bristles: HorizonBristle[] = [];
    const bristleCount = 280;
    const initBristles = () => {
      bristles.length = 0;
      for (let i = 0; i < bristleCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const norm = (u + v) / 2;
        const x = norm * (width * 0.82) + width * 0.09;
        const distFromCenter = Math.abs(x - width / 2) / (width * 0.41);
        const centerFactor = Math.max(0, 1 - distFromCenter * distFromCenter);
        const baseH = (Math.random() * 42 + 8) * centerFactor;

        bristles.push({
          x,
          height: baseH,
          baseHeight: baseH,
          width: Math.random() * 0.8 + 0.4,
          opacity: (Math.random() * 0.5 + 0.35) * centerFactor,
          pulseSpeed: Math.random() * 2 + 1.5,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    initBeams();
    initSparks();
    initBristles();

    let time = 0;

    const render = () => {
      time += 0.02;
      const horizonY = getHorizonY();

      // Deep solid pitch black background
      ctx.fillStyle = '#010403';
      ctx.fillRect(0, 0, width, height);

      // =========================================================================
      // LAYER 1: AMBIENT GLOW (FLAT RECTANGLE GRADIENTS - ZERO CURVES)
      // =========================================================================
      ctx.save();
      // Floor reflection strictly below horizonY
      const floorGrad = ctx.createRadialGradient(
        width / 2,
        horizonY,
        0,
        width / 2,
        horizonY,
        width * 0.36
      );
      floorGrad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      floorGrad.addColorStop(0.2, 'rgba(5, 150, 105, 0.16)');
      floorGrad.addColorStop(0.5, 'rgba(4, 120, 87, 0.04)');
      floorGrad.addColorStop(1, 'rgba(1, 4, 3, 0)');

      ctx.fillStyle = floorGrad;
      // Flat rectangle from horizon down to bottom - NO curved arc/ellipse!
      ctx.fillRect(0, horizonY, width, height - horizonY);

      // Sky ambient aura strictly above horizonY
      const skyGrad = ctx.createRadialGradient(
        width / 2,
        horizonY,
        0,
        width / 2,
        horizonY,
        width * 0.36
      );
      skyGrad.addColorStop(0, 'rgba(52, 211, 153, 0.45)');
      skyGrad.addColorStop(0.18, 'rgba(16, 185, 129, 0.22)');
      skyGrad.addColorStop(0.45, 'rgba(5, 150, 105, 0.08)');
      skyGrad.addColorStop(0.75, 'rgba(4, 120, 87, 0.02)');
      skyGrad.addColorStop(1, 'rgba(1, 4, 3, 0)');

      ctx.fillStyle = skyGrad;
      // Flat rectangle spanning above the horizon - NO curved arc/ellipse!
      const skyGlowHeight = Math.min(horizonY, 220);
      ctx.fillRect(0, horizonY - skyGlowHeight, width, skyGlowHeight);
      ctx.restore();

      // =========================================================================
      // LAYER 2: DENSE HORIZON LASER BRISTLES (Anchored strictly ON the line)
      // =========================================================================
      ctx.save();
      for (let i = 0; i < bristles.length; i++) {
        const br = bristles[i];
        const currentH = br.baseHeight * (0.85 + Math.sin(time * br.pulseSpeed + br.phase) * 0.15);
        const spikeGrad = ctx.createLinearGradient(br.x, horizonY, br.x, horizonY - currentH);
        spikeGrad.addColorStop(0, `rgba(255, 255, 255, ${br.opacity})`);
        spikeGrad.addColorStop(0.35, `rgba(52, 211, 153, ${br.opacity * 0.85})`);
        spikeGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

        ctx.strokeStyle = spikeGrad;
        ctx.lineWidth = br.width;
        ctx.beginPath();
        ctx.moveTo(br.x, horizonY);
        ctx.lineTo(br.x, horizonY - currentH);
        ctx.stroke();
      }
      ctx.restore();

      // =========================================================================
      // LAYER 3: ASCENDING RISING LIGHT BEAMS (RISING FROM THE HORIZONTAL LINE)
      // =========================================================================
      ctx.save();
      for (let i = 0; i < beams.length; i++) {
        const b = beams[i];
        b.y -= b.speed; // move leading tip upward

        const tipY = b.y;
        const tailY = b.y + b.length;

        // Reset when the entire line has traveled above the top
        if (tailY < 0) {
          b.y = horizonY;
          b.length = Math.random() * 130 + 35;
          b.speed = (Math.random() * 1.5 + 0.8) * speed;
          const u = Math.random();
          const v = Math.random();
          b.x = ((u + v) / 2) * (width * 0.88) + width * 0.06;
        }

        // CLAMP: The line must NEVER be drawn below the horizontal line!
        // The bottom of the line is strictly clamped to horizonY
        if (tipY < horizonY) {
          const clampedTailY = Math.min(horizonY, tailY);
          const heightRatio = Math.max(0, Math.min(1, tipY / horizonY));
          const currentOpacity = b.maxOpacity * (0.15 + heightRatio * 0.85);

          const beamGrad = ctx.createLinearGradient(b.x, clampedTailY, b.x, tipY);
          beamGrad.addColorStop(0, 'rgba(5, 150, 105, 0)');
          beamGrad.addColorStop(0.3, `rgba(52, 211, 153, ${currentOpacity * 0.5})`);
          beamGrad.addColorStop(0.7, `rgba(167, 243, 208, ${currentOpacity * 0.85})`);
          beamGrad.addColorStop(1, `rgba(255, 255, 255, ${currentOpacity})`);

          ctx.strokeStyle = beamGrad;
          ctx.lineWidth = b.width;
          ctx.beginPath();
          ctx.moveTo(b.x, clampedTailY);
          ctx.lineTo(b.x, tipY);
          ctx.stroke();

          // Leading point glowing flare
          if (b.hasGlowHead && heightRatio > 0.05) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.arc(b.x, tipY, b.width * 1.05, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
      ctx.restore();

      // =========================================================================
      // LAYER 4: FLOATING SPARKS (Only above horizon)
      // =========================================================================
      ctx.save();
      for (let i = 0; i < sparks.length; i++) {
        const p = sparks[i];
        p.y -= p.speedY;
        p.x += Math.sin(time + p.pulsePhase) * 0.18;
        p.pulsePhase += p.pulseSpeed;

        if (p.y < 0) {
          p.y = horizonY - Math.random() * 20;
          p.x = Math.random() * (width * 0.86) + width * 0.07;
        }

        const pulse = (Math.sin(p.pulsePhase) + 1) / 2;
        const currentOpacity = p.maxOpacity * (0.35 + pulse * 0.65);

        ctx.save();
        ctx.fillStyle = `rgba(167, 243, 208, ${currentOpacity})`;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = p.size * 3.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // =========================================================================
      // LAYER 5: THE STRAIGHT HORIZONTAL GLOWING LINE (With bright center spot)
      // =========================================================================
      ctx.save();
      // Outer emerald halo stroke
      const glowLineGrad = ctx.createLinearGradient(0, 0, width, 0);
      glowLineGrad.addColorStop(0, 'rgba(5, 150, 105, 0)');
      glowLineGrad.addColorStop(0.18, 'rgba(5, 150, 105, 0.25)');
      glowLineGrad.addColorStop(0.38, 'rgba(16, 185, 129, 0.85)');
      glowLineGrad.addColorStop(0.5, '#ffffff');
      glowLineGrad.addColorStop(0.62, 'rgba(16, 185, 129, 0.85)');
      glowLineGrad.addColorStop(0.82, 'rgba(5, 150, 105, 0.25)');
      glowLineGrad.addColorStop(1, 'rgba(5, 150, 105, 0)');

      ctx.strokeStyle = glowLineGrad;
      ctx.lineWidth = 2.0;
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(width, horizonY);
      ctx.stroke();

      // Core razor-sharp bright center spot
      const coreLineGrad = ctx.createLinearGradient(0, 0, width, 0);
      coreLineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      coreLineGrad.addColorStop(0.36, 'rgba(255, 255, 255, 0.3)');
      coreLineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      coreLineGrad.addColorStop(0.64, 'rgba(255, 255, 255, 0.3)');
      coreLineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.strokeStyle = coreLineGrad;
      ctx.lineWidth = 1.0;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(width, horizonY);
      ctx.stroke();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [lineColor, glowColor, particleColor, lineCount, particleCount, speed, horizonYPercent]);

  return (
    <div
      className={cn('relative w-full h-full overflow-hidden select-none pointer-events-none', className)}
      {...props}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
}

export default RisingLines;
