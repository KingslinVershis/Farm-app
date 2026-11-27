'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { WeatherDayIcon } from '@/components/weather/WeatherIllustrations';
import PlanSummaryReflectiveCard from '@/components/reactbits/PlanSummaryReflectiveCard';
import ReflectiveCard from '@/components/reactbits/ReflectiveCard';
import MotionFreeScrollCarousel from '@/components/reactbits/MotionFreeScrollCarousel';
import AnimatedContent from '@/components/reactbits/AnimatedContent';
import { AnimatedCounter } from '@/components/reactbits/AnimatedCounter';
import { fetchUserData, UserProfile } from '@/lib/clientUser';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpRightIcon,
  RefreshCwIcon,
  DropletsIcon,
  WindIcon,
  CloudSunIcon,
  GaugeIcon,
  ThermometerIcon,
  CheckCircleIcon,
} from '@/components/icons/Icons';

export interface HourlyWeatherPoint {
  timeStr: string;
  hourNum: number;
  dateStr: string;
  isNow: boolean;
  temp: number;
  feelsLike: number;
  condition: string;
  tamilCondition: string;
  weatherCode: number;
  rainfallMm: number;
  rainChance: number;
  humidity: number;
  windSpeed: number;
  windDir: string;
  cloudCover: number;
}

export interface HourlyWeatherSectionProps {
  isTamil?: boolean;
  className?: string;
}

const WMO_TAMIL_TRANSLATIONS: Record<string, string> = {
  'Clear sky': 'தெளிவான வானம்',
  'Mainly clear': 'பெரும்பாலும் தெளிவான வானம்',
  'Partly cloudy': 'ஓரளவு மேகமூட்டம்',
  'Partly Cloudy': 'ஓரளவு மேகமூட்டம்',
  'Overcast': 'முழு மேகமூட்டம்',
  'Fog': 'பனிமூட்டம்',
  'Depositing rime fog': 'அடர்ந்த பனிமூட்டம்',
  'Light drizzle': 'லேசான தூறல்',
  'Moderate drizzle': 'மிதமான தூறல்',
  'Dense drizzle': 'அடர்ந்த தூறல்',
  'Slight rain': 'லேசான மழை',
  'Moderate rain': 'மிதமான மழை',
  'Heavy rain': 'கனமழை',
  'Slight rain showers': 'லேசான மழைச்சாரல்',
  'Moderate rain showers': 'மிதமான மழைச்சாரல்',
  'Violent rain showers': 'கடுமையான மழைச்சாரல்',
  'Thunderstorm': 'இடியுடன் கூடிய மழை',
  'Thunderstorm with slight hail': 'ஆலங்கட்டி இடிமழை',
  'Thunderstorm with heavy hail': 'கடுமையான ஆலங்கட்டி இடிமழை',
};

const WMO_MAP: Record<number, { text: string; isRain: boolean }> = {
  0: { text: 'Clear sky', isRain: false },
  1: { text: 'Mainly clear', isRain: false },
  2: { text: 'Partly cloudy', isRain: false },
  3: { text: 'Overcast', isRain: false },
  45: { text: 'Fog', isRain: false },
  48: { text: 'Depositing rime fog', isRain: false },
  51: { text: 'Light drizzle', isRain: true },
  53: { text: 'Moderate drizzle', isRain: true },
  55: { text: 'Dense drizzle', isRain: true },
  61: { text: 'Slight rain', isRain: true },
  63: { text: 'Moderate rain', isRain: true },
  65: { text: 'Heavy rain', isRain: true },
  80: { text: 'Slight rain showers', isRain: true },
  81: { text: 'Moderate rain showers', isRain: true },
  82: { text: 'Violent rain showers', isRain: true },
  95: { text: 'Thunderstorm', isRain: true },
};

function getCompass(deg: number): string {
  if (isNaN(deg)) return 'N';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return dirs[idx];
}


/**
 * Resolves location according to user priority:
 * 1. User profile city / village
 * 2. Fertilizer step 1 saved location (place)
 * 3. Fertilizer form userDetails
 * 4. Saved weather location
 * 5. Default fallback: Tenkasi District
 */
