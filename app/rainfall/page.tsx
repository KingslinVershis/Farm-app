'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DatePicker, Table, Pagination, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { motion } from 'motion/react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ShinyText } from '@/components/reactbits/ShinyText';
import { AnimatedCounter } from '@/components/reactbits/AnimatedCounter';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import ReflectiveCard from '@/components/reactbits/ReflectiveCard';
import {
  CloudRain,
  Droplets,
  MapPin,
  AlertTriangle,
  Search,
  Calendar,
  ArrowLeft,
  ArrowRight,
  FileText,
  LayoutGrid,
  TableList,
  Compass,
  X,
} from '@/components/icons/FlaticonIcons';
import type {
  RainfallApiResponse,
  RainfallDistrictRecord,
  RainfallStationRecord,
} from '@/app/api/rainfall/route';

interface TalukAggregateRow {
  key: string;
  taluk: string;
  districtName: string;
  districtId: string;
  region: string;
  stationsCount: number;
  avgMm: number;
  maxMm: number;
  maxStation: string;
}

const CARDS_PAGE_SIZE = 24;

function getRainIntensity(mm: number) {
  if (mm >= 115.6) {
    return {
      label: 'Very Heavy',
      dot: '#f43f5e',
      badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/35',
      bar: 'from-rose-500 to-orange-500',
      valueText: 'text-rose-600 dark:text-rose-400',
    };
  }
  if (mm >= 64.5) {
    return {
      label: 'Heavy',
      dot: '#f59e0b',
      badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35',
      bar: 'from-amber-500 to-orange-400',
      valueText: 'text-amber-600 dark:text-amber-400',
    };
  }
  if (mm >= 20) {
    return {
      label: 'Moderate',
      dot: '#06b6d4',
      badge: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/35',
      bar: 'from-cyan-500 to-sky-400',
      valueText: 'text-cyan-600 dark:text-cyan-400',
    };
  }
  return {
    label: 'Light',
    dot: '#10b981',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35',
    bar: 'from-emerald-500 to-teal-400',
    valueText: 'text-emerald-600 dark:text-emerald-400',
  };
}

