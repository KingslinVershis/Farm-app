'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  WavesIcon,
} from '@/components/icons/Icons';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import type { ReservoirsResponse, ReservoirRecord } from '@/app/api/reservoirs/route';
import { DatePicker, Select, Modal, Table, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { AnimatedCounter } from '@/components/reactbits/AnimatedCounter';
import { ShinyText } from '@/components/reactbits/ShinyText';

export default function ReservoirsPage() {
  const { messages } = useLanguage();
  const m = messages.reservoirsPage;
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Format today's date as YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [data, setData] = useState<ReservoirsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReservoirId, setSelectedReservoirId] = useState<string>('all');
  const [reservoirSearchText, setReservoirSearchText] = useState<string>('');
  const [reservoirSearching, setReservoirSearching] = useState<boolean>(false);
  const [activeReservoir, setActiveReservoir] = useState<ReservoirRecord | null>(null);
  const [chartTab, setChartTab] = useState<'storage' | 'levels' | 'flows' | 'overview'>('storage');

  const fetchReservoirData = async (date?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = date ? `/api/reservoirs?date=${date}` : '/api/reservoirs';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch reservoir data (${res.status})`);
      }
      const json: ReservoirsResponse = await res.json();
      setData(json);
      if (json.date) {
        const parts = json.date.split(/[-/]/);
        if (parts.length === 3 && parts[0].length === 2) {
          const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
          setSelectedDate(formatted);
        }
      }
    } catch (err: any) {
      console.error('Failed to load reservoir data:', err);
      setError(err?.message || 'Error fetching data from remote source.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservoirData();
  }, []);

  // Reservoir options for Ant Design Select
  const reservoirOptions = useMemo(() => {
    const defaultOpt = {
      value: 'all',
      label: m.allReservoirs,
      sublabel: `${data?.reservoirs?.length || 0} ${m.majorDamsGrid}`,
      searchStr: 'all reservoirs அனைத்து அணைகளும்',
    };
    if (!data?.reservoirs || data.reservoirs.length === 0) return [defaultOpt];

    const damOpts = data.reservoirs.map((r) => ({
      value: r.id,
      label: r.name,
      sublabel: [r.basin, r.district].filter(Boolean).join(' • '),
      searchStr: `${r.name} ${r.rawName} ${r.basin || ''} ${r.district || ''}`.toLowerCase(),
    }));

    return [defaultOpt, ...damOpts];
  }, [data, m]);

  // Filter reservoirs based on selected reservoir
  const filteredReservoirs = useMemo(() => {
    if (!data?.reservoirs) return [];
    if (selectedReservoirId === 'all') {
      return data.reservoirs;
    }
    return data.reservoirs.filter((r) => r.id === selectedReservoirId);
  }, [data, selectedReservoirId]);

  // Ant Design Table Columns Specification - Proportional 100% fit, NO horizontal scroll
  const columns: ColumnsType<ReservoirRecord> = useMemo(() => [
    {
      title: m.colReservoir,
      dataIndex: 'name',
      key: 'name',
      width: '18%',
      render: (_, res) => (
        <div className="pr-1">
          <span className="font-extrabold text-xs sm:text-sm text-text-main hover:text-cyan-400 transition-colors block truncate">
            {res.rawName || res.name}
          </span>
          {(res.basin || res.district) && (
            <span className="text-[10px] text-text-muted font-medium block truncate">
              {[res.basin, res.district].filter(Boolean).join(' • ')}
            </span>
          )}
        </div>
      ),
    },
    {
      title: m.colFullDepth,
      dataIndex: 'fullDepthFeet',
      key: 'fullDepthFeet',
      align: 'right',
      width: '7%',
      render: (val: number) => <span className="font-mono text-xs text-text-secondary whitespace-nowrap">{val > 0 ? val : '-'}</span>,
    },
    {
      title: m.colFullCapacity,
      dataIndex: 'fullCapacityMcft',
      key: 'fullCapacityMcft',
      align: 'right',
      width: '9%',
      render: (val: number) => (
        <span className="font-mono text-xs font-bold text-text-secondary whitespace-nowrap">
          {val > 0 ? val.toLocaleString() : '-'}
        </span>
      ),
    },
    {
      title: m.colCurrentLevel,
      dataIndex: 'currentLevelFeet',
      key: 'currentLevelFeet',
      align: 'right',
      width: '8%',
      render: (val: number) => (
        <span className="font-mono text-xs font-semibold text-text-main whitespace-nowrap">
          {val > 0 ? val : '-'}
        </span>
      ),
    },
    {
      title: m.colCurrentStorage,
      dataIndex: 'currentStorageMcft',
      key: 'currentStorageMcft',
      align: 'right',
      width: '17%',
      render: (val: number, res) => {
        const percent = res.fullCapacityMcft > 0
          ? Math.min(100, Math.max(0, Math.round((val / res.fullCapacityMcft) * 100)))
          : 0;
        return (
          <div className="flex flex-col items-end gap-1 w-full max-w-[170px] ml-auto">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-bold text-text-muted font-mono">{percent}%</span>
              <span className="font-mono font-black text-cyan-400 text-xs sm:text-sm whitespace-nowrap">
                {val.toLocaleString()}
              </span>
            </div>
            <div className="w-full">
              <Progress
                percent={percent}
                status="active"
                showInfo={false}
                strokeColor={{ from: '#108ee9', to: '#87d068' }}
                size="small"
              />
            </div>
          </div>
        );
      },
    },
    {
      title: m.colCurrentInflow,
      dataIndex: 'currentInflowCusecs',
      key: 'currentInflowCusecs',
      align: 'right',
      width: '8%',
      render: (val: number) => (
        <span className="font-mono text-xs font-bold text-emerald-400 whitespace-nowrap">
          {val.toLocaleString()}
        </span>
      ),
    },
    {
      title: m.colCurrentOutflow,
      dataIndex: 'currentOutflowCusecs',
      key: 'currentOutflowCusecs',
      align: 'right',
      width: '8%',
      render: (val: number) => (
        <span className="font-mono text-xs font-bold text-amber-400 whitespace-nowrap">
          {val.toLocaleString()}
        </span>
      ),
    },
    {
      title: m.colLastYearLevel,
      dataIndex: 'lastYearLevelFeet',
      key: 'lastYearLevelFeet',
      align: 'right',
      width: '8%',
      render: (val: number) => (
        <span className="font-mono text-xs text-text-muted whitespace-nowrap">
          {val > 0 ? val : '-'}
        </span>
      ),
    },
    {
      title: m.colLastYearStorage,
      dataIndex: 'lastYearStorageMcft',
      key: 'lastYearStorageMcft',
      align: 'right',
      width: '9%',
      render: (val: number) => (
        <span className="font-mono text-xs text-text-muted whitespace-nowrap">
          {val > 0 ? val.toLocaleString() : '-'}
        </span>
      ),
    },
    {
      title: m.colAction,
      key: 'action',
      align: 'center',
      width: '8%',
      render: (_, res) => (
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveReservoir(res);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 border border-cyan-500/30 hover:border-cyan-400 transition-all cursor-pointer shadow-sm group whitespace-nowrap"
          title={m.viewDetails}
        >
          <span className="text-xs group-hover:scale-110 transition-transform">👁️</span>
          <span>{m.viewButton}</span>
        </motion.button>
      ),
    },
  ], [m]);

  // Chart Data preparation for Active Reservoir
  const storageChartData = useMemo(() => {
    if (!activeReservoir) return [];
    return [
      {
        metric: m.chartCapacity,
        value: activeReservoir.fullCapacityMcft,
        fill: '#3b82f6',
      },
      {
        metric: m.chartCurrentStorage,
        value: activeReservoir.currentStorageMcft,
        fill: '#06b6d4',
      },
      {
        metric: m.chartLastYearStorage,
        value: activeReservoir.lastYearStorageMcft,
        fill: '#f59e0b',
      },
    ];
  }, [activeReservoir, m]);

  const levelsChartData = useMemo(() => {
    if (!activeReservoir) return [];
    return [
      {
        metric: m.chartFullDepth,
        value: activeReservoir.fullDepthFeet,
        fill: '#3b82f6',
      },
      {
        metric: m.chartCurrentLevel,
        value: activeReservoir.currentLevelFeet,
        fill: '#10b981',
      },
      {
        metric: m.chartLastYearLevel,
        value: activeReservoir.lastYearLevelFeet,
        fill: '#94a3b8',
      },
    ];
  }, [activeReservoir, m]);

  const flowsChartData = useMemo(() => {
    if (!activeReservoir) return [];
    return [
      {
        metric: m.chartInflow,
        value: activeReservoir.currentInflowCusecs,
        fill: '#10b981',
      },
      {
        metric: m.chartOutflow,
        value: activeReservoir.currentOutflowCusecs,
        fill: '#f43f5e',
      },
    ];
  }, [activeReservoir, m]);

  const storageFillPct = useMemo(() => {
    if (!activeReservoir || activeReservoir.fullCapacityMcft <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((activeReservoir.currentStorageMcft / activeReservoir.fullCapacityMcft) * 100)));
  }, [activeReservoir]);

  return (
    <div className="relative min-h-screen w-full">
      {/* Background Photography Layer */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out scale-105"
        style={{
          backgroundImage: `url('/images/water_dam.jpeg')`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 gpu-accelerate" />
      <div className="relative z-10 fade-in flex flex-col gap-5 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto">
        {/* Header Banner with Motion Entrance */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-2xl glass-panel p-5 sm:p-7 shadow-xl border border-border-light"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-3 py-0.5 text-xs font-bold text-cyan-400 shadow-sm">
                  <WavesIcon size={13} />
                  {m.bannerTag}
                </span>
                <span className="text-xs text-text-muted">•</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {m.liveTelemetry}
                </span>
                {data?.date && (
                  <>
                    <span className="text-xs text-text-muted hidden sm:inline">•</span>
                    <span className="text-xs font-bold text-text-secondary bg-surface px-2.5 py-0.5 rounded-md border border-border-subtle">
                      {m.dateLabel} {data.date}
                    </span>
                  </>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-text-main">
                <ShinyText text={m.pageTitle} speed={6} />
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
                {m.pageSubtitle}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filter Area: Ant Design DatePicker & Searchable Reservoir Select in a Single Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
          className="glass-panel p-3.5 sm:p-5 rounded-2xl border border-border-light shadow-xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Ant Design DatePicker Component - Generous Width */}
            <div className="relative shrink-0 w-full sm:w-72 md:w-80">
              <DatePicker
                value={selectedDate ? dayjs(selectedDate) : null}
                disabledDate={(current) => current && current > dayjs().endOf('day')}
                format="DD-MM-YYYY"
                allowClear={false}
                onChange={(date) => {
                  if (date) {
                    const formatted = date.format('YYYY-MM-DD');
                    setSelectedDate(formatted);
                    fetchReservoirData(formatted);
                  }
                }}
                className="h-10 text-xs font-semibold rounded-xl w-full shadow-sm custom-antd-picker"
              />
            </div>

            {/* Ant Design Searchable Select Component - Generous Width */}
            <div className="relative shrink-0 w-full sm:w-80 md:w-96">
              <Select
                showSearch
                value={reservoirSearchText ? undefined : selectedReservoirId}
                searchValue={reservoirSearchText}
                onChange={(val) => {
                  setSelectedReservoirId(val);
                  setReservoirSearchText('');
                  setReservoirSearching(false);
                }}
                onSearch={(val) => {
                  setReservoirSearchText(val);
                  setReservoirSearching(val.length > 0);
                }}
                onBlur={() => {
                  setReservoirSearchText('');
                  setReservoirSearching(false);
                }}
                onSelect={(val) => {
                  setSelectedReservoirId(val);
                  setReservoirSearchText('');
                  setReservoirSearching(false);
                }}
                onDropdownVisibleChange={(open) => {
                  if (!open) {
                    setReservoirSearchText('');
                    setReservoirSearching(false);
                  }
                }}
                placeholder={m.reservoirPlaceholder}
                className={`h-10 text-xs font-semibold rounded-xl shadow-sm custom-antd-select w-full ${reservoirSearching ? 'is-searching' : ''}`}
                popupMatchSelectWidth={false}
                dropdownStyle={{ width: '380px', maxWidth: '95vw' }}
                filterOption={(input, option) =>
                  ((option?.searchStr as string) || '').toLowerCase().includes(input.toLowerCase())
                }
                options={reservoirOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                  searchStr: opt.searchStr,
                  sublabel: opt.sublabel,
                }))}
                optionRender={(option) => (
                  <div className="py-1">
                    <div className="font-bold text-xs text-text-main">{option.data.label}</div>
                    {option.data.sublabel && (
                      <div className="text-[10px] text-text-muted mt-0.5">{option.data.sublabel}</div>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Reset Shortcut with Motion Animation */}
            {selectedReservoirId !== 'all' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setSelectedReservoirId('all')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/10 border border-emerald-500/20 shrink-0 self-start sm:self-center"
              >
                ✕ {m.reset}
              </motion.button>
            )}
          </div>

          {/* Total displayed count indicator */}
          <div className="text-xs text-text-muted sm:text-right shrink-0">
            {m.showingReservoirs}{' '}
            <span className="font-bold text-text-main">{filteredReservoirs.length}</span>{' '}
            {m.reservoirsCount}
          </div>
        </motion.div>

        {/* Ant Design Table Section with Motion Entrance */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.16, ease: 'easeOut' }}
          className="overflow-hidden rounded-2xl glass-panel border border-border-light shadow-xl"
        >
          {loading ? (
            <div className="p-6 space-y-4 animate-pulse">
              <div className="flex items-center justify-between pb-3 border-b border-border-light/60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-semibold text-text-muted">{m.fetchingLive}</span>
                </div>
                <div className="skeleton-box h-4 w-32 rounded" />
              </div>
              {[1, 2, 3, 4, 5, 6].map((row) => (
                <div key={row} className="grid grid-cols-6 gap-4 items-center py-2.5">
                  <div className="skeleton-box h-4 w-4/5 rounded" />
                  <div className="skeleton-box h-4 w-2/3 rounded" />
                  <div className="skeleton-box h-3 w-full rounded-full" />
                  <div className="skeleton-box h-4 w-1/2 rounded" />
                  <div className="skeleton-box h-4 w-1/2 rounded" />
                  <div className="skeleton-box h-7 w-16 rounded-lg justify-self-end" />
                </div>
              ))}
            </div>
          ) : error && (!filteredReservoirs || filteredReservoirs.length === 0) ? (
            <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
              <span className="text-4xl">⚠️</span>
              <h3 className="text-base font-bold text-rose-400">
                {m.noDataTitle}
              </h3>
              <p className="text-xs text-text-muted max-w-md">{error}</p>
              <button
                onClick={() => fetchReservoirData()}
                className="mt-2 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs shadow-md cursor-pointer hover:bg-emerald-400 transition-all"
              >
                {m.retryFetch}
              </button>
            </div>
          ) : !loading && filteredReservoirs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
              <span className="text-4xl">📭</span>
              <h3 className="text-base font-bold text-text-main">
                {m.noDataFoundTitle}
              </h3>
              <p className="text-xs text-text-muted max-w-md">
                {m.noDataFoundDesc}
              </p>
            </div>
          ) : (
            <div className="w-full">
              <Table<ReservoirRecord>
                columns={columns}
                dataSource={filteredReservoirs}
                rowKey="id"
                pagination={false}
                className="reservoirs-table"
                onRow={() => ({
                  className: 'hover:bg-surface/50 transition-colors',
                })}
              />
            </div>
          )}

          {/* Table Footer info note */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-5 py-3.5 border-t border-border-light bg-surface/40 text-xs text-text-muted">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span>📡</span>
              <span>{m.dataExtractedNote}</span>
            </div>
            <div className="font-semibold text-text-secondary">
              {m.totalDamsFooter}{' '}
              <span className="font-bold text-text-main">{filteredReservoirs.length}</span>
            </div>
          </div>
        </motion.div>

        {/* Ant Design Modal Component with Recharts + React Bits Animations */}
        <Modal
          open={!!activeReservoir}
          onCancel={() => setActiveReservoir(null)}
          footer={null}
          centered
          width={720}
          destroyOnClose
          styles={{
            mask: {
              backdropFilter: 'blur(2px) saturate(170%)',
              WebkitBackdropFilter: 'blur(2px) saturate(170%)',
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(15, 23, 42, 0.40)',
            },
            body: {
              padding: '16px 20px',
              borderRadius: '1.25rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: isDark ? 'rgba(11, 18, 32, 0.75)' : 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(2px) saturate(170%)',
              WebkitBackdropFilter: 'blur(2px) saturate(170%)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(203, 213, 225, 0.85)',
              boxShadow: isDark
                ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                : '0 20px 40px -12px rgba(15, 23, 42, 0.18)',
            },
          }}
        >
          {activeReservoir && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex flex-col space-y-4"
            >
              {/* Modal Header with React Bits ShinyText */}
              <div className="flex items-start justify-between border-b border-border-subtle pb-3.5 shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {activeReservoir.basin && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                        {activeReservoir.basin}
                      </span>
                    )}
                    {activeReservoir.district && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {activeReservoir.district}
                      </span>
                    )}
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30">
                      {m.storageUtilization}: {storageFillPct}%
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-text-main">
                    <ShinyText text={activeReservoir.rawName || activeReservoir.name} speed={3.5} />
                  </h2>
                  <span className="text-xs text-text-muted">
                    {m.modalTitle}
                  </span>
                </div>
              </div>

              {/* Quick Stats Grid with React Bits SpotlightCard & AnimatedCounter */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <SpotlightCard spotlightColor={isDark ? 'rgba(6, 182, 212, 0.22)' : 'rgba(6, 182, 212, 0.12)'} className="p-3">
                  <span className="text-[10px] font-bold uppercase text-text-muted block">
                    {m.statCurrentLevel}
                  </span>
                  <span className="text-lg font-black text-text-main font-mono">
                    <AnimatedCounter value={activeReservoir.currentLevelFeet} decimals={2} /> ft
                  </span>
                  <span className="text-[10px] text-text-muted block mt-0.5">
                    {m.statFullDepth} {activeReservoir.fullDepthFeet} ft
                  </span>
                </SpotlightCard>

                <SpotlightCard spotlightColor={isDark ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.12)'} className="p-3">
                  <span className="text-[10px] font-bold uppercase text-text-muted block">
                    {m.statCurrentStorage}
                  </span>
                  <span className="text-lg font-black text-cyan-600 dark:text-cyan-400 font-mono">
                    <AnimatedCounter value={activeReservoir.currentStorageMcft} />
                  </span>
                  <span className="text-[10px] text-text-muted block mt-0.5">
                    {m.statFullCapacity} {activeReservoir.fullCapacityMcft.toLocaleString()} M.Cft
                  </span>
                </SpotlightCard>

                <SpotlightCard spotlightColor={isDark ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.12)'} className="p-3">
                  <span className="text-[10px] font-bold uppercase text-text-muted block">
                    {m.statInflow}
                  </span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    <AnimatedCounter value={activeReservoir.currentInflowCusecs} />
                  </span>
                  <span className="text-[10px] text-text-muted block mt-0.5">CuSecs</span>
                </SpotlightCard>

                <SpotlightCard spotlightColor={isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.12)'} className="p-3">
                  <span className="text-[10px] font-bold uppercase text-text-muted block">
                    {m.statOutflow}
                  </span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                    <AnimatedCounter value={activeReservoir.currentOutflowCusecs} />
                  </span>
                  <span className="text-[10px] text-text-muted block mt-0.5">CuSecs</span>
                </SpotlightCard>
              </div>

              {/* Storage Progress Bar */}
              <div className="p-3.5 rounded-xl bg-surface border border-border-subtle flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-text-muted">{m.storageUtilization}</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400">{storageFillPct}% ({activeReservoir.currentStorageMcft.toLocaleString()} / {activeReservoir.fullCapacityMcft.toLocaleString()} M.Cft)</span>
                </div>
                <Progress
                  percent={storageFillPct}
                  status="active"
                  strokeColor={{ from: '#108ee9', to: '#87d068' }}
                />
              </div>

              {/* Interactive Chart Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 dark:bg-surface border border-slate-200 dark:border-border-light">
                <button
                  type="button"
                  onClick={() => setChartTab('storage')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${chartTab === 'storage'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-text-secondary dark:hover:text-text-main hover:bg-slate-200/60 dark:hover:bg-surface-glass'
                    }`}
                >
                  📊 {m.tabStorage}
                </button>
                <button
                  type="button"
                  onClick={() => setChartTab('levels')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${chartTab === 'levels'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-text-secondary dark:hover:text-text-main hover:bg-slate-200/60 dark:hover:bg-surface-glass'
                    }`}
                >
                  📏 {m.tabWaterLevel}
                </button>
                <button
                  type="button"
                  onClick={() => setChartTab('flows')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${chartTab === 'flows'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-text-secondary dark:hover:text-text-main hover:bg-slate-200/60 dark:hover:bg-surface-glass'
                    }`}
                >
                  🌊 {m.tabFlowRate}
                </button>
                <button
                  type="button"
                  onClick={() => setChartTab('overview')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${chartTab === 'overview'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-text-secondary dark:hover:text-text-main hover:bg-slate-200/60 dark:hover:bg-surface-glass'
                    }`}
                >
                  🌐 {m.tabOverview}
                </button>
              </div>

              {/* Animated Recharts Container - cursor={false} eliminates the white/gray hover overlay box! */}
              <motion.div
                key={chartTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="p-4 rounded-xl bg-surface border border-border-subtle"
              >
                {chartTab === 'storage' && (
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted mb-3">
                      {m.chartStorageComparison}
                    </h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={storageChartData} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
                          <defs>
                            <linearGradient id="storageBarGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#0891b2" stopOpacity={0.4} />
                            </linearGradient>
                            <linearGradient id="capBarGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                              <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.3} />
                            </linearGradient>
                            <linearGradient id="lastYearBarGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#d97706" stopOpacity={0.3} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'} />
                          <XAxis
                            dataKey="metric"
                            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 600 }}
                            axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }}
                          />
                          <YAxis
                            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
                            axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }}
                          />
                          <Tooltip
                            cursor={false}
                            contentStyle={{
                              backgroundColor: isDark ? '#0f172a' : '#ffffff',
                              borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
                              borderRadius: '10px',
                              color: isDark ? '#f1f5f9' : '#0f172a',
                              fontSize: '12px',
                              fontWeight: 700,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            }}
                            formatter={(value: any) => [`${Number(value).toLocaleString()} M.Cft`, 'Volume']}
                          />
                          <Bar
                            dataKey="value"
                            radius={[8, 8, 0, 0]}
                            isAnimationActive={true}
                            animationDuration={1000}
                            animationEasing="ease-out"
                          >
                            {storageChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  index === 0
                                    ? 'url(#capBarGrad)'
                                    : index === 1
                                      ? 'url(#storageBarGrad)'
                                      : 'url(#lastYearBarGrad)'
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {chartTab === 'levels' && (
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted mb-3">
                      {m.chartElevationComparison}
                    </h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={levelsChartData} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
                          <defs>
                            <linearGradient id="depthGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.85} />
                              <stop offset="100%" stopColor="#1e40af" stopOpacity={0.3} />
                            </linearGradient>
                            <linearGradient id="levelGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#047857" stopOpacity={0.3} />
                            </linearGradient>
                            <linearGradient id="lastYearLevelGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.85} />
                              <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.3} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'} />
                          <XAxis
                            dataKey="metric"
                            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 600 }}
                            axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }}
                          />
                          <YAxis
                            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
                            axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }}
                          />
                          <Tooltip
                            cursor={false}
                            contentStyle={{
                              backgroundColor: isDark ? '#0f172a' : '#ffffff',
                              borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
                              borderRadius: '10px',
                              color: isDark ? '#f1f5f9' : '#0f172a',
                              fontSize: '12px',
                              fontWeight: 700,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            }}
                            formatter={(value: any) => [`${value} Feet`, 'Water Level']}
                          />
                          <Bar
                            dataKey="value"
                            radius={[8, 8, 0, 0]}
                            isAnimationActive={true}
                            animationDuration={1000}
                            animationEasing="ease-out"
                          >
                            {levelsChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  index === 0
                                    ? 'url(#depthGrad)'
                                    : index === 1
                                      ? 'url(#levelGrad)'
                                      : 'url(#lastYearLevelGrad)'
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {chartTab === 'flows' && (
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted mb-3">
                      {m.chartFlowDynamics}
                    </h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={flowsChartData} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
                          <defs>
                            <linearGradient id="inflowBarGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#059669" stopOpacity={0.3} />
                            </linearGradient>
                            <linearGradient id="outflowBarGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#be123c" stopOpacity={0.3} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'} />
                          <XAxis
                            dataKey="metric"
                            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 600 }}
                            axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }}
                          />
                          <YAxis
                            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
                            axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }}
                          />
                          <Tooltip
                            cursor={false}
                            contentStyle={{
                              backgroundColor: isDark ? '#0f172a' : '#ffffff',
                              borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1',
                              borderRadius: '10px',
                              color: isDark ? '#f1f5f9' : '#0f172a',
                              fontSize: '12px',
                              fontWeight: 700,
                              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            }}
                            formatter={(value: any) => [`${Number(value).toLocaleString()} CuSecs`, 'Discharge Rate']}
                          />
                          <Bar
                            dataKey="value"
                            radius={[8, 8, 0, 0]}
                            isAnimationActive={true}
                            animationDuration={1000}
                            animationEasing="ease-out"
                          >
                            {flowsChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={index === 0 ? 'url(#inflowBarGrad)' : 'url(#outflowBarGrad)'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {chartTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-surface/70 border border-border-light">
                        <span className="text-[11px] font-bold text-cyan-400 block mb-1">
                          💧 {m.tabStorage} (M.Cft)
                        </span>
                        <div className="h-40 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={storageChartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="2 2" stroke={isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'} />
                              <XAxis dataKey="metric" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }} />
                              <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }} />
                              <Tooltip
                                cursor={false}
                                contentStyle={{
                                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                }}
                              />
                              <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-surface/70 border border-border-light">
                        <span className="text-[11px] font-bold text-emerald-400 block mb-1">
                          🌊 {m.tabFlowRate} (CuSecs)
                        </span>
                        <div className="h-40 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={flowsChartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="2 2" stroke={isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'} />
                              <XAxis dataKey="metric" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }} />
                              <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }} />
                              <Tooltip
                                cursor={false}
                                contentStyle={{
                                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                }}
                              />
                              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Last Year Comparative Info */}
              <div className="p-3.5 rounded-xl bg-surface border border-border-light flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-muted block">
                    {m.statLastYearSameDay}
                  </span>
                  <span className="font-bold text-text-main font-mono">
                    {activeReservoir.lastYearLevelFeet} ft ({activeReservoir.lastYearStorageMcft.toLocaleString()} M.Cft)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">
                    {m.statYoYDelta}
                  </span>
                  <span
                    className={`font-black font-mono ${activeReservoir.currentStorageMcft >= activeReservoir.lastYearStorageMcft
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                      }`}
                  >
                    {activeReservoir.currentStorageMcft >= activeReservoir.lastYearStorageMcft ? '+' : ''}
                    <AnimatedCounter
                      value={activeReservoir.currentStorageMcft - activeReservoir.lastYearStorageMcft}
                    />{' '}
                    M.Cft
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReservoir(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface dark:hover:bg-surface-glass font-bold text-xs text-slate-800 dark:text-text-main border border-slate-200 dark:border-border-light transition-colors cursor-pointer"
                >
                  {m.close}
                </button>
              </div>
            </motion.div>
          )}
        </Modal>
      </div>
    </div>
  );
}