function resolveLocationPreference(user: UserProfile | null): {
  query: string;
  displayName: string;
  isUserLocation: boolean;
} {
  // 1. Check User Profile city or village
  if (user) {
    const userCity = (user.city || '').trim();
    const userVillage = (user.address || '').trim();
    const userDistrict = (user.district || '').trim();

    if (userCity) {
      const display = userDistrict ? `${userCity}, ${userDistrict}` : userCity;
      return {
        query: `${userCity}, ${userDistrict || 'Tamil Nadu'}`,
        displayName: display,
        isUserLocation: true,
      };
    }
    if (userVillage && userVillage.length <= 30) {
      const display = userDistrict ? `${userVillage}, ${userDistrict}` : userVillage;
      return {
        query: `${userVillage}, ${userDistrict || 'Tamil Nadu'}`,
        displayName: display,
        isUserLocation: true,
      };
    }
  }

  // 2. Check localStorage 'fertilizer_location' (Step 1 location)
  if (typeof window !== 'undefined') {
    try {
      const rawLoc = localStorage.getItem('fertilizer_location');
      if (rawLoc) {
        const parsed = JSON.parse(rawLoc);
        const place = (parsed.place || '').trim();
        const dist = (parsed.district || '').trim();
        if (place) {
          const display = dist ? `${place}, ${dist}` : place;
          return {
            query: `${place}, ${dist || 'Tamil Nadu'}`,
            displayName: display,
            isUserLocation: true,
          };
        }
      }
    } catch { }

    // 3. Check localStorage 'fertilizer_form'
    try {
      const rawForm = localStorage.getItem('fertilizer_form');
      if (rawForm) {
        const parsed = JSON.parse(rawForm);
        const place = (parsed?.userDetails?.village || parsed?.userDetails?.city || '').trim();
        const dist = (parsed?.userDetails?.district || '').trim();
        if (place) {
          const display = dist ? `${place}, ${dist}` : place;
          return {
            query: `${place}, ${dist || 'Tamil Nadu'}`,
            displayName: display,
            isUserLocation: true,
          };
        }
      }
    } catch { }

    // 4. Check localStorage 'farmhub_weather_location'
    try {
      const rawW = localStorage.getItem('farmhub_weather_location');
      if (rawW) {
        const parsed = JSON.parse(rawW);
        const block = (parsed?.blockName || '').trim();
        const dist = (parsed?.districtName || '').trim();
        if (block && !/thanjavur/i.test(block)) {
          const display = dist ? `${block}, ${dist}` : block;
          return {
            query: `${block}, ${dist || 'Tamil Nadu'}`,
            displayName: display,
            isUserLocation: true,
          };
        }
      }
    } catch { }
  }

  // 5. Default Fallback: Tenkasi District
  return {
    query: 'Tenkasi, Tamil Nadu',
    displayName: 'Tenkasi District, Tamil Nadu',
    isUserLocation: false,
  };
}