export default function RainfallPage() {
  const { messages, locale } = useLanguage();
  const isTamil = locale === 'ta';
  const r = (messages as any).rainfallPage;

  const [selectedDate, setSelectedDate] = useState<string>('2026-11-08');
  const [data, setData] = useState<RainfallApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [viewTab, setViewTab] = useState<'districts' | 'taluks' | 'stations'>('districts');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [cardPage, setCardPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchRainfall = useCallback(async (date?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = date ? `/api/rainfall?date=${encodeURIComponent(date)}` : '/api/rainfall';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch rainfall report (${res.status})`);
      const json: RainfallApiResponse = await res.json();
      if (!json.success) throw new Error(json.error || 'No rainfall data found.');
      setData(json);
      if (json.report_date && /^\d{4}-\d{2}-\d{2}$/.test(json.report_date)) {
        setSelectedDate(json.report_date);
      }
    } catch (err: any) {
      console.error('[RainfallPage] fetch error:', err);
      setError(err?.message || 'Unable to load rainfall report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRainfall();
  }, [fetchRainfall]);

  // Reset card pagination whenever filters or tab change
  useEffect(() => {
    setCardPage(1);
  }, [viewTab, selectedRegion, selectedDistrictFilter, searchQuery, data?.report_date]);

  const handleDateSelect = (newDate: string) => {
    setSelectedDate(newDate);
    setSelectedDistrictFilter(null);
    fetchRainfall(newDate);
  };

  const handleDownloadPdf = async () => {
    const targetDate = data?.report_date || selectedDate;
    if (!targetDate) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch(
        `/api/rainfall?downloadPdf=1&date=${encodeURIComponent(targetDate)}`
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `PDF not available for ${targetDate}`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `tn-rainfall-report-${targetDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      message.error(err?.message || 'Unable to download rainfall PDF for this date.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const districts = useMemo(() => data?.districts || [], [data]);
  const stations = useMemo(() => data?.stations || [], [data]);
  const availableDates = useMemo(() => data?.dates || [], [data]);

  const regionCounts = useMemo(() => {
    const map = new Map<string, number>();
    stations.forEach((s) => {
      const reg = s.region || 'Other';
      map.set(reg, (map.get(reg) || 0) + 1);
    });
    return Array.from(map.entries()).map(([region, count]) => ({ region, count }));
  }, [stations]);

  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stations.filter((s) => {
      const regMatch = selectedRegion === 'all' || s.region === selectedRegion;
      const distMatch =
        !selectedDistrictFilter || String(s.district_id) === String(selectedDistrictFilter.id);
      const qMatch =
        !q ||
        s.station.toLowerCase().includes(q) ||
        s.taluk.toLowerCase().includes(q) ||
        s.district.toLowerCase().includes(q) ||
        s.district_en.toLowerCase().includes(q) ||
        s.district_ta.toLowerCase().includes(q);
      return regMatch && distMatch && qMatch;
    });
  }, [stations, selectedRegion, selectedDistrictFilter, searchQuery]);

  const filteredDistricts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return districts.filter((d) => {
      const regMatch = selectedRegion === 'all' || d.region === selectedRegion;
      const distMatch =
        !selectedDistrictFilter || String(d.district_id) === String(selectedDistrictFilter.id);
      const qMatch =
        !q ||
        d.name_en.toLowerCase().includes(q) ||
        d.name_ta.toLowerCase().includes(q) ||
        d.max_station.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q);
      return regMatch && distMatch && qMatch;
    });
  }, [districts, selectedRegion, selectedDistrictFilter, searchQuery]);

  const filteredTaluks = useMemo<TalukAggregateRow[]>(() => {
    const map = new Map<
      string,
      {
        taluk: string;
        districtName: string;
        districtId: string;
        region: string;
        sum: number;
        count: number;
        max: number;
        maxStation: string;
      }
    >();

    filteredStations.forEach((s) => {
      const distName = isTamil && s.district_ta ? s.district_ta : s.district_en || s.district;
      const key = `${s.district_id}-${s.taluk}`;
      const mm = parseFloat(s.mm) || 0;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, {
          taluk: s.taluk,
          districtName: distName,
          districtId: s.district_id,
          region: s.region,
          sum: mm,
          count: 1,
          max: mm,
          maxStation: s.station,
        });
      } else {
        cur.sum += mm;
        cur.count += 1;
        if (mm > cur.max) {
          cur.max = mm;
          cur.maxStation = s.station;
        }
      }
    });

    return Array.from(map.entries())
      .map(([key, v]) => ({
        key,
        taluk: v.taluk,
        districtName: v.districtName,
        districtId: v.districtId,
        region: v.region,
        stationsCount: v.count,
        avgMm: Math.round((v.sum / v.count) * 10) / 10,
        maxMm: Math.round(v.max * 10) / 10,
        maxStation: v.maxStation,
      }))
      .sort((a, b) => b.avgMm - a.avgMm);
  }, [filteredStations, isTamil]);

  const kpiStats = useMemo(() => {
    let highestMm = 0;
    let highestLabel = '-';
    let heavyCount = 0;
    let veryHeavyCount = 0;

    stations.forEach((s) => {
      const mm = parseFloat(s.mm) || 0;
      if (mm > highestMm) {
        highestMm = mm;
        const distName = isTamil && s.district_ta ? s.district_ta : s.district_en || s.district;
        highestLabel = `${s.station}, ${distName}`;
      }
      if (mm >= 64.5) heavyCount += 1;
      if (mm >= 115.6) veryHeavyCount += 1;
    });

    return {
      totalStations: stations.length,
      highestMm: Math.round(highestMm * 10) / 10,
      highestLabel,
      totalDistricts: districts.length,
      heavyCount,
      veryHeavyCount,
    };
  }, [stations, districts, isTamil]);

  const maxDistrictAvg = useMemo(
    () => Math.max(1, ...filteredDistricts.map((d) => Number(d.avg) || 0)),
    [filteredDistricts]
  );
  const maxTalukAvg = useMemo(
    () => Math.max(1, ...filteredTaluks.map((t) => t.avgMm || 0)),
    [filteredTaluks]
  );
  const maxStationMm = useMemo(
    () => Math.max(1, ...filteredStations.map((s) => parseFloat(s.mm) || 0)),
    [filteredStations]
  );

  // Paginated card slices
  const activeCardTotal =
    viewTab === 'districts'
      ? filteredDistricts.length
      : viewTab === 'taluks'
        ? filteredTaluks.length
        : filteredStations.length;

  const pagedDistricts = useMemo(() => {
    const start = (cardPage - 1) * CARDS_PAGE_SIZE;
    return filteredDistricts.slice(start, start + CARDS_PAGE_SIZE);
  }, [filteredDistricts, cardPage]);

  const pagedTaluks = useMemo(() => {
    const start = (cardPage - 1) * CARDS_PAGE_SIZE;
    return filteredTaluks.slice(start, start + CARDS_PAGE_SIZE);
  }, [filteredTaluks, cardPage]);

  const pagedStations = useMemo(() => {
    const start = (cardPage - 1) * CARDS_PAGE_SIZE;
    return filteredStations.slice(start, start + CARDS_PAGE_SIZE);
  }, [filteredStations, cardPage]);

  // Table Columns
  const districtColumns: ColumnsType<RainfallDistrictRecord> = useMemo(
    () => [
      {
        title: r.colDistrict,
        key: 'district',
        width: '28%',
        render: (_, rec) => (
          <div>
            <span className="font-extrabold text-xs sm:text-sm text-text-main block">
              {isTamil && rec.name_ta ? rec.name_ta : rec.name_en}
            </span>
            <span className="text-[11px] text-text-muted">{rec.region}</span>
          </div>
        ),
      },
      {
        title: r.colStations,
        dataIndex: 'stations',
        key: 'stations',
        align: 'right',
        width: '12%',
        render: (val: number) => <span className="font-mono text-xs font-bold text-text-main">{val}</span>,
      },
      {
        title: r.colTaluks,
        dataIndex: 'taluks',
        key: 'taluks',
        align: 'right',
        width: '12%',
        render: (val: number) => <span className="font-mono text-xs text-text-secondary">{val}</span>,
      },
      {
        title: r.colAverage,
        dataIndex: 'avg',
        key: 'avg',
        width: '28%',
        sorter: (a, b) => a.avg - b.avg,
        render: (val: number) => {
          const pct = Math.min(100, Math.round((val / maxDistrictAvg) * 100));
          return (
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-mono text-xs font-black text-cyan-600 dark:text-cyan-400 w-14 text-right">
                {Number(val).toFixed(1)} mm
              </span>
            </div>
          );
        },
      },
      {
        title: r.colHighest,
        key: 'max',
        align: 'right',
        width: '20%',
        sorter: (a, b) => a.max - b.max,
        render: (_, rec) => (
          <div>
            <span className="font-mono text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 block">
              {Number(rec.max).toFixed(1)} mm
            </span>
            <span className="text-[11px] text-text-muted">{rec.max_station}</span>
          </div>
        ),
      },
    ],
    [r, isTamil, maxDistrictAvg]
  );

  const talukColumns: ColumnsType<TalukAggregateRow> = useMemo(
    () => [
      {
        title: r.colTaluk,
        dataIndex: 'taluk',
        key: 'taluk',
        render: (val: string, rec) => (
          <div>
            <span className="font-extrabold text-xs sm:text-sm text-text-main block">{val}</span>
            <span className="text-[11px] text-text-muted">{rec.districtName}</span>
          </div>
        ),
      },
      {
        title: r.colRegion,
        dataIndex: 'region',
        key: 'region',
        render: (val: string) => <span className="text-xs text-text-secondary">{val}</span>,
      },
      {
        title: r.colStations,
        dataIndex: 'stationsCount',
        key: 'stationsCount',
        align: 'right',
        render: (val: number) => <span className="font-mono text-xs font-bold">{val}</span>,
      },
      {
        title: r.colAverage,
        dataIndex: 'avgMm',
        key: 'avgMm',
        align: 'right',
        sorter: (a, b) => a.avgMm - b.avgMm,
        render: (val: number) => (
          <span className="font-mono text-xs font-black text-cyan-600 dark:text-cyan-400">
            {val.toFixed(1)} mm
          </span>
        ),
      },
      {
        title: r.colHighest,
        key: 'maxMm',
        align: 'right',
        sorter: (a, b) => a.maxMm - b.maxMm,
        render: (_, rec) => (
          <div>
            <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 block">
              {rec.maxMm.toFixed(1)} mm
            </span>
            <span className="text-[11px] text-text-muted">{rec.maxStation}</span>
          </div>
        ),
      },
    ],
    [r]
  );

  const stationColumns: ColumnsType<RainfallStationRecord> = useMemo(
    () => [
      {
        title: '#',
        dataIndex: 'sl_no',
        key: 'sl_no',
        width: '8%',
        align: 'center',
        render: (val: string) => <span className="font-mono text-xs text-text-muted">{val}</span>,
      },
      {
        title: r.colStation,
        dataIndex: 'station',
        key: 'station',
        render: (val: string, rec) => (
          <div>
            <span className="font-extrabold text-xs sm:text-sm text-text-main block">{val}</span>
            <span className="text-[11px] text-text-muted">{rec.taluk}</span>
          </div>
        ),
      },
      {
        title: r.colDistrict,
        key: 'district',
        render: (_, rec) => (
          <div>
            <span className="text-xs font-bold text-text-main block">
              {isTamil && rec.district_ta ? rec.district_ta : rec.district_en || rec.district}
            </span>
            <span className="text-[11px] text-text-muted">{rec.region}</span>
          </div>
        ),
      },
      {
        title: r.colRainfall,
        dataIndex: 'mm',
        key: 'mm',
        align: 'right',
        sorter: (a, b) => (parseFloat(a.mm) || 0) - (parseFloat(b.mm) || 0),
        render: (val: string) => {
          const mm = parseFloat(val) || 0;
          const intensity = getRainIntensity(mm);
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-xs font-black ${intensity.badge}`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: intensity.dot }} />
              {mm.toFixed(1)} mm
            </span>
          );
        },
      },
    ],
    [r, isTamil]
  );

  const shiftDate = (deltaDays: number) => {
    const next = dayjs(selectedDate).add(deltaDays, 'day');
    if (next.isAfter(dayjs(), 'day')) return;
    handleDateSelect(next.format('YYYY-MM-DD'));
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Subtle Atmospheric Ambient Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -top-32 left-1/4 w-[520px] h-[520px] rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute top-1/3 -right-24 w-[420px] h-[420px] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 fade-in flex flex-col gap-5 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto pb-20">
        {/* Modern Atmospheric Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 shadow-xl border border-border-light"
        >
          <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-gradient-to-br from-cyan-500/15 to-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-300">
                  <CloudRain size={13} />
                  {r.bannerTag}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {r.liveBadge}
                </span>
                {data?.report_date && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-text-secondary bg-surface/70 px-3 py-1 rounded-full border border-border-subtle">
                    <Calendar size={12} />
                    {dayjs(data.report_date).format('DD MMM YYYY')}
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-text-main">
                <ShinyText text={r.pageTitle} speed={6} />
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
                {r.pageSubtitle}
              </p>
            </div>

            {/* Integrated Hero Actions */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {availableDates[0] && (
                <button
                  type="button"
                  onClick={() => handleDateSelect(availableDates[0])}
                  className="h-11 px-4 rounded-xl glass-surface border border-border-light hover:border-emerald-500/50 text-xs font-bold text-text-main inline-flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Compass size={14} className="text-emerald-500" />
                  <span>{r.todayBtn}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf || loading}
                className="h-11 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-cyan-500/20 inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <FileText size={14} />
                <span>
                  {downloadingPdf
                    ? r.downloadingPdf
                    : `${r.downloadPdf} (${dayjs(data?.report_date || selectedDate).format('DD MMM')})`}
                </span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Sleek Control Dock: Date Selector + Recent Dates + Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: 'easeOut' }}
          className="glass-panel p-4 rounded-2xl border border-border-light shadow-lg space-y-3"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Date Stepper */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="h-10 w-10 rounded-xl glass-surface border border-border-light flex items-center justify-center text-text-main hover:border-cyan-500/50 transition-colors cursor-pointer"
                aria-label="Previous day"
              >
                <ArrowLeft size={14} />
              </button>
              <DatePicker
                value={selectedDate ? dayjs(selectedDate) : null}
                disabledDate={(cur) => cur && cur > dayjs().endOf('day')}
                format="DD MMM YYYY"
                allowClear={false}
                onChange={(d) => {
                  if (d) handleDateSelect(d.format('YYYY-MM-DD'));
                }}
                className="h-10 text-xs font-semibold rounded-xl custom-antd-picker w-44"
              />
              <button
                type="button"
                onClick={() => shiftDate(1)}
                disabled={dayjs(selectedDate).isSame(dayjs(), 'day')}
                className="h-10 w-10 rounded-xl glass-surface border border-border-light flex items-center justify-center text-text-main hover:border-cyan-500/50 transition-colors cursor-pointer disabled:opacity-40"
                aria-label="Next day"
              >
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:max-w-md">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={r.searchPlaceholder}
                className="w-full h-10 pl-9 pr-9 rounded-xl glass-surface border border-border-light text-xs font-semibold text-text-main placeholder:text-text-muted focus:outline-none focus:border-cyan-500/70 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-1 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Compact Recent Report Date Pills */}
          {availableDates.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pt-2 border-t border-border-subtle">
              <span className="text-[11px] font-bold text-text-muted mr-1 shrink-0">
                {r.recentReports}
              </span>
              {availableDates.slice(0, 10).map((d) => {
                const isActive = d === (data?.report_date || selectedDate);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDateSelect(d)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border shrink-0 ${
                      isActive
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm font-extrabold'
                        : 'glass-surface border-border-subtle text-text-secondary hover:text-text-main hover:border-cyan-500/40'
                    }`}
                  >
                    {dayjs(d).format('D MMM')}
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* KPI Bento Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SpotlightCard className="glass-panel rounded-2xl border border-border-light p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                  {r.stationsWithRain}
                </span>
                <span className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
                  <CloudRain size={15} />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-text-main font-mono">
                <AnimatedCounter value={kpiStats.totalStations} />
              </div>
              <span className="text-xs text-text-muted mt-1 block">{r.stationsReporting}</span>
            </SpotlightCard>

            <SpotlightCard className="glass-panel rounded-2xl border border-border-light p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                  {r.highestRainfall}
                </span>
                <span className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
                  <Droplets size={15} />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                <AnimatedCounter value={kpiStats.highestMm} decimals={1} /> mm
              </div>
              <span className="text-xs text-text-muted mt-1 block truncate">
                {kpiStats.highestLabel}
              </span>
            </SpotlightCard>

            <SpotlightCard className="glass-panel rounded-2xl border border-border-light p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                  {r.districtsWithRain}
                </span>
                <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <MapPin size={15} />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                <AnimatedCounter value={kpiStats.totalDistricts} />
              </div>
              <span className="text-xs text-text-muted mt-1 block">Tamil Nadu</span>
            </SpotlightCard>

            <SpotlightCard className="glass-panel rounded-2xl border border-border-light p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                  {r.heavyRainStations}
                </span>
                <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <AlertTriangle size={15} />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
                <AnimatedCounter value={kpiStats.heavyCount} />
              </div>
              <span className="text-xs text-text-muted mt-1 block">
                {r.heavyRainNote} • {kpiStats.veryHeavyCount} {r.veryHeavyNote}
              </span>
            </SpotlightCard>
          </div>
        )}

        {/* Filter Pills + View Level Tabs + Cards/Table Switch */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedRegion('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                selectedRegion === 'all'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm font-extrabold'
                  : 'glass-panel border-border-light text-text-secondary hover:text-text-main'
              }`}
            >
              {r.allRegions} ({stations.length})
            </button>

            {regionCounts.map((rc) => (
              <button
                key={rc.region}
                type="button"
                onClick={() => setSelectedRegion(rc.region)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                  selectedRegion === rc.region
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm font-extrabold'
                    : 'glass-panel border-border-light text-text-secondary hover:text-text-main'
                }`}
              >
                {rc.region.replace(' Region', '')} ({rc.count})
              </button>
            ))}

            {selectedDistrictFilter && (
              <button
                type="button"
                onClick={() => setSelectedDistrictFilter(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 cursor-pointer hover:bg-emerald-500/30 transition-colors"
                title={r.clearDistrictFilter}
              >
                <span>{selectedDistrictFilter.name}</span>
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start xl:self-auto">
            {/* Level Switcher: Districts | Taluks | Stations */}
            <div className="inline-flex items-center p-1 rounded-xl glass-panel border border-border-light shadow-sm">
              {[
                { id: 'districts' as const, label: r.tabDistricts },
                { id: 'taluks' as const, label: r.tabTaluks },
                { id: 'stations' as const, label: r.tabStations },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setViewTab(t.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewTab === t.id
                      ? 'bg-cyan-500 text-slate-950 shadow-sm font-extrabold'
                      : 'text-text-secondary hover:text-text-main'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Display Mode Switcher: Cards | Table */}
            <div
              role="group"
              aria-label="Rainfall View Mode"
              className="inline-flex items-center p-1 rounded-xl glass-panel border border-border-light shadow-sm"
            >
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm font-extrabold'
                    : 'text-text-secondary hover:text-text-main'
                }`}
              >
                <LayoutGrid size={13} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm font-extrabold'
                    : 'text-text-secondary hover:text-text-main'
                }`}
              >
                <TableList size={13} />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Full-Width Data Section (Cards or Table) */}
        {loading ? (
          <div className="glass-panel rounded-2xl border border-border-light p-6 space-y-4 animate-pulse">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>{r.loadingText}</span>
            </div>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 pt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((card) => (
                  <div key={card} className="skeleton-box h-52 rounded-3xl" />
                ))}
              </div>
            ) : (
              [1, 2, 3, 4, 5, 6].map((row) => (
                <div key={row} className="skeleton-box h-10 rounded-xl" />
              ))
            )}
          </div>
        ) : error ? (
          <div className="glass-panel rounded-2xl border border-border-light p-12 text-center space-y-3">
            <span className="text-4xl inline-block">⚠️</span>
            <p className="text-xs text-rose-500 font-semibold">{error}</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="space-y-5">
            {activeCardTotal === 0 ? (
              <div className="glass-panel rounded-2xl border border-border-light p-12 text-center space-y-2">
                <CloudRain size={28} className="mx-auto text-text-muted" />
                <p className="text-sm font-bold text-text-main">{r.noDataText}</p>
              </div>
            ) : (
              <>
                {/* Districts Cards */}
                {viewTab === 'districts' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                    {pagedDistricts.map((rec) => {
                      const intensity = getRainIntensity(Number(rec.max) || 0);
                      const pct = Math.min(
                        100,
                        Math.round(((Number(rec.avg) || 0) / maxDistrictAvg) * 100)
                      );
                      const distLabel = isTamil && rec.name_ta ? rec.name_ta : rec.name_en;
                      return (
                        <ReflectiveCard
                          key={rec.district_id}
                          onClick={() => {
                            setSelectedDistrictFilter({
                              id: String(rec.district_id),
                              name: distLabel,
                            });
                            setViewTab('stations');
                          }}
                          tiltStrength={9}
                          radius={24}
                          intro
                        >
                          <div className="flex flex-col h-full justify-between gap-4">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${intensity.badge}`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: intensity.dot }}
                                />
                                <span>{intensity.label}</span>
                              </span>
                              <span className="text-[11px] font-semibold text-text-muted truncate">
                                {rec.region.replace(' Region', '')}
                              </span>
                            </div>

                            <div>
                              <h3 className="text-lg font-extrabold text-text-main leading-tight truncate">
                                {distLabel}
                              </h3>
                              <p className="text-xs text-text-muted mt-0.5">
                                {rec.stations} {r.colStations} • {rec.taluks} {r.colTaluks}
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-baseline justify-between text-xs">
                                <span className="text-text-muted font-semibold">{r.colAverage}</span>
                                <span className="font-mono font-black text-cyan-600 dark:text-cyan-400">
                                  {Number(rec.avg).toFixed(1)} mm
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${intensity.bar}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2.5 border-t border-border-subtle text-xs">
                              <div className="min-w-0 pr-2">
                                <span className="text-[10px] uppercase tracking-wider text-text-muted block">
                                  {r.colHighest}
                                </span>
                                <span className="font-semibold text-text-secondary truncate block">
                                  {rec.max_station}
                                </span>
                              </div>
                              <span className={`font-mono text-sm font-black shrink-0 ${intensity.valueText}`}>
                                {Number(rec.max).toFixed(1)} mm
                              </span>
                            </div>
                          </div>
                        </ReflectiveCard>
                      );
                    })}
                  </div>
                )}

                {/* Taluks Cards */}
                {viewTab === 'taluks' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                    {pagedTaluks.map((rec) => {
                      const intensity = getRainIntensity(rec.maxMm);
                      const pct = Math.min(100, Math.round((rec.avgMm / maxTalukAvg) * 100));
                      return (
                        <ReflectiveCard key={rec.key} tiltStrength={9} radius={24} intro>
                          <div className="flex flex-col h-full justify-between gap-4">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${intensity.badge}`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: intensity.dot }}
                                />
                                <span>{intensity.label}</span>
                              </span>
                              <span className="font-mono text-[11px] font-bold text-text-muted">
                                {rec.stationsCount} {r.colStations}
                              </span>
                            </div>

                            <div>
                              <h3 className="text-lg font-extrabold text-text-main leading-tight truncate">
                                {rec.taluk}
                              </h3>
                              <p className="text-xs text-text-muted mt-0.5 truncate">
                                {rec.districtName} • {rec.region.replace(' Region', '')}
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-baseline justify-between text-xs">
                                <span className="text-text-muted font-semibold">{r.colAverage}</span>
                                <span className="font-mono font-black text-cyan-600 dark:text-cyan-400">
                                  {rec.avgMm.toFixed(1)} mm
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${intensity.bar}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2.5 border-t border-border-subtle text-xs">
                              <div className="min-w-0 pr-2">
                                <span className="text-[10px] uppercase tracking-wider text-text-muted block">
                                  {r.colHighest}
                                </span>
                                <span className="font-semibold text-text-secondary truncate block">
                                  {rec.maxStation}
                                </span>
                              </div>
                              <span className={`font-mono text-sm font-black shrink-0 ${intensity.valueText}`}>
                                {rec.maxMm.toFixed(1)} mm
                              </span>
                            </div>
                          </div>
                        </ReflectiveCard>
                      );
                    })}
                  </div>
                )}

                {/* Stations Cards */}
                {viewTab === 'stations' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                    {pagedStations.map((st, idx) => {
                      const mm = parseFloat(st.mm) || 0;
                      const intensity = getRainIntensity(mm);
                      const pct = Math.min(100, Math.round((mm / maxStationMm) * 100));
                      const distName =
                        isTamil && st.district_ta ? st.district_ta : st.district_en || st.district;
                      return (
                        <ReflectiveCard
                          key={`${st.district_id}-${st.sl_no}-${st.station}-${idx}`}
                          tiltStrength={9}
                          radius={24}
                          intro
                        >
                          <div className="flex flex-col h-full justify-between gap-4">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${intensity.badge}`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: intensity.dot }}
                                />
                                <span>{intensity.label}</span>
                              </span>
                              <span className="font-mono text-[11px] font-bold text-text-muted">
                                #{st.sl_no}
                              </span>
                            </div>

                            <div>
                              <h3 className="text-lg font-extrabold text-text-main leading-tight truncate">
                                {st.station}
                              </h3>
                              <p className="text-xs text-text-muted mt-0.5 truncate">
                                {st.taluk} • {distName}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-baseline justify-between">
                                <span className="text-xs text-text-muted font-semibold">
                                  {r.colRainfall}
                                </span>
                                <span className={`font-mono text-2xl font-black ${intensity.valueText}`}>
                                  {mm.toFixed(1)}{' '}
                                  <span className="text-xs font-bold text-text-muted">mm</span>
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${intensity.bar}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>

                            <div className="pt-2 border-t border-border-subtle text-[11px] text-text-muted truncate">
                              {st.region}
                            </div>
                          </div>
                        </ReflectiveCard>
                      );
                    })}
                  </div>
                )}

                {activeCardTotal > CARDS_PAGE_SIZE && (
                  <div className="flex justify-center pt-2">
                    <Pagination
                      current={cardPage}
                      pageSize={CARDS_PAGE_SIZE}
                      total={activeCardTotal}
                      showSizeChanger={false}
                      onChange={(page) => setCardPage(page)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl glass-panel border border-border-light shadow-xl">
            <div className="w-full overflow-x-auto scrollbar-thin">
              {viewTab === 'districts' && (
                <Table<RainfallDistrictRecord>
                  columns={districtColumns}
                  dataSource={filteredDistricts}
                  rowKey="district_id"
                  pagination={{ pageSize: 15, showSizeChanger: false }}
                  className="reservoirs-table"
                  locale={{ emptyText: r.noDataText }}
                  onRow={(rec) => ({
                    onClick: () => {
                      setSelectedDistrictFilter({
                        id: String(rec.district_id),
                        name: isTamil && rec.name_ta ? rec.name_ta : rec.name_en,
                      });
                      setViewTab('stations');
                    },
                    className: 'hover:bg-surface/50 transition-colors cursor-pointer',
                  })}
                />
              )}

              {viewTab === 'taluks' && (
                <Table<TalukAggregateRow>
                  columns={talukColumns}
                  dataSource={filteredTaluks}
                  rowKey="key"
                  pagination={{ pageSize: 15, showSizeChanger: false }}
                  className="reservoirs-table"
                  locale={{ emptyText: r.noDataText }}
                />
              )}

              {viewTab === 'stations' && (
                <Table<RainfallStationRecord>
                  columns={stationColumns}
                  dataSource={filteredStations}
                  rowKey={(rec, idx) => `${rec.district_id}-${rec.sl_no}-${rec.station}-${idx}`}
                  pagination={{ pageSize: 15, showSizeChanger: false }}
                  className="reservoirs-table"
                  locale={{ emptyText: r.noDataText }}
                />
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-5 py-3.5 border-t border-border-light bg-surface/40 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CloudRain size={13} className="text-cyan-500" />
                {r.sourceNote}
              </span>
              {data?.report_date && (
                <span className="font-semibold text-text-secondary">
                  {r.reportDateLabel} {data.report_date}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
