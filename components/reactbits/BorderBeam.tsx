'use client';

import React, { useId } from 'react';

export type BorderBeamGradientStop = { color: string; percent: number };

/**
 * Ocean Gradient Stop Configuration
 * Exact color stops: #1677ff 0%, #36cfc9 52%, #95de64 100%
 */
export const OCEAN_GRADIENT: BorderBeamGradientStop[] = [
  { color: '#1677ff', percent: 0 },
  { color: '#36cfc9', percent: 52 },
  { color: '#95de64', percent: 100 },
];

export const FOREST_GRADIENT: BorderBeamGradientStop[] = [
  { color: '#22c55e', percent: 0 },
  { color: '#a3e635', percent: 54 },
  { color: '#facc15', percent: 100 },
];

export interface BorderBeamProps {
  children?: React.ReactNode;
  className?: string;
  duration?: number;
  borderWidth?: number;
  rx?: number | string;
  beamLength?: number;
  color?: BorderBeamGradientStop[];
  colorFrom?: string;
  colorTo?: string;
  baseBorderColor?: string;
}

export const BorderBeam: React.FC<BorderBeamProps> = ({
  children,
  className = '',
  duration = 5,
  borderWidth = 1.5,
  rx = 12,
  beamLength = 12,
  color = OCEAN_GRADIENT,
  colorFrom,
  colorTo,
  baseBorderColor,
}) => {
  const rawId = useId();
  const gradientId = `beam_${rawId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const stops =
    Array.isArray(color) && color.length > 0
      ? color
      : [
          { color: colorFrom || '#1677ff', percent: 0 },
          { color: colorTo || '#95de64', percent: 100 },
        ];

  const beamSvg = (
    <svg
      key={gradientId}
      className={`pointer-events-none absolute -inset-[1px] w-[calc(100%+2px)] h-[calc(100%+2px)] rounded-[inherit] overflow-visible select-none ${className}`}
      style={{ zIndex: 10 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          {stops.map((stop, idx) => (
            <stop key={idx} offset={`${stop.percent}%`} stopColor={stop.color} />
          ))}
        </linearGradient>
        <filter id={`${gradientId}_glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Base border track so card border and beam share the exact single boundary line */}
      {baseBorderColor && (
        <rect
          x={borderWidth / 2}
          y={borderWidth / 2}
          width={`calc(100% - ${borderWidth}px)`}
          height={`calc(100% - ${borderWidth}px)`}
          rx={rx}
          fill="none"
          stroke={baseBorderColor}
          strokeWidth={borderWidth}
        />
      )}

      {/* Animated glowing beam that moves seamlessly through the single border */}
      <rect
        x={borderWidth / 2}
        y={borderWidth / 2}
        width={`calc(100% - ${borderWidth}px)`}
        height={`calc(100% - ${borderWidth}px)`}
        rx={rx}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={borderWidth}
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${beamLength} ${100 - beamLength}`}
        filter={`url(#${gradientId}_glow)`}
        className="animate-border-beam"
        style={{
          animationDuration: `${duration}s`,
        }}
      />
    </svg>
  );

  if (!children) {
    return beamSvg;
  }

  return (
    <div className={`relative ${className}`}>
      {children}
      {beamSvg}
    </div>
  );
};