export default function HourlyWeatherSection({
  isTamil: propIsTamil,
  className = '',
}: HourlyWeatherSectionProps) {
  const { messages, locale } = useLanguage();
  const wh = messages.weatherHourly;
  const isTamil = propIsTamil ?? (locale === 'ta');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [locationInfo, setLocationInfo] = useState<{
    query: string;
    displayName: string;
    isUserLocation: boolean;
  }>({
    query: 'Tenkasi, Tamil Nadu',
    displayName: 'Tenkasi District, Tamil Nadu',
    isUserLocation: false,
  });

  const [hourlyData, setHourlyData] = useState<HourlyWeatherPoint[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<{
    temp: number;
    feelsLike: number;
    condition: string;
    tamilCondition: string;
    minTemp: number;
    maxTemp: number;
    humidity: number;
    windSpeed: number;
    windDir: string;
    pressure: number;
    cloudCover: number;
    rainfallMm: number;
    rainChance: number;
  }>({
    temp: 28,
    feelsLike: 31,
    condition: 'Partly Cloudy',
    tamilCondition: 'ஓரளவு மேகமூட்டம்',
    minTemp: 23,
    maxTemp: 33,
    humidity: 72,
    windSpeed: 12,
    windDir: 'NE',
    pressure: 1012,
    cloudCover: 40,
    rainfallMm: 0,
    rainChance: 15,
  });

  // State to track which card was clicked to dynamically update the top telemetry details
  const [selectedHourIndex, setSelectedHourIndex] = useState<number | null>(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Active point when an hour card is selected/clicked
  const activeHourPoint =
    selectedHourIndex !== null && hourlyData[selectedHourIndex]
      ? hourlyData[selectedHourIndex]
      : null;

  // Dynamically update the top telemetry metrics based on selected hour or live data
  const displayMetrics = activeHourPoint
    ? {
      temp: activeHourPoint.temp,
      feelsLike: activeHourPoint.feelsLike,
      condition: activeHourPoint.condition,
      tamilCondition: activeHourPoint.tamilCondition,
      minTemp: currentMetrics.minTemp,
      maxTemp: currentMetrics.maxTemp,
      humidity: activeHourPoint.humidity,
      windSpeed: activeHourPoint.windSpeed,
      windDir: activeHourPoint.windDir,
      pressure: currentMetrics.pressure,
      cloudCover: activeHourPoint.cloudCover,
      rainfallMm: activeHourPoint.rainfallMm,
      rainChance: activeHourPoint.rainChance,
      timeLabel: activeHourPoint.timeStr,
      isLive: false,
    }
    : {
      ...currentMetrics,
      timeLabel: wh.live,
      isLive: true,
    };

  const fetchHourlyForecast = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Resolve active location
    let userProfile: UserProfile | null = null;
    try {
      const userRes = await fetchUserData();
      userProfile = userRes?.user || null;
    } catch { }

    const loc = resolveLocationPreference(userProfile);
    setLocationInfo(loc);

    try {
      // 2. Fetch 24-hour weather data from /api/weather-mcp
      const res = await fetch('/api/weather-mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          tool: 'hourly_24',
          location: loc.query,
          params: { granularity: 'hourly', days: 2, units: 'metric' },
        }),
      });

      let rawData: any = null;

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.raw) {
          rawData = json.raw;
        }
      }

      // If backend API returned error or no raw data, try Open-Meteo direct as graceful fallback
      if (!rawData || !rawData.hourly || !Array.isArray(rawData.hourly.time)) {
        const isTenkasi = /tenkasi/i.test(loc.query);
        const lat = isTenkasi ? 8.9594 : 10.787;
        const lon = isTenkasi ? 77.316 : 79.1378;
        const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=auto&forecast_days=2`;

        const fallbackRes = await fetch(openMeteoUrl, {
          headers: { 'User-Agent': 'FarmHubWeather/1.0' },
        });
        if (fallbackRes.ok) {
          rawData = await fallbackRes.json();
        }
      }

      if (!rawData || !rawData.hourly || !Array.isArray(rawData.hourly.time)) {
        throw new Error('Unable to retrieve 24-hour meteorological telemetry');
      }

      // 3. Process 24-Hour Horizon starting from current local hour
      const hourly = rawData.hourly;
      const current = rawData.current || {};
      const now = new Date();
      const currentIsoHourPrefix = now.toISOString().slice(0, 13); // e.g. "2026-11-23T14"

      // Find closest matching hour index, or default to current hour
      let startIndex = hourly.time.findIndex((t: string) => t.startsWith(currentIsoHourPrefix));
      if (startIndex < 0) {
        const curH = now.getHours();
        startIndex = Math.min(curH, Math.max(0, hourly.time.length - 24));
      }

      const points: HourlyWeatherPoint[] = [];
      const totalPoints = Math.min(24, hourly.time.length - startIndex);

      let minT = 999;
      let maxT = -999;

      for (let i = 0; i < totalPoints; i++) {
        const idx = startIndex + i;
        const rawTime = hourly.time[idx] || '';
        const timePart = rawTime.split('T')[1] || '00:00';
        const datePart = rawTime.split('T')[0] || '';
        const [hourStr] = timePart.split(':');
        const hNum = parseInt(hourStr, 10);

        const wCode = Number(hourly.weather_code?.[idx] ?? 2);
        const wInfo = WMO_MAP[wCode] || { text: 'Partly Cloudy', isRain: false };
        const tempVal = Math.round(hourly.temperature_2m?.[idx] ?? 28);
        const feelsVal = Math.round(hourly.apparent_temperature?.[idx] ?? tempVal);
        const rainProb = Math.round(hourly.precipitation_probability?.[idx] ?? 0);
        const rainMm = Number(hourly.precipitation?.[idx] ?? 0);
        const hum = Math.round(hourly.relative_humidity_2m?.[idx] ?? 70);
        const wSpeed = Math.round(hourly.wind_speed_10m?.[idx] ?? 10);
        const wDeg = Number(hourly.wind_direction_10m?.[idx] ?? 0);
        const cloud = Math.round(hourly.cloud_cover?.[idx] ?? 40);

        if (tempVal < minT) minT = tempVal;
        if (tempVal > maxT) maxT = tempVal;

        // Friendly display time
        let formattedTime = timePart;
        if (i === 0) {
          formattedTime = wh.now;
        } else {
          const ampm = hNum >= 12 ? 'PM' : 'AM';
          const h12 = hNum % 12 || 12;
          formattedTime = `${h12} ${ampm}`;
        }

        const dateObj = new Date(datePart);
        const formattedDate = dateObj.toLocaleDateString(isTamil ? 'ta-IN' : 'en-US', {
          day: 'numeric',
          month: 'short',
        });

        points.push({
          timeStr: formattedTime,
          hourNum: hNum,
          dateStr: formattedDate,
          isNow: i === 0,
          temp: tempVal,
          feelsLike: feelsVal,
          condition: wInfo.text,
          tamilCondition: WMO_TAMIL_TRANSLATIONS[wInfo.text] || wInfo.text,
          weatherCode: wCode,
          rainfallMm: rainMm,
          rainChance: rainProb,
          humidity: hum,
          windSpeed: wSpeed,
          windDir: getCompass(wDeg),
          cloudCover: cloud,
        });
      }

      setHourlyData(points);

      // Current Summary metrics
      const cWCode = Number(current.weather_code ?? (points[0]?.weatherCode || 2));
      const cInfo = WMO_MAP[cWCode] || { text: 'Partly Cloudy', isRain: false };
      const cTemp = Math.round(current.temperature_2m ?? (points[0]?.temp || 28));
      const cFeels = Math.round(current.apparent_temperature ?? (points[0]?.feelsLike || cTemp));
      const cHum = Math.round(current.relative_humidity_2m ?? (points[0]?.humidity || 70));
      const cWind = Math.round(current.wind_speed_10m ?? (points[0]?.windSpeed || 12));
      const cDeg = Number(current.wind_direction_10m ?? 0);
      const cPress = Math.round(current.surface_pressure ?? 1012);
      const cCloud = Math.round(current.cloud_cover ?? (points[0]?.cloudCover || 45));
      const cPrecip = Number(current.precipitation ?? (points[0]?.rainfallMm || 0));

      setCurrentMetrics({
        temp: cTemp,
        feelsLike: cFeels,
        condition: cInfo.text,
        tamilCondition: WMO_TAMIL_TRANSLATIONS[cInfo.text] || cInfo.text,
        minTemp: minT < 900 ? minT : cTemp - 4,
        maxTemp: maxT > -900 ? maxT : cTemp + 4,
        humidity: cHum,
        windSpeed: cWind,
        windDir: getCompass(cDeg),
        pressure: cPress,
        cloudCover: cCloud,
        rainfallMm: cPrecip,
        rainChance: points[0]?.rainChance || 15,
      });
    } catch (err: any) {
      console.warn('[HourlyWeatherSection] Failed to load hourly forecast:', err);
      setError(err?.message || 'Weather forecast temporarily unavailable');
    } finally {
      setLoading(false);
    }
  }, [isTamil]);

  useEffect(() => {
    fetchHourlyForecast();
  }, [fetchHourlyForecast]);

  // Card click handlers: clicking any 24h card updates the top cards; clicking again or clicking the hero card resets to live
  const handleHourClick = (index: number) => {
    setSelectedHourIndex((prev) => (prev === index ? null : index));
  };

  const handleLiveObservationClick = () => {
    setSelectedHourIndex(null);
  };

  return (
    <section className={`relative z-10 w-full py-16 sm:py-24 ${className}`}>
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Main Card Container with theme-relevant solid background */}
        <div className="relative rounded-[28px] sm:rounded-[36px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden p-6 sm:p-8 lg:p-10 transition-all duration-300">
          {/* Section Header with AnimatedContent */}
          <AnimatedContent
            distance={120}
            direction="vertical"
            duration={1.4}
            ease="elastic.out(1, 0.55)"
            blur={0}
            stagger={0.08}
            threshold={0.1}
            className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800"
          >
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                  <span>{wh.badge}</span>
                </span>

                {/* Location Badge (Shows user village/city or Tenkasi default) */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${locationInfo.isUserLocation
                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20'
                    : 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border-cyan-500/20'
                    }`}
                >
                  <span>📍</span>
                  <span>{locationInfo.displayName}</span>
                  <span className="text-[10px] font-normal opacity-80">
                    {locationInfo.isUserLocation
                      ? wh.yourLocation
                      : wh.tenkasiBenchmark}
                  </span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight m-0">
                {wh.horizonTitle.replace('{name}', locationInfo.displayName)}
              </h2>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-normal m-0">
                {wh.horizonSubtitle}
              </p>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={fetchHourlyForecast}
                disabled={loading}
                title={wh.refresh}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
              >
                <RefreshCwIcon size={16} className={loading ? 'animate-spin' : ''} />
              </button>

              <Link
                href="/weather"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <span>{wh.fullRadar}</span>
                <ArrowUpRightIcon size={14} />
              </Link>
            </div>
          </AnimatedContent>

          {/* 1. Real-time Hero Weather Dashboard Row (PlanSummaryReflectiveCard - matching Farm Summary Page) */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 my-8 items-stretch">
            {/* Left Hero Card: Current Temperature, Condition & Volumetric Art */}
            <div className="lg:col-span-5 h-full">
              <AnimatedContent
                distance={120}
                direction="horizontal"
                duration={1.6}
                ease="expo.out(1, 0.55)"
                blur={0}
                threshold={0.1}
                className="h-full"
                delay={0.2}
              >
                <PlanSummaryReflectiveCard
                  theme="dark"
                  tint="#0ea5e9"
                  metalness={0.9}
                  roughness={0.3}
                  blurStrength={6}
                  shine={1}
                  glare={0.5}
                  warp={0.5}
                  bevel={3}
                  radius={24}
                  enableTilt
                  height="100%"
                  onClick={handleLiveObservationClick}
                  className="min-h-[295px] shadow-xl cursor-pointer"
                  bodyClassName={
                    selectedHourIndex === null
                      ? '!border-2 !border-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.3)]'
                      : 'border border-white/10 hover:border-sky-400/50 transition-colors'
                  }
                >
                  <div className="h-full flex flex-col justify-between text-left select-none p-1 sm:p-2">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full border border-sky-400/40 bg-sky-500/20 flex items-center justify-center text-sky-300 shrink-0">
                          <CheckCircleIcon size={12} />
                        </span>
                        <div className="leading-tight text-left">
                          <div className="text-[12px] font-bold text-white">
                            {displayMetrics.isLive
                              ? wh.liveObservation
                              : wh.selectedHour.replace('{time}', displayMetrics.timeLabel)}
                          </div>
                          <div className="text-[10px] font-mono text-sky-200/80 truncate max-w-[190px]">
                            {locationInfo.displayName}
                          </div>
                        </div>
                      </div>
                      <span className="plan-reflective-card__tile !w-11 !h-11 sm:!w-12 sm:!h-12 flex items-center justify-center p-1 overflow-hidden rounded-2xl bg-slate-900/40 border border-white/10 shadow-inner">
                        <img
                          src="/icons/animated/thermometer.gif"
                          alt="Temperature animated icon by Magnific - Flaticon"
                          className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
                        />
                      </span>
                    </div>

                    {/* Center Hero: Large Temp & Animated Weather Illustration */}
                    <div className="my-auto py-3 flex items-center justify-between gap-4">
                      <div className="space-y-1 text-left">
                        <div className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none drop-shadow-md">
                          <AnimatedCounter value={displayMetrics.temp} suffix="°C" />
                        </div>
                        <div className="text-base font-bold text-sky-200 mt-1">
                          {locale === 'ta' ? displayMetrics.tamilCondition : displayMetrics.condition}
                        </div>
                        <div className="text-xs text-slate-300 font-medium">
                          {wh.thermalComfort}{' '}
                          <AnimatedCounter value={displayMetrics.feelsLike} suffix="°C" />
                        </div>
                      </div>

                      <div className="shrink-0">
                        <WeatherDayIcon
                          rainfall={displayMetrics.rainfallMm}
                          cloudCover={displayMetrics.cloudCover}
                          conditionText={displayMetrics.condition}
                          isNight={
                            activeHourPoint
                              ? activeHourPoint.hourNum < 6 || activeHourPoint.hourNum >= 18
                              : new Date().getHours() < 6 || new Date().getHours() >= 18
                          }
                          className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-2xl"
                        />
                      </div>
                    </div>

                    {/* Footer Row */}
                    <div className="pt-2.5 flex items-center justify-between text-[11px] text-slate-300">
                      <span className="font-semibold text-white/90">
                        {wh.diurnalRange}{' '}
                        <span className="text-sky-300 font-bold">
                          <AnimatedCounter value={displayMetrics.minTemp} suffix="°C" /> –{' '}
                          <AnimatedCounter value={displayMetrics.maxTemp} suffix="°C" />
                        </span>
                      </span>
                      {displayMetrics.isLive ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{wh.liveSync}</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLiveObservationClick();
                          }}
                          className="flex items-center gap-1 text-sky-300 hover:text-white hover:underline font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                        >
                          <span>↺ {wh.backToLive}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </PlanSummaryReflectiveCard>
              </AnimatedContent>
            </div>

            {/* Right 4 Telemetry Metric Reflective Cards */}
            <AnimatedContent
              distance={120}
              direction="horizontal"
              duration={1.6}
              ease="elastic.out(1, 0.55)"
              blur={0}
              delay={0.08}
              stagger={0.08}
              threshold={0.1}
              className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3.5 h-full"
            >
              {/* Telemetry 1: Rain Probability */}
              <PlanSummaryReflectiveCard
                theme="dark"
                tint="#0284c7"
                metalness={0.9}
                roughness={0.3}
                blurStrength={6}
                shine={1}
                glare={0.5}
                warp={0.5}
                bevel={3}
                radius={20}
                enableTilt
                height="100%"
                className="min-h-[295px] shadow-xl"
                bodyClassName="border border-white/10 hover:border-sky-400/50 transition-colors"
              >
                <div className="h-full flex flex-col justify-between text-left select-none p-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="leading-tight text-left">
                      <div className="text-[11px] font-bold text-white">
                        {wh.precipitation}
                      </div>
                      <div className="text-[9px] font-mono text-sky-200">
                        {wh.riskIndex}
                      </div>
                    </div>
                    <span className="plan-reflective-card__tile !w-11 !h-11 sm:!w-12 sm:!h-12 flex items-center justify-center p-1 overflow-hidden rounded-2xl bg-slate-900/40 border border-white/10 shadow-inner">
                      <img
                        src="/icons/animated/precipitation.gif"
                        alt="Precipitation animated icon by Magnific - Flaticon"
                        className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
                      />
                    </span>
                  </div>

                  <div className="my-auto py-2 text-left">
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                      <AnimatedCounter value={displayMetrics.rainChance} suffix="%" />
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 font-medium">
                      {displayMetrics.rainfallMm > 0 ? (
                        <>
                          <AnimatedCounter value={displayMetrics.rainfallMm} decimals={1} /> mm
                        </>
                      ) : (
                        wh.clearDry
                      )}
                    </div>
                  </div>
                </div>
              </PlanSummaryReflectiveCard>

              {/* Telemetry 2: Relative Humidity */}
              <PlanSummaryReflectiveCard
                theme="dark"
                tint="#10b981"
                metalness={0.9}
                roughness={0.3}
                blurStrength={6}
                shine={1}
                glare={0.5}
                warp={0.5}
                bevel={3}
                radius={20}
                enableTilt
                height="100%"
                className="min-h-[295px] shadow-xl"
                bodyClassName="border border-white/10 hover:border-emerald-400/50 transition-colors"
              >
                <div className="h-full flex flex-col justify-between text-left select-none p-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="leading-tight text-left">
                      <div className="text-[11px] font-bold text-white">
                        {wh.humidity}
                      </div>
                      <div className="text-[9px] font-mono text-emerald-300">
                        {wh.ambientRh}
                      </div>
                    </div>
                    <span className="plan-reflective-card__tile !w-11 !h-11 sm:!w-12 sm:!h-12 flex items-center justify-center p-1 overflow-hidden rounded-2xl bg-slate-900/40 border border-white/10 shadow-inner">
                      <img
                        src="/icons/animated/humidity.gif"
                        alt="Humidity animated icon by Magnific - Flaticon"
                        className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
                      />
                    </span>
                  </div>

                  <div className="my-auto py-2 text-left">
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                      <AnimatedCounter value={displayMetrics.humidity} suffix="%" />
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 font-medium">
                      {displayMetrics.humidity > 75
                        ? wh.highMoist
                        : wh.optimalZone}
                    </div>
                  </div>
                </div>
              </PlanSummaryReflectiveCard>

              {/* Telemetry 3: Wind Velocity */}
              <PlanSummaryReflectiveCard
                theme="dark"
                tint="#06b6d4"
                metalness={0.9}
                roughness={0.3}
                blurStrength={6}
                shine={1}
                glare={0.5}
                warp={0.5}
                bevel={3}
                radius={20}
                enableTilt
                height="100%"
                className="min-h-[295px] shadow-xl"
                bodyClassName="border border-white/10 hover:border-cyan-400/50 transition-colors"
              >
                <div className="h-full flex flex-col justify-between text-left select-none p-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="leading-tight text-left">
                      <div className="text-[11px] font-bold text-white">
                        {wh.windSpeed}
                      </div>
                      <div className="text-[9px] font-mono text-cyan-300">
                        {wh.surface10m}
                      </div>
                    </div>
                    <span className="plan-reflective-card__tile !w-11 !h-11 sm:!w-12 sm:!h-12 flex items-center justify-center p-1 overflow-hidden rounded-2xl bg-slate-900/40 border border-white/10 shadow-inner">
                      <img
                        src="/icons/animated/wind.gif"
                        alt="Wind Speed animated icon by Magnific - Flaticon"
                        className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
                      />
                    </span>
                  </div>

                  <div className="my-auto py-2 text-left">
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                      <AnimatedCounter value={displayMetrics.windSpeed} /> <span className="text-xs font-normal">km/h</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 font-medium">
                      {displayMetrics.windDir} {wh.bearing}
                    </div>
                  </div>
                </div>
              </PlanSummaryReflectiveCard>

              {/* Telemetry 4: Cloud Canopy */}
              <PlanSummaryReflectiveCard
                theme="dark"
                tint="#8b5cf6"
                metalness={0.9}
                roughness={0.3}
                blurStrength={6}
                shine={1}
                glare={0.5}
                warp={0.5}
                bevel={3}
                radius={20}
                enableTilt
                height="100%"
                className="min-h-[295px] shadow-xl"
                bodyClassName="border border-white/10 hover:border-purple-400/50 transition-colors"
              >
                <div className="h-full flex flex-col justify-between text-left select-none p-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="leading-tight text-left">
                      <div className="text-[11px] font-bold text-white">
                        {wh.cloudCover}
                      </div>
                      <div className="text-[9px] font-mono text-purple-300">
                        {wh.canopyPct}
                      </div>
                    </div>
                    <span className="plan-reflective-card__tile !w-11 !h-11 sm:!w-12 sm:!h-12 flex items-center justify-center p-1 overflow-hidden rounded-2xl bg-slate-900/40 border border-white/10 shadow-inner">
                      <img
                        src="/icons/animated/cloud.gif"
                        alt="Cloud Cover animated icon by Magnific - Flaticon"
                        className="w-8 h-8 sm:w-9 sm:h-9 object-contain"
                      />
                    </span>
                  </div>

                  <div className="my-auto py-2 text-left">
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">
                      <AnimatedCounter value={displayMetrics.cloudCover} suffix="%" />
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 font-medium">
                      <AnimatedCounter value={displayMetrics.pressure} suffix=" hPa" />
                    </div>
                  </div>
                </div>
              </PlanSummaryReflectiveCard>
            </AnimatedContent>
          </div>

          {/* 2. 24-Hour Free Scroll Motion Carousel (ReflectiveCard with Momentum Scroll) */}
          <div className="relative z-10 pt-4">
            {loading && hourlyData.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                <RefreshCwIcon size={24} className="animate-spin text-sky-500" />
                <span className="text-sm">
                  {wh.loadingTelemetry}
                </span>
              </div>
            ) : error && hourlyData.length === 0 ? (
              <div className="py-8 text-center text-rose-500 text-sm">
                <span>{error}</span>
              </div>
            ) : (
              <>
                {/* 24-Hour Horizon Track Header */}
                <div className="flex items-center gap-2 flex-wrap mb-3 px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    {wh.hourByHourTrack}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                    ({hourlyData.length} {wh.points})
                  </span>
                  <span className="hidden sm:inline text-slate-400 dark:text-slate-500">•</span>
                  <span className="hidden sm:inline text-slate-500 dark:text-slate-400 font-medium">
                    {wh.dragOrSwipe}
                  </span>
                </div>

                <MotionFreeScrollCarousel
                  itemCount={hourlyData.length}
                  autoScroll={true}
                  autoScrollSpeed={32}
                  showArrows={false}
                  gap={14}
                >
                  {hourlyData.map((item, index) => {
                    const isRain = item.rainfallMm > 0 || item.rainChance >= 40;
                    const isCurrent = item.isNow;
                    const isSelected = selectedHourIndex === index;

                    return (
                      <div
                        key={index}
                        className="w-[140px] sm:w-[155px] shrink-0"
                      >
                        <ReflectiveCard
                          theme="dark"
                          height="100%"
                          width="100%"
                          radius={20}
                          enableTilt
                          tiltStrength={8}
                          intro={false}
                          onClick={() => handleHourClick(index)}
                          className="weather-carousel-card h-full cursor-pointer transition-transform duration-200 active:scale-95"
                          bodyClassName={`transition-all duration-300 ${isSelected
                            ? '!border-2 !border-sky-400 !shadow-[0_0_25px_rgba(56,189,248,0.55)] !bg-sky-950/90'
                            : isCurrent
                              ? '!border-2 !border-emerald-400/90 !shadow-[0_0_20px_rgba(16,185,129,0.45)] !bg-emerald-950/80'
                              : '!border !border-white/15 hover:!border-sky-400/70 hover:!shadow-[0_8px_20px_rgba(56,189,248,0.25)] !bg-slate-900/90 backdrop-blur-md'
                            }`}
                        >
                          <div className="flex flex-col h-full justify-between items-center text-center p-1 sm:p-2 select-none text-white">
                            {/* Time & Active Badge */}
                            <div className="w-full flex items-center justify-between pb-1.5 border-b border-white/10">
                              <span className="text-xs font-black text-white">
                                {item.timeStr}
                              </span>
                              {isCurrent ? (
                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow">
                                  {wh.active}
                                </span>
                              ) : (
                                <span className="text-[10px] text-white/60 font-medium">
                                  {item.dateStr}
                                </span>
                              )}
                            </div>

                            {/* Volumetric Weather Icon */}
                            <div className="py-2.5">
                              <WeatherDayIcon
                                rainfall={item.rainfallMm}
                                cloudCover={item.cloudCover}
                                conditionText={item.condition}
                                isNight={item.hourNum < 6 || item.hourNum >= 18}
                                className="w-12 h-10 drop-shadow-lg"
                              />
                            </div>

                            {/* Temperature */}
                            <div className="text-2xl font-black text-white tracking-tight leading-none">
                              <AnimatedCounter value={item.temp} suffix="°" />
                            </div>

                            {/* Condition Description */}
                            <div className="text-[11px] font-semibold text-white/85 truncate max-w-full px-1 my-1">
                              {locale === 'ta' ? item.tamilCondition : item.condition}
                            </div>

                            {/* Precipitation Risk Chip */}
                            <div
                              className={`w-full py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 ${isRain
                                ? 'bg-sky-500/25 text-sky-200 border border-sky-400/40 shadow-sm'
                                : 'bg-white/10 text-white/70'
                                }`}
                            >
                              <span>🌧️</span>
                              <span><AnimatedCounter value={item.rainChance} suffix="%" /></span>
                              {item.rainfallMm > 0 && <span className="text-[9px]">({item.rainfallMm}mm)</span>}
                            </div>

                            {/* Humidity & Wind Speed Micro-metrics */}
                            <div className="w-full pt-2 mt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/70 font-semibold">
                              <span title={wh.humidityLabel}>💧 <AnimatedCounter value={item.humidity} suffix="%" /></span>
                              <span title={wh.windLabel}>💨 <AnimatedCounter value={item.windSpeed} suffix="k" /></span>
                            </div>
                          </div>
                        </ReflectiveCard>
                      </div>
                    );
                  })}
                </MotionFreeScrollCarousel>
              </>
            )}
          </div>

          {/* Bottom Guidance & Destination Links */}
          <div className="relative z-10 pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>
                {locationInfo.isUserLocation
                  ? wh.farmCalibrated.replace('{name}', locationInfo.displayName)
                  : wh.defaultBenchmark}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/settings?user-profile"
                className="font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                {wh.setVillage}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
