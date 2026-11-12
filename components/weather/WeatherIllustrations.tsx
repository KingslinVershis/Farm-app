'use client';

import React, { useId } from 'react';

export type WeatherVisualKind = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rain' | 'storm';

export function resolveWeatherVisualKind(
  rainfallInput: string | number,
  cloudInput: string | number
): WeatherVisualKind {
  const rain = Number(rainfallInput) || 0;
  const cloud = Number(cloudInput) || 0;

  if (rain >= 10) return 'storm';
  if (rain > 0) return 'rain';
  if (cloud >= 7) return 'cloudy';
  if (cloud >= 3) return 'partly_cloudy';
  return 'sunny';
}

interface WeatherArtProps {
  rainfall: string | number;
  cloudCover: string | number;
  className?: string;
}

/**
 * Volumetric glowing hero weather SVG illustration styled to match the soft
 * sunlit clouds, radiant sun corona, rain streaks, and storm lightning aesthetic.
 */
export const WeatherHeroIllustration: React.FC<WeatherArtProps> = ({
  rainfall,
  cloudCover,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const kind = resolveWeatherVisualKind(rainfall, cloudCover);
  const showSun = kind === 'sunny' || kind === 'partly_cloudy';
  const showCloud = kind !== 'sunny';
  const showRain = kind === 'rain' || kind === 'storm';
  const showBolt = kind === 'storm';

  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      {/* Radiant ambient halo behind artwork */}
      <div
        className={`absolute rounded-full blur-3xl opacity-65 ${
          showSun
            ? 'w-56 h-56 bg-amber-300/50'
            : kind === 'cloudy'
              ? 'w-56 h-56 bg-sky-200/35'
              : showRain
                ? 'w-56 h-56 bg-sky-300/35'
                : 'w-56 h-56 bg-slate-300/25'
        }`}
      />
      <svg
        viewBox="0 0 320 220"
        className="relative w-64 h-48 sm:w-80 sm:h-56 drop-shadow-[0_24px_36px_rgba(2,18,45,0.48)]"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`sunDisc-${uid}`} cx="42%" cy="38%" r="58%">
            <stop offset="0%" stopColor="#fff9c4" />
            <stop offset="45%" stopColor="#ffe047" />
            <stop offset="85%" stopColor="#fab005" />
            <stop offset="100%" stopColor="#f08c00" />
          </radialGradient>

          <radialGradient id={`sunCorona-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe875" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#ffd43b" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#ffd43b" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={`cloudVolume-${uid}`} cx="44%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="48%" stopColor="#eef6ff" stopOpacity="0.96" />
            <stop offset="82%" stopColor="#c9def6" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#9abce4" stopOpacity="0.88" />
          </radialGradient>

          <radialGradient id={`cloudOvercast-${uid}`} cx="45%" cy="25%" r="72%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="50%" stopColor="#dbe9fa" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#8fb0d8" stopOpacity="0.9" />
          </radialGradient>

          <radialGradient id={`cloudStorm-${uid}`} cx="45%" cy="24%" r="74%">
            <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.98" />
            <stop offset="52%" stopColor="#94a3b8" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#475569" stopOpacity="0.95" />
          </radialGradient>

          <filter id={`cloudFeather-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id={`rainStreak-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* Radiant Sun & Corona Rays */}
        {showSun && (
          <g transform={kind === 'sunny' ? 'translate(160, 102)' : 'translate(132, 74)'}>
            <circle cx="0" cy="0" r={kind === 'sunny' ? 84 : 68} fill={`url(#sunCorona-${uid})`} />
            {Array.from({ length: 24 }).map((_, idx) => {
              const angle = idx * 15;
              const innerR = kind === 'sunny' ? 40 : 32;
              const outerR = kind === 'sunny' ? (idx % 2 === 0 ? 74 : 58) : idx % 2 === 0 ? 60 : 47;
              return (
                <line
                  key={idx}
                  x1="0"
                  y1={-innerR}
                  x2="0"
                  y2={-outerR}
                  stroke="#ffe066"
                  strokeOpacity={idx % 2 === 0 ? 0.8 : 0.45}
                  strokeWidth={idx % 2 === 0 ? 2.4 : 1.3}
                  strokeLinecap="round"
                  transform={`rotate(${angle})`}
                />
              );
            })}
            <circle
              cx="0"
              cy="0"
              r={kind === 'sunny' ? 42 : 34}
              fill={`url(#sunDisc-${uid})`}
            />
          </g>
        )}

        {/* Back Soft Volumetric Cloud Layers */}
        {showCloud && (
          <g filter={`url(#cloudFeather-${uid})`} opacity="0.88">
            <ellipse
              cx="198"
              cy="128"
              rx="66"
              ry="34"
              fill={
                kind === 'storm'
                  ? `url(#cloudStorm-${uid})`
                  : kind === 'cloudy'
                    ? `url(#cloudOvercast-${uid})`
                    : `url(#cloudVolume-${uid})`
              }
            />
            <circle
              cx="188"
              cy="104"
              r="36"
              fill={
                kind === 'storm'
                  ? `url(#cloudStorm-${uid})`
                  : kind === 'cloudy'
                    ? `url(#cloudOvercast-${uid})`
                    : `url(#cloudVolume-${uid})`
              }
            />
          </g>
        )}

        {/* Foreground Sculpted Fluffy Cloud */}
        {showCloud && (
          <g filter={`url(#cloudFeather-${uid})`} transform={showSun ? 'translate(0, 8)' : 'translate(-4, -4)'}>
            <circle
              cx="126"
              cy="124"
              r="36"
              fill={kind === 'storm' ? `url(#cloudStorm-${uid})` : `url(#cloudVolume-${uid})`}
            />
            <circle
              cx="166"
              cy="106"
              r="46"
              fill={kind === 'storm' ? `url(#cloudStorm-${uid})` : `url(#cloudVolume-${uid})`}
            />
            <circle
              cx="212"
              cy="124"
              r="34"
              fill={kind === 'storm' ? `url(#cloudStorm-${uid})` : `url(#cloudVolume-${uid})`}
            />
            <ellipse
              cx="168"
              cy="138"
              rx="86"
              ry="26"
              fill={kind === 'storm' ? `url(#cloudStorm-${uid})` : `url(#cloudVolume-${uid})`}
            />
            <ellipse cx="164" cy="148" rx="68" ry="12" fill="#0c2d5c" fillOpacity="0.12" />
          </g>
        )}

        {/* Soft Rain Streaks */}
        {showRain && (
          <g stroke={`url(#rainStreak-${uid})`} strokeWidth="3.2" strokeLinecap="round">
            <line x1="112" y1="164" x2="103" y2="188" />
            <line x1="140" y1="168" x2="131" y2="195" />
            <line x1="168" y1="164" x2="159" y2="188" />
            <line x1="196" y1="168" x2="187" y2="194" />
            {kind === 'storm' && <line x1="222" y1="164" x2="213" y2="188" />}
          </g>
        )}

        {/* Lightning Bolt for Storm */}
        {showBolt && (
          <polygon
            points="166,142 149,173 163,173 155,204 184,164 169,164"
            fill="#ffd43b"
            stroke="#fff9db"
            strokeWidth="1.2"
          />
        )}
      </svg>
    </div>
  );
};

