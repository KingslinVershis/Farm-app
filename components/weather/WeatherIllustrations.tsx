'use client';

import React, { useId } from 'react';

export type WeatherVisualKind =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'rain'
  | 'storm'
  | 'clear_night'
  | 'partly_cloudy_night';

export function resolveWeatherVisualKind(
  rainfallInput: string | number,
  cloudInput: string | number,
  conditionText?: string,
  isNight?: boolean
): WeatherVisualKind {
  const rain = Number(rainfallInput) || 0;
  const cloud = Number(cloudInput) || 0;
  const cond = (conditionText || '').toLowerCase();

  // Severe storms
  if (/thunder|storm|cyclone|squall|lightning/i.test(cond) || rain >= 12) return 'storm';

  // Drizzle rain or actual rain
  if (/heavy rain|moderate rain|downpour/i.test(cond) || rain >= 3.0) return 'rain';
  if ((/drizzle|light rain|shower/i.test(cond) && rain >= 0.5) || rain >= 1.5) return 'rain';

  // Night-specific check
  const night = isNight || /night/i.test(cond);
  if (night) {
    if (/partly/i.test(cond)) return 'partly_cloudy_night';
    if (/overcast/i.test(cond) || (cloud >= 7 && !/clear|sunny/i.test(cond))) return 'cloudy';
    if (/cloudy|clouds|haze|mist/i.test(cond) || cloud >= 3) return 'partly_cloudy_night';
    return 'clear_night';
  }

  // Sky cover conditions (Day)
  if (/overcast/i.test(cond) || cloud >= 7) return 'cloudy';
  if (/partly|haze|mist/i.test(cond) || cloud >= 3) return 'partly_cloudy';
  if (/clear|sunny/i.test(cond)) return 'sunny';

  if (cloud >= 7) return 'cloudy';
  if (cloud >= 3) return 'partly_cloudy';
  return 'sunny';
}

export function getWeatherBackgroundVideo(
  rainfallInput: string | number,
  cloudInput: string | number,
  conditionText?: string,
  isNight?: boolean
): string {
  const cond = (conditionText || '').toLowerCase();
  const rain = Number(rainfallInput) || 0;
  const night = Boolean(isNight || /night/i.test(cond));

  const isRaining =
    /rain|drizzle|shower|downpour|thunder|storm|cyclone|squall|lightning/i.test(cond) ||
    rain >= 0.5;

  // Night-time rules:
  // 1. Any kind of rain weather at night -> Heavy_rain.mp4
  // 2. Not raining (cloudy, partly cloudy, clear night, etc.) -> watermark-removed-Transform_storm_sky_to_night_a7ceeb1c_t1.8-8_1080p.mp4
  if (night) {
    if (isRaining) {
      return 'https://res.cloudinary.com/chk0va7a/video/upload/v1795760491/Heavy_rain.mp4';
    }
    return 'https://res.cloudinary.com/chk0va7a/video/upload/v1795760443/watermark-removed-Transform_storm_sky_to_night_a7ceeb1c_t1.8-8_1080p.mp4';
  }

  const kind = resolveWeatherVisualKind(rainfallInput, cloudInput, conditionText, isNight);

  if (kind === 'storm') return 'https://res.cloudinary.com/chk0va7a/video/upload/v1795760491/Heavy_rain.mp4';
  if (kind === 'rain') return 'https://res.cloudinary.com/chk0va7a/video/upload/v1795760488/Drizzle_rain.mp4';

  // Daytime: Partly sunny
  if (
    /partly\s*sunny|mostly\s*sunny/i.test(cond) ||
    (/partly/i.test(cond) && /sun/i.test(cond)) ||
    (/partly\s*cloud/i.test(cond) && !/rain/i.test(cond))
  ) {
    return 'https://res.cloudinary.com/chk0va7a/video/upload/v1795760487/partly_sunny.mp4';
  }

  // Daytime: Sunny / Clear
  if (/sunny|clear/i.test(cond)) {
    return 'https://res.cloudinary.com/chk0va7a/video/upload/v1795760491/sunny.mp4';
  }

  switch (kind) {
    case 'cloudy':
      return 'https://res.cloudinary.com/chk0va7a/video/upload/v1795760489/cloudy.mp4';
    case 'partly_cloudy':
      return 'https://res.cloudinary.com/chk0va7a/video/upload/v1795760487/partly_sunny.mp4';
    case 'sunny':
    default:
      return 'https://res.cloudinary.com/chk0va7a/video/upload/v1795760491/sunny.mp4';
  }
}

