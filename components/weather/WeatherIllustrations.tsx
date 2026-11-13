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

export function getWeatherBackgroundVideo(
  rainfallInput: string | number,
  cloudInput: string | number
): string {
  const kind = resolveWeatherVisualKind(rainfallInput, cloudInput);
  switch (kind) {
    case 'storm':
      return '/videos/storm.mp4';
    case 'rain':
      return '/videos/rain.mp4';
    case 'cloudy':
    case 'partly_cloudy':
      return '/videos/storm_cloud.mp4';
    case 'sunny':
    default:
      return '/videos/sunny.mp4';
  }
}

interface WeatherArtProps {
  rainfall: string | number;
  cloudCover: string | number;
  className?: string;
}

/**
 * Animated volumetric weather icon rendered inside each forecast day card:
 * rotating sun rays, gently drifting clouds, falling raindrops, and storm lightning flash.
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
        <radialGradient id={`miniSunGlow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe066" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#ffd43b" stopOpacity="0" />
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
          <circle cx="0" cy="0" r={kind === 'sunny' ? 23 : 18} fill={`url(#miniSunGlow-${uid})`} />
          <g className="weather-anim-sun-rays">
            {Array.from({ length: 12 }).map((_, i) => (
              <line
                key={i}
                x1="0"
                y1={kind === 'sunny' ? -14 : -11}
                x2="0"
                y2={kind === 'sunny' ? -21 : -16}
                stroke="#ffe066"
                strokeWidth={i % 2 === 0 ? 2.1 : 1.2}
                strokeOpacity={i % 2 === 0 ? 0.92 : 0.6}
                strokeLinecap="round"
                transform={`rotate(${i * 30})`}
              />
            ))}
          </g>
          <circle cx="0" cy="0" r={kind === 'sunny' ? 12 : 9.5} fill={`url(#miniSun-${uid})`} />
        </g>
      )}

      {showCloud && (
        <g
          className="weather-anim-cloud"
          transform={showSun ? 'translate(3, 4)' : 'translate(0, 1)'}
        >
          <circle
            cx="24"
            cy="31"
            r="9.5"
            fill={kind === 'storm' ? `url(#miniStorm-${uid})` : `url(#miniCloud-${uid})`}
          />
          <circle
            cx="35"
            cy="25"
            r="12"
            fill={kind === 'storm' ? `url(#miniStorm-${uid})` : `url(#miniCloud-${uid})`}
          />
          <circle
            cx="47"
            cy="31"
            r="9"
            fill={kind === 'storm' ? `url(#miniStorm-${uid})` : `url(#miniCloud-${uid})`}
          />
          <ellipse
            cx="36"
            cy="35"
            rx="22"
            ry="7.5"
            fill={kind === 'storm' ? `url(#miniStorm-${uid})` : `url(#miniCloud-${uid})`}
          />
        </g>
      )}

      {showRain && (
        <g stroke="#7dd3fc" strokeWidth="2.3" strokeLinecap="round">
          <line className="weather-anim-rain-1" x1="25" y1="43" x2="22" y2="49" />
          <line className="weather-anim-rain-2" x1="35" y1="44" x2="32" y2="50" />
          <line className="weather-anim-rain-3" x1="45" y1="43" x2="42" y2="49" />
        </g>
      )}

      {showBolt && (
        <polygon
          className="weather-anim-flash"
          points="37,39 31,48 35.5,48 33,56 42.5,45.5 38,45.5"
          fill="#ffd43b"
          stroke="#fff9db"
          strokeWidth="0.6"
        />
      )}
    </svg>
  );
};
