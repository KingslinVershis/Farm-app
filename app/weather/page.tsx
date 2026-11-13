'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CloudSunIcon } from '@/components/icons/Icons';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Select } from 'antd';
import { motion } from 'motion/react';
import {
  MapPin,
  RefreshCw,
  Droplets,
  Wind,
  CloudRain,
  Sprout,
  AlertTriangle,
  Search,
} from '@/components/icons/FlaticonIcons';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { AnimatedCounter } from '@/components/reactbits/AnimatedCounter';
import ReflectiveCard from '@/components/reactbits/ReflectiveCard';
import {
  WeatherDayIcon,
  getWeatherBackgroundVideo,
} from '@/components/weather/WeatherIllustrations';
import {
  type WeatherApiResponse,
  type WeatherDistrict,
  type WeatherDashboardData,
  getCompassDirection,
  getWeatherCondition,
  cleanAdvisoryLines,
  readSavedWeatherLocation,
  persistWeatherLocation,
  WEATHER_LOCATION_STORAGE_KEY,
} from '@/lib/weather';

function formatForecastDateLabel(
  dateStr: string,
  locale: string
): { primary: string; shortDay: string; sub: string } {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { primary: dateStr, shortDay: dateStr.slice(-2), sub: '' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((parsed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const shortDate = parsed.toLocaleDateString(locale === 'ta' ? 'ta-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
  });
  const weekdayLong = parsed.toLocaleDateString(locale === 'ta' ? 'ta-IN' : 'en-IN', {
    weekday: 'long',
  });
  const weekdayShort = parsed.toLocaleDateString('en-US', {
    weekday: 'short',
  }).toUpperCase();

  if (diffDays === 0) {
    return {
      primary: locale === 'ta' ? 'இன்று' : 'Today',
      shortDay: weekdayShort,
      sub: shortDate,
    };
  }
  if (diffDays === 1) {
    return {
      primary: locale === 'ta' ? 'நாளை' : 'Tomorrow',
      shortDay: weekdayShort,
      sub: shortDate,
    };
  }
  return {
    primary: weekdayLong,
    shortDay: weekdayShort,
    sub: shortDate,
  };
}

export default function WeatherPage() {
  const { messages, locale } = useLanguage();
  const isTamil = locale === 'ta';
  const w = messages.weatherPage;
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [districts, setDistricts] = useState<WeatherDistrict[]>([]);
  const [dashboard, setDashboard] = useState<WeatherDashboardData | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [districtSearchText, setDistrictSearchText] = useState<string>('');
  const [districtSearching, setDistrictSearching] = useState<boolean>(false);
  const [blockSearchText, setBlockSearchText] = useState<string>('');
  const [blockSearching, setBlockSearching] = useState<boolean>(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSearch, setCropSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchWeather = useCallback(
    async (opts?: {
      districtId?: string;
      blockId?: string;
      districtName?: string;
      blockName?: string;
      isManualRefresh?: boolean;
      persist?: boolean;
    }) => {
      if (opts?.isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        if (opts?.districtId) params.set('district_id', opts.districtId);
        if (opts?.blockId) params.set('block_id', opts.blockId);
        if (opts?.districtName) params.set('district_name', opts.districtName);
        if (opts?.blockName) params.set('block_name', opts.blockName);

        const qs = params.toString();
        const res = await fetch(qs ? `/api/weather?${qs}` : '/api/weather');
        if (!res.ok) {
          throw new Error(`Failed to fetch weather data (${res.status})`);
        }
        const json: WeatherApiResponse = await res.json();
        if (!json.success || !json.dashboard) {
          throw new Error(json.error || 'No weather data available.');
        }

        if (Array.isArray(json.districts) && json.districts.length > 0) {
          setDistricts(json.districts);
        }
        setDashboard(json.dashboard);
        setSelectedDistrictId(json.resolvedDistrictId);
        setSelectedBlockId(json.resolvedBlockId);
        setSelectedDayIndex(0);

        if (opts?.persist !== false) {
          const activeBlock = json.dashboard.blocks?.find(
            (b) => String(b.block_id) === String(json.resolvedBlockId)
          );
          persistWeatherLocation({
            districtId: json.resolvedDistrictId,
            blockId: json.resolvedBlockId,
            districtName: json.dashboard.district?.district_name,
            blockName: activeBlock?.block_name,
          });
        }
      } catch (err: any) {
        console.error('[WeatherPage] fetch error:', err);
        setError(err?.message || 'Unable to load agro-weather telemetry.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Initial load: resolve user's saved weather or profile location
  useEffect(() => {
    let active = true;
    const init = async () => {
      let saved = readSavedWeatherLocation();
      if (!saved.districtId && !saved.districtName) {
        try {
          const userRes = await fetch('/api/user');
          if (userRes.ok) {
            const userJson = await userRes.json();
            if (userJson?.user?.district || userJson?.user?.city) {
              saved = {
                districtName: userJson.user.district || undefined,
                blockName: userJson.user.city || undefined,
              };
            }
          }
        } catch {
          // Silent fallback to server default
        }
      }
      if (!active) return;
      await fetchWeather({
        districtId: saved.districtId,
        blockId: saved.blockId,
        districtName: saved.districtName,
        blockName: saved.blockName,
        persist: true,
      });
    };
    init();
    return () => {
      active = false;
    };
  }, [fetchWeather]);

  // Reset to user's saved Settings / Farmer profile location
  const handleUseProfileLocation = async () => {
    try {
      localStorage.removeItem(WEATHER_LOCATION_STORAGE_KEY);
    } catch { }

    let profileDistrict = '';
    let profileCity = '';

    try {
      const userRes = await fetch('/api/user');
      if (userRes.ok) {
        const userJson = await userRes.json();
        profileDistrict = userJson?.user?.district || '';
        profileCity = userJson?.user?.city || '';
      }
    } catch { }

    if (!profileDistrict) {
      const fallback = readSavedWeatherLocation();
      profileDistrict = fallback.districtName || '';
      profileCity = fallback.blockName || '';
    }

    fetchWeather({
      districtName: profileDistrict || undefined,
      blockName: profileCity || undefined,
      isManualRefresh: true,
      persist: true,
    });
  };

  const handleDistrictChange = (newDistrictId: string) => {
    setSelectedDistrictId(newDistrictId);
    setSelectedBlockId('');
    fetchWeather({
      districtId: newDistrictId,
      isManualRefresh: true,
      persist: true,
    });
  };

  const handleBlockChange = (newBlockId: string) => {
    setSelectedBlockId(newBlockId);
    fetchWeather({
      districtId: selectedDistrictId || dashboard?.district?.district_id,
      blockId: newBlockId,
      isManualRefresh: true,
      persist: true,
    });
  };

  const districtOptions = useMemo(() => {
    return districts.map((d) => ({
      value: String(d.id),
      label: isTamil && d.tamil_dist_name ? `${d.tamil_dist_name} (${d.District_Name})` : d.District_Name,
      searchStr: `${d.District_Name} ${d.tamil_dist_name || ''}`.toLowerCase(),
    }));
  }, [districts, isTamil]);

  const blockOptions = useMemo(() => {
    const blocks = dashboard?.blocks || [];
    return blocks.map((b) => ({
      value: String(b.block_id),
      label: isTamil && b.block_reg_name ? `${b.block_reg_name} (${b.block_name})` : b.block_name,
      searchStr: `${b.block_name} ${b.block_reg_name || ''}`.toLowerCase(),
    }));
  }, [dashboard, isTamil]);

  const activeBlockObj = useMemo(() => {
    return dashboard?.blocks?.find((b) => String(b.block_id) === String(selectedBlockId || dashboard?.block_id));
  }, [dashboard, selectedBlockId]);

  const forecastList = useMemo(() => dashboard?.forecast || [], [dashboard]);
  const safeDayIndex = forecastList[selectedDayIndex] ? selectedDayIndex : 0;
  const activeDay = forecastList[safeDayIndex] || null;
  const activeCondition = activeDay
    ? getWeatherCondition(activeDay.rainfall, activeDay.cloud_cover)
    : null;
  const activeDateMeta = activeDay ? formatForecastDateLabel(activeDay.forecast_date, locale) : null;

  const chartData = useMemo(() => {
    return forecastList.map((d) => {
      const meta = formatForecastDateLabel(d.forecast_date, locale);
      return {
        dateLabel: meta.sub || d.forecast_date,
        maxTemp: Number(d.temperature_max) || 0,
        minTemp: Number(d.temperature_min) || 0,
        rainfall: Number(d.rainfall) || 0,
      };
    });
  }, [forecastList, locale]);

  const weatherSummaryLines = useMemo(() => {
    const firstAdv = dashboard?.advisory?.[0];
    if (!firstAdv) return [];
    const text = isTamil
      ? firstAdv.weather_summary_reg || firstAdv.weather_summary_eng
      : firstAdv.weather_summary_eng || firstAdv.weather_summary_reg;
    return cleanAdvisoryLines(text);
  }, [dashboard, isTamil]);

  const generalAdvisoryLines = useMemo(() => {
    const firstAdv = dashboard?.advisory?.[0];
    if (!firstAdv) return [];
    const text = isTamil
      ? firstAdv.general_advisory_reg || firstAdv.general_advisory_eng
      : firstAdv.general_advisory_eng || firstAdv.general_advisory_reg;
    return cleanAdvisoryLines(text);
  }, [dashboard, isTamil]);

  const advisoryCategories = useMemo(() => {
    const list = dashboard?.advisory || [];
    const set = new Set<string>();
    list.forEach((a) => {
      if (a.category_name) set.add(a.category_name);
    });
    return ['all', ...Array.from(set)];
  }, [dashboard]);

  const filteredCropAdvisories = useMemo(() => {
    const list = dashboard?.advisory || [];
    return list.filter((item) => {
      const catMatch = selectedCategory === 'all' || item.category_name === selectedCategory;
      const searchMatch =
        !cropSearch.trim() ||
        `${item.crop_name} ${item.category_name}`.toLowerCase().includes(cropSearch.trim().toLowerCase());
      return catMatch && searchMatch;
    });
  }, [dashboard, selectedCategory, cropSearch]);

  const displayDistrictName = isTamil && dashboard?.district?.district_reg_name
    ? dashboard.district.district_reg_name
    : dashboard?.district?.district_name || 'Tamil Nadu';

  const displayBlockName = isTamil && activeBlockObj?.block_reg_name
    ? activeBlockObj.block_reg_name
    : activeBlockObj?.block_name || '';

  const backgroundVideoSrc = activeDay
    ? getWeatherBackgroundVideo(activeDay.rainfall, activeDay.cloud_cover)
    : '/videos/storm_cloud.mp4';

  return (
    <div className="relative min-h-screen w-full">
      {/* Background Ambient Weather Video Loop */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <video
          key={backgroundVideoSrc}
          src={backgroundVideoSrc}
          autoPlay
          loop
          muted
          playsInline
          poster="/images/weather.jpg"
          className="w-full h-full object-cover scale-105"
        />
      </div>
      <div className="fixed inset-0 pointer-events-none z-0 gpu-accelerate" />

      <div className="relative z-10 fade-in flex flex-col gap-5 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto pb-20">
        {/* District & Block Location Controls */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="glass-panel p-3.5 sm:px-5 sm:py-4 rounded-2xl border border-border-light shadow-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-text-muted mb-1.5">
                {w.districtLabel}
              </label>
              <Select
                showSearch
                value={districtSearchText ? undefined : (selectedDistrictId || undefined)}
                searchValue={districtSearchText}
                placeholder={w.districtPlaceholder}
                onChange={(val) => {
                  setDistrictSearchText('');
                  setDistrictSearching(false);
                  setBlockSearchText('');
                  setBlockSearching(false);
                  handleDistrictChange(val);
                }}
                onSearch={(val) => {
                  setDistrictSearchText(val);
                  setDistrictSearching(val.length > 0);
                }}
                onBlur={() => {
                  setDistrictSearchText('');
                  setDistrictSearching(false);
                }}
                onSelect={() => {
                  setDistrictSearchText('');
                  setDistrictSearching(false);
                }}
                onDropdownVisibleChange={(open) => {
                  if (!open) {
                    setDistrictSearchText('');
                    setDistrictSearching(false);
                  }
                }}
                className={`w-full h-10 text-xs font-semibold custom-antd-select ${districtSearching ? 'is-searching' : ''}`}
                filterOption={(input, option) =>
                  ((option?.searchStr as string) || '').includes(input.toLowerCase())
                }
                options={districtOptions}
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-text-muted mb-1.5">
                {w.blockLabel}
              </label>
              <Select
                showSearch
                value={blockSearchText ? undefined : (selectedBlockId || undefined)}
                searchValue={blockSearchText}
                placeholder={w.blockPlaceholder}
                onChange={(val) => {
                  setBlockSearchText('');
                  setBlockSearching(false);
                  handleBlockChange(val);
                }}
                onSearch={(val) => {
                  setBlockSearchText(val);
                  setBlockSearching(val.length > 0);
                }}
                onBlur={() => {
                  setBlockSearchText('');
                  setBlockSearching(false);
                }}
                onSelect={() => {
                  setBlockSearchText('');
                  setBlockSearching(false);
                }}
                onDropdownVisibleChange={(open) => {
                  if (!open) {
                    setBlockSearchText('');
                    setBlockSearching(false);
                  }
                }}
                disabled={blockOptions.length === 0}
                className={`w-full h-10 text-xs font-semibold custom-antd-select ${blockSearching ? 'is-searching' : ''}`}
                filterOption={(input, option) =>
                  ((option?.searchStr as string) || '').includes(input.toLowerCase())
                }
                options={blockOptions}
              />
            </div>

            <div className="md:col-span-4 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleUseProfileLocation}
                disabled={loading || refreshing}
                className="flex-1 sm:flex-initial h-10 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <MapPin size={14} />
                <span>{w.useMyLocation}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  fetchWeather({
                    districtId: selectedDistrictId || dashboard?.district?.district_id,
                    blockId: selectedBlockId || dashboard?.block_id,
                    isManualRefresh: true,
                  })
                }
                disabled={loading || refreshing}
                className="h-10 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border border-sky-500/35 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                <span>{w.refresh}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Loading / Error State */}
        {loading ? (
          <div className="glass-panel rounded-2xl border border-border-light p-8 space-y-5 animate-pulse">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>{w.loadingText}</span>
            </div>
            <div className="h-72 rounded-3xl skeleton-box" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-56 rounded-2xl skeleton-box" />
              <div className="h-56 rounded-2xl skeleton-box" />
            </div>
          </div>
        ) : error && !dashboard ? (
          <div className="glass-panel rounded-2xl border border-border-light p-12 text-center space-y-3">
            <span className="text-4xl inline-block">⚠️</span>
            <h3 className="text-base font-bold text-rose-500">{w.errorTitle}</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => fetchWeather({ isManualRefresh: true })}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white keep-white font-bold text-xs shadow-md hover:bg-emerald-400 transition-all cursor-pointer"
            >
              {w.retryBtn}
            </button>
          </div>
        ) : (
          <>
            {/* FLOATING HERO DETAILS + ALWAYS-VISIBLE GLASSY 10-DAY FORECAST CARDS */}
            {activeDay && (
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="relative space-y-6"
              >
                {/* Floating Top Hero Row: City + Metrics (Left) | Big Temp (Right) */}
                <div className="keep-white relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 px-2 sm:px-4 pt-2 text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.65)]">
                  {/* Left: City, Day & Clean Minimal Metrics */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-baseline gap-2.5 flex-wrap">
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white m-0">
                          {displayBlockName || displayDistrictName}
                        </h2>
                        {displayBlockName && (
                          <span className="text-xs sm:text-sm font-medium text-white/80">
                            {displayDistrictName}
                          </span>
                        )}
                      </div>
                      <p className="text-xl sm:text-2xl font-normal text-white/95 mt-2.5 mb-0">
                        {activeDateMeta?.primary}
                        <span className="text-sm font-normal text-white/75 ml-2.5">
                          {activeDateMeta?.sub}
                        </span>
                      </p>
                    </div>

                    <div className="space-y-2.5 text-sm text-white/95">
                      <div className="flex items-center gap-3.5">
                        <Droplets size={18} className="text-white/90 shrink-0" strokeWidth={1.6} />
                        <span className="font-normal">
                          {activeDay.humidity}–{activeDay.humidity2}%
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <Wind size={18} className="text-white/90 shrink-0" strokeWidth={1.6} />
                        <span className="font-normal">
                          {getCompassDirection(activeDay.wind_direction)}, {activeDay.wind_speed} km/h
                        </span>
                      </div>

                      <div className="flex items-center gap-3.5">
                        <CloudRain size={18} className="text-white/90 shrink-0" strokeWidth={1.6} />
                        <span className="font-normal">
                          {Number(activeDay.rainfall || 0).toFixed(1)} mm • {activeDay.cloud_cover}/8 cloud
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Clean Large Temperature Display */}
                  <div className="flex flex-col sm:items-end justify-start shrink-0">
                    <div className="text-6xl sm:text-7xl lg:text-[5.5rem] font-extralight tracking-tight text-white leading-none font-sans">
                      +<AnimatedCounter
                        value={
                          activeDay.is_today && activeDay.current_temperature != null
                            ? Number(activeDay.current_temperature) || 0
                            : Number(activeDay.temperature_max) || 0
                        }
                        decimals={1}
                      />
                      <span className="text-4xl sm:text-5xl align-top ml-1 font-extralight">°C</span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2.5 text-sm font-light text-white/90 flex-wrap">
                      {activeDay.is_today && activeDay.current_temperature != null ? (
                        <span>
                          {w.maxTemp.replace(' °C', '')} +{Number(activeDay.temperature_max || 0).toFixed(1)}° •{' '}
                          {w.minTemp.replace(' °C', '')} +{Number(activeDay.temperature_min || 0).toFixed(1)}°C
                        </span>
                      ) : (
                        <span>
                          Min +{Number(activeDay.temperature_min || 0).toFixed(1)}°C
                        </span>
                      )}
                      {activeCondition && (
                        <>
                          <span className="opacity-60">•</span>
                          <span>{isTamil ? activeCondition.labelTa : activeCondition.labelEn}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ALWAYS-VISIBLE GLASSY FORECAST CARDS (TODAY + 10 DAYS) */}
                <div
                  className={`relative z-10 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 ${forecastList.length >= 11 ? 'xl:grid-cols-11' : 'xl:grid-cols-10'
                    }`}
                >
                  {forecastList.map((day, idx) => {
                    const meta = formatForecastDateLabel(day.forecast_date, locale);
                    const isSelected = idx === safeDayIndex;
                    const rainVal = Number(day.rainfall) || 0;
                    const heroVal =
                      day.is_today && day.current_temperature != null
                        ? Number(day.current_temperature) || 0
                        : Number(day.temperature_max) || 0;
                    const minVal = Number(day.temperature_min) || 0;

                    return (
                      <ReflectiveCard
                        key={day.forecast_date}
                        onClick={() => setSelectedDayIndex(idx)}
                        tiltStrength={10}
                        radius={16}
                        height="100%"
                        intro
                        style={{ '--rc-pad': '14px 8px' } as React.CSSProperties}
                        className={`transition-transform ${
                          isSelected
                            ? '[&_.reflective-card__body]:!border-sky-400/80 [&_.reflective-card__body]:ring-2 [&_.reflective-card__body]:ring-sky-400/45 [&_.reflective-card__body]:shadow-[0_12px_30px_rgba(14,165,233,0.28)] -translate-y-1'
                            : ''
                        }`}
                      >
                        <div className="flex flex-col items-center justify-between min-h-[120px] h-full">
                          <WeatherDayIcon
                            rainfall={day.rainfall}
                            cloudCover={day.cloud_cover}
                            className="w-14 h-12 mb-2 transition-transform"
                          />
                          <div className="text-center">
                            <div
                              className={`text-xs sm:text-sm font-bold tracking-widest uppercase ${day.is_today ? 'text-emerald-500 dark:text-emerald-400' : 'text-text-main'
                                }`}
                            >
                              {day.is_today ? (isTamil ? 'இன்று' : 'TODAY') : meta.shortDay}
                            </div>
                            <div className="text-lg font-extrabold text-text-main mt-0.5 leading-tight font-mono">
                              +{Math.round(heroVal)}°C
                            </div>
                            <div className="text-[11px] text-text-muted mt-1 font-medium">
                              {meta.sub} • {Math.round(minVal)}°
                              {rainVal > 0 ? ` • ${rainVal.toFixed(1)}mm` : ''}
                            </div>
                          </div>
                        </div>
                      </ReflectiveCard>
                    );
                  })}
                </div>

                {/* 5-Day Summary Outlook Glassy Container */}
                {weatherSummaryLines.length > 0 && (
                  <div className="relative z-10 p-4 sm:p-5 rounded-2xl glass-panel border border-border-light shadow-xl">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-2">
                      {w.summaryHeading}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-text-secondary leading-relaxed">
                      {weatherSummaryLines.map((line, i) => (
                        <span key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{line}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.section>
            )}

            {/* BOTTOM SECTION 1: 10-DAY FORECAST CHART */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="glass-panel rounded-2xl border border-border-light p-5 sm:p-6 shadow-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-sky-500/15 text-sky-500 border border-sky-500/25">
                    <CloudSunIcon size={18} />
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-text-main m-0">
                    {w.chartHeading}
                  </h3>
                </div>
                {dashboard?.forecast_issue_date && (
                  <span className="text-xs font-semibold text-text-muted">
                    {w.issuedOn} {dashboard.forecast_issue_date}
                  </span>
                )}
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: -12, bottom: 5 }}>
                    <defs>
                      <linearGradient id="maxTempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="minTempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'} />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      yAxisId="temp"
                      tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                      unit="°"
                    />
                    <YAxis
                      yAxisId="rain"
                      orientation="right"
                      tick={{ fill: isDark ? '#38bdf8' : '#0284c7', fontSize: 11 }}
                      unit="mm"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
                        borderRadius: '12px',
                        color: isDark ? '#f1f5f9' : '#0f172a',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    />
                    <Legend />
                    <Bar
                      yAxisId="rain"
                      dataKey="rainfall"
                      name={w.rainLabel + ' (mm)'}
                      fill="#38bdf8"
                      radius={[6, 6, 0, 0]}
                      barSize={20}
                    />
                    <Area
                      yAxisId="temp"
                      type="monotone"
                      dataKey="maxTemp"
                      name={w.maxTemp}
                      stroke="#f97316"
                      strokeWidth={2.5}
                      fill="url(#maxTempGrad)"
                    />
                    <Area
                      yAxisId="temp"
                      type="monotone"
                      dataKey="minTemp"
                      name={w.minTemp}
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      fill="url(#minTempGrad)"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </motion.section>

            {/* BOTTOM SECTION 2: GENERAL & CROP ADVISORIES */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="space-y-4"
            >
              {generalAdvisoryLines.length > 0 && (
                <div className="glass-panel rounded-2xl !border-amber-500/40 p-5 shadow-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={18} className="text-amber-500" />
                      <h3 className="text-sm sm:text-base font-black text-text-main m-0">
                        {w.generalAdvisoryTitle}
                      </h3>
                    </div>
                    {dashboard?.advisory_date && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        {w.advisoryDateLabel} {dashboard.advisory_date}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2 text-xs sm:text-sm text-text-secondary m-0 pl-4 list-disc">
                    {generalAdvisoryLines.map((line, i) => (
                      <li key={i} className="leading-relaxed">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="glass-panel rounded-2xl border border-border-light p-5 sm:p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                      <Sprout size={18} />
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-text-main m-0">
                      {w.cropAdvisoriesTitle} ({filteredCropAdvisories.length})
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        value={cropSearch}
                        onChange={(e) => setCropSearch(e.target.value)}
                        placeholder={w.searchCropPlaceholder}
                        className="w-full h-9 pl-8 pr-3 rounded-xl bg-surface/80 border border-border-light text-xs font-semibold text-text-main placeholder:text-text-muted focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {advisoryCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${selectedCategory === cat
                            ? 'bg-emerald-500 text-white keep-white shadow-sm'
                            : 'bg-surface border border-border-subtle text-text-secondary hover:text-text-main'
                            }`}
                        >
                          {cat === 'all' ? w.allCategories : cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {filteredCropAdvisories.length === 0 ? (
                  <div className="py-10 text-center text-xs text-text-muted">
                    {w.noAdvisoryFound}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredCropAdvisories.map((item, idx) => {
                      const lines = cleanAdvisoryLines(
                        isTamil
                          ? item.advisory_reg || item.advisory_eng
                          : item.advisory_eng || item.advisory_reg
                      );
                      return (
                        <div
                          key={`${item.crop_name}-${idx}`}
                          className="rounded-2xl glass-surface border border-border-light p-4 space-y-2.5 hover:border-emerald-500/40 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border-subtle">
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500">
                                <Sprout size={15} />
                              </span>
                              <h4 className="text-sm font-black text-text-main uppercase tracking-wide m-0">
                                {item.crop_name}
                              </h4>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30">
                              {item.category_name}
                            </span>
                          </div>
                          <ul className="space-y-1.5 text-xs text-text-secondary m-0 pl-4 list-disc">
                            {lines.map((l, i) => (
                              <li key={i} className="leading-relaxed">
                                {l}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.section>

            {/* Footer Source Note */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-5 py-3 rounded-2xl glass-panel border border-border-light text-xs text-text-muted">
              <div className="flex items-center gap-2">
                <span>🌦️</span>
                <span>{w.sourceNote}</span>
              </div>
              {dashboard?.forecast_issue_date && (
                <span className="font-semibold text-text-secondary">
                  {w.issuedOn} {dashboard.forecast_issue_date}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