interface WeatherArtProps {
  rainfall: string | number;
  cloudCover: string | number;
  conditionText?: string;
  isNight?: boolean;
  className?: string;
}

/**
 * Animated volumetric weather icon rendered inside each forecast day card:
 * rotating sun rays, glowing crescent moon with stars, gently drifting clouds,
 * falling raindrops, and storm lightning flash.
 */
export const WeatherDayIcon: React.FC<WeatherArtProps> = ({
  rainfall,
  cloudCover,
  conditionText,
  isNight,
  className = 'w-14 h-12',
}) => {
  const uid = useId().replace(/:/g, '');
  const kind = resolveWeatherVisualKind(rainfall, cloudCover, conditionText, isNight);

  // Only for night: display Flaticon animated icons created by Magnific based on corresponding weather
  if (isNight) {
    let iconSrc = '/icons/animated/night-clear.gif';
    let iconWebp = '/icons/animated/night-clear.webp';
    let iconAlt = 'Clear night animated icon created by Magnific - Flaticon';

    if (kind === 'rain' || kind === 'storm') {
      iconSrc = '/icons/animated/night-rain.gif';
      iconWebp = '/icons/animated/night-rain.webp';
      iconAlt = 'Rain night animated icon created by Magnific - Flaticon';
    } else if (kind === 'cloudy') {
      iconSrc = '/icons/animated/night-cloudy.gif';
      iconWebp = '/icons/animated/night-cloudy.webp';
      iconAlt = 'Cloudy night animated icon created by Magnific - Flaticon';
    } else if (kind === 'partly_cloudy_night' || kind === 'partly_cloudy') {
      iconSrc = '/icons/animated/night-partly-cloudy.gif';
      iconWebp = '/icons/animated/night-partly-cloudy.webp';
      iconAlt = 'Partly cloudy night animated icon created by Magnific - Flaticon';
    }

    return (
      <div className={`relative inline-flex items-center justify-center select-none ${className}`} aria-hidden="true">
        <picture className="w-full h-full flex items-center justify-center">
          <source srcSet={iconWebp} type="image/webp" />
          <img
            src={iconSrc}
            alt={iconAlt}
            title={iconAlt}
            className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(56,189,248,0.4)]"
            loading="lazy"
          />
        </picture>
      </div>
    );
  }

  // Daytime: volumetric SVG icons (sun rays, clouds, rain, lightning) kept completely untouched
  const showSun = kind === 'sunny' || kind === 'partly_cloudy';
  const showMoon = kind === 'clear_night' || kind === 'partly_cloudy_night';
  const showCloud = kind !== 'sunny' && kind !== 'clear_night';
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
        <radialGradient id={`miniMoon-${uid}`} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </radialGradient>
        <radialGradient id={`miniMoonGlow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
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

      {showMoon && (
        <g transform={kind === 'clear_night' ? 'translate(36, 28)' : 'translate(28, 22)'}>
          <circle cx="0" cy="0" r={kind === 'clear_night' ? 22 : 18} fill={`url(#miniMoonGlow-${uid})`} />
          <path
            d="M 6,-14 C -3,-14 -11,-6 -11,4 C -11,13 -4,19 4,19 C 1,16 -1,11 -1,4 C -1,-3 2,-9 6,-14 Z"
            fill={`url(#miniMoon-${uid})`}
            filter="drop-shadow(0 0 5px rgba(56, 189, 248, 0.6))"
          />
          {kind === 'clear_night' && (
            <g>
              <circle cx="14" cy="-8" r="1.3" fill="#ffffff" opacity="0.95" />
              <circle cx="-14" cy="-5" r="1.0" fill="#bae6fd" opacity="0.8" />
              <circle cx="15" cy="10" r="1.1" fill="#7dd3fc" opacity="0.85" />
            </g>
          )}
          {kind === 'partly_cloudy_night' && (
            <g>
              <circle cx="12" cy="-6" r="1.2" fill="#ffffff" opacity="0.95" />
              <circle cx="-12" cy="-5" r="0.9" fill="#bae6fd" opacity="0.75" />
            </g>
          )}
        </g>
      )}

      {showCloud && (
        <g
          className="weather-anim-cloud"
          transform={showSun || showMoon ? 'translate(3, 4)' : 'translate(0, 1)'}
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