/**
 * Crisp miniature volumetric weather icon rendered inside each 10-day forecast card.
 */
export const WeatherDayIcon: React.FC<WeatherArtProps> = ({
  rainfall,
  cloudCover,
  className = 'w-14 h-12',
}) => {
  const uid = useId().replace(/:/g, '');
  const kind = resolveWeatherVisualKind(rainfall, cloudCover);
  const showSun = kind === 'sunny' || kind === 'partly_cloudy';
  const showCloud = kind !== 'sunny';
  const showRain = kind === 'rain' || kind === 'storm';
  const showBolt = kind === 'storm';

  return (
    <svg viewBox="0 0 72 60" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`miniSun-${uid}`} cx="42%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#fff9c4" />
          <stop offset="55%" stopColor="#ffd43b" />
          <stop offset="100%" stopColor="#f59f00" />
        </radialGradient>
        <radialGradient id={`miniCloud-${uid}`} cx="45%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#e6f1ff" />
          <stop offset="100%" stopColor="#a6c4e6" />
        </radialGradient>
        <radialGradient id={`miniStorm-${uid}`} cx="45%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </radialGradient>
      </defs>

      {showSun && (
        <g transform={kind === 'sunny' ? 'translate(36, 29)' : 'translate(28, 22)'}>
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={i}
              x1="0"
              y1={kind === 'sunny' ? -14 : -11}
              x2="0"
              y2={kind === 'sunny' ? -21 : -16}
              stroke="#ffe066"
              strokeWidth={i % 2 === 0 ? 2.1 : 1.2}
              strokeOpacity={i % 2 === 0 ? 0.9 : 0.55}
              strokeLinecap="round"
              transform={`rotate(${i * 30})`}
            />
          ))}
          <circle cx="0" cy="0" r={kind === 'sunny' ? 12 : 9.5} fill={`url(#miniSun-${uid})`} />
        </g>
      )}

      {showCloud && (
        <g transform={showSun ? 'translate(3, 4)' : 'translate(0, 1)'}>
          <circle cx="24" cy="31" r="9.5" fill={kind === 'storm' ? `url(#miniStorm-${uid})` : `url(#miniCloud-${uid})`} />
          <circle cx="35" cy="25" r="12" fill={kind === 'storm' ? `url(#miniStorm-${uid})` : `url(#miniCloud-${uid})`} />
          <circle cx="47" cy="31" r="9" fill={kind === 'storm' ? `url(#miniStorm-${uid})` : `url(#miniCloud-${uid})`} />
          <ellipse cx="36" cy="35" rx="22" ry="7.5" fill={kind === 'storm' ? `url(#miniStorm-${uid})` : `url(#miniCloud-${uid})`} />
        </g>
      )}

      {showRain && (
        <g stroke="#7dd3fc" strokeWidth="2.2" strokeLinecap="round">
          <line x1="25" y1="44" x2="22" y2="51" />
          <line x1="35" y1="45" x2="32" y2="52" />
          <line x1="45" y1="44" x2="42" y2="51" />
        </g>
      )}

      {showBolt && (
        <polygon points="37,40 31,49 35.5,49 33,57 42.5,46.5 38,46.5" fill="#ffd43b" />
      )}
    </svg>
  );
};
