'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Select, Table, Pagination, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { motion } from 'motion/react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ShinyText } from '@/components/reactbits/ShinyText';
import { AnimatedCounter } from '@/components/reactbits/AnimatedCounter';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import ReflectiveCard from '@/components/reactbits/ReflectiveCard';
import {
  ShieldCheck,
  Sprout,
  Search,
  X,
  LayoutGrid,
  TableList,
  Eye,
  AlertTriangle,
  FileText,
} from '@/components/icons/FlaticonIcons';
import type {
  CropHealthApiResponse,
  CropHealthRecord,
} from '@/app/api/crop-health/route';

const CARDS_PAGE_SIZE = 24;

export default function CropHealthPage() {
  const { messages, locale } = useLanguage();
  const isTamil = locale === 'ta';
  const c = (messages as any).cropHealthPage;

  const [activeTab, setActiveTab] = useState<'disease' | 'pest'>('disease');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedCrop, setSelectedCrop] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cardPage, setCardPage] = useState<number>(1);
  const [activeRecord, setActiveRecord] = useState<CropHealthRecord | null>(null);

  const [dataMap, setDataMap] = useState<Partial<Record<'disease' | 'pest', CropHealthApiResponse>>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTab = useCallback(async (type: 'disease' | 'pest') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/crop-health?type=${type}`);
      if (!res.ok) throw new Error(`Failed to load ${type} advisories (${res.status})`);
      const json: CropHealthApiResponse = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to parse crop health data.');
      setDataMap((prev) => ({ ...prev, [type]: json }));
    } catch (err: any) {
      console.error('[CropHealthPage] fetch error:', err);
      setError(err?.message || 'Unable to load crop health advisories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dataMap[activeTab]) {
      fetchTab(activeTab);
    } else {
      setLoading(false);
      setError(null);
    }
  }, [activeTab, dataMap, fetchTab]);

  useEffect(() => {
    setCardPage(1);
  }, [activeTab, selectedCrop, searchQuery]);

  const currentData = dataMap[activeTab];
  const records = useMemo(() => currentData?.records || [], [currentData]);
  const crops = useMemo(() => currentData?.crops || [], [currentData]);

  // Reset selectedCrop if it doesn't exist in the newly switched tab
  useEffect(() => {
    if (selectedCrop !== 'all' && crops.length > 0 && !crops.includes(selectedCrop)) {
      setSelectedCrop('all');
    }
  }, [crops, selectedCrop]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((rec) => {
      const cropMatch = selectedCrop === 'all' || rec.crop === selectedCrop;
      const qMatch =
        !q ||
        rec.crop.toLowerCase().includes(q) ||
        rec.nameEn.toLowerCase().includes(q) ||
        rec.nameTa.toLowerCase().includes(q) ||
        rec.controlMessage.toLowerCase().includes(q);
      return cropMatch && qMatch;
    });
  }, [records, selectedCrop, searchQuery]);

  const pagedRecords = useMemo(() => {
    const start = (cardPage - 1) * CARDS_PAGE_SIZE;
    return filteredRecords.slice(start, start + CARDS_PAGE_SIZE);
  }, [filteredRecords, cardPage]);

  const cropOptions = useMemo(
    () => [
      { value: 'all', label: `${c.allCrops} (${records.length})` },
      ...crops.map((crop) => ({
        value: crop,
        label: `${crop} (${records.filter((r) => r.crop === crop).length})`,
      })),
    ],
    [crops, records, c.allCrops]
  );

  const columns: ColumnsType<CropHealthRecord> = useMemo(
    () => [
      {
        title: c.colSlNo,
        dataIndex: 'slNo',
        key: 'slNo',
        width: '7%',
        align: 'center',
        render: (val: string) => <span className="font-mono text-xs text-text-muted">{val}</span>,
      },
      {
        title: c.colCrop,
        dataIndex: 'crop',
        key: 'crop',
        width: '15%',
        render: (val: string) => (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <Sprout size={12} />
            {val}
          </span>
        ),
      },
      {
        title: activeTab === 'disease' ? c.colDiseaseName : c.colPestName,
        key: 'name',
        width: '24%',
        render: (_, rec) => (
          <div>
            <span className="font-extrabold text-xs sm:text-sm text-text-main block">
              {isTamil && rec.nameTa ? rec.nameTa : rec.nameEn || rec.nameTa}
            </span>
            {rec.nameEn && rec.nameTa && (
              <span className="text-[11px] text-text-muted block">
                {isTamil ? rec.nameEn : rec.nameTa}
              </span>
            )}
          </div>
        ),
      },
      {
        title: c.colControlMessage,
        dataIndex: 'controlMessage',
        key: 'controlMessage',
        width: '44%',
        render: (val: string) => (
          <p className="text-xs text-text-secondary whitespace-pre-line line-clamp-3 leading-relaxed m-0">
            {val}
          </p>
        ),
      },
      {
        title: '',
        key: 'action',
        width: '10%',
        align: 'right',
        render: (_, rec) => (
          <button
            type="button"
            onClick={() => setActiveRecord(rec)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-surface border border-border-light hover:border-emerald-500/50 text-xs font-bold text-text-main transition-colors cursor-pointer"
          >
            <Eye size={13} />
            <span className="hidden sm:inline">{c.viewDetails}</span>
          </button>
        ),
      },
    ],
    [c, activeTab, isTamil]
  );

  const isDisease = activeTab === 'disease';

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Subtle Atmospheric Glow */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-28 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="absolute top-1/3 -right-20 w-[420px] h-[420px] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 fade-in flex flex-col gap-5 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto pb-20">
        {/* Hero Header + Primary Tab Switch */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 shadow-xl border border-border-light"
        >
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                  <ShieldCheck size={13} />
                  {c.bannerTag}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {c.liveBadge}
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-text-main">
                <ShinyText text={c.pageTitle} speed={6} />
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
                {c.pageSubtitle}
              </p>
            </div>

            {/* Two Tabs: Crop Disease Control | Pest Control */}
            <div
              role="tablist"
              aria-label="Crop Health Categories"
              className="inline-flex items-center p-1.5 rounded-2xl glass-surface border border-border-light shadow-sm self-start lg:self-center shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'disease'}
                onClick={() => setActiveTab('disease')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'disease'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-text-secondary hover:text-text-main'
                }`}
              >
                <ShieldCheck size={15} />
                <span>{c.tabDisease}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'pest'}
                onClick={() => setActiveTab('pest')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'pest'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-text-secondary hover:text-text-main'
                }`}
              >
                <AlertTriangle size={15} />
                <span>{c.tabPest}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SpotlightCard className="glass-panel rounded-2xl border border-border-light p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                  {c.totalAdvisories}
                </span>
                <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <FileText size={15} />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-text-main font-mono">
                <AnimatedCounter value={records.length} />
              </div>
              <span className="text-xs text-text-muted mt-1 block">
                {isDisease ? c.tabDisease : c.tabPest}
              </span>
            </SpotlightCard>

            <SpotlightCard className="glass-panel rounded-2xl border border-border-light p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                  {c.cropsCovered}
                </span>
                <span className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
                  <Sprout size={15} />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                <AnimatedCounter value={crops.length} />
              </div>
              <span className="text-xs text-text-muted mt-1 block">Tamil Nadu Crops</span>
            </SpotlightCard>

            <SpotlightCard className="glass-panel rounded-2xl border border-border-light p-5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                  {c.matchingRecords}
                </span>
                <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <ShieldCheck size={15} />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                <AnimatedCounter value={filteredRecords.length} />
              </div>
              <span className="text-xs text-text-muted mt-1 block">
                {selectedCrop === 'all' ? c.allCrops : selectedCrop}
              </span>
            </SpotlightCard>
          </div>
        )}

        {/* Filter Bar: Crop Select + Search + Cards/Table Switch */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="glass-panel p-4 rounded-2xl border border-border-light shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-3"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <Select
              value={selectedCrop}
              onChange={(val) => setSelectedCrop(val)}
              options={cropOptions}
              showSearch
              optionFilterProp="label"
              className="w-full sm:w-64 h-10"
              size="large"
            />

            <div className="relative flex-1 lg:max-w-md">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={c.searchPlaceholder}
                className="w-full h-10 pl-9 pr-9 rounded-xl glass-surface border border-border-light text-xs font-semibold text-text-main placeholder:text-text-muted focus:outline-none focus:border-emerald-500/70 transition-colors"
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

          <div
            role="group"
            aria-label="Crop Health View Mode"
            className="inline-flex items-center p-1 rounded-xl glass-surface border border-border-light shadow-sm self-start lg:self-auto"
          >
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-extrabold'
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
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-text-secondary hover:text-text-main'
              }`}
            >
              <TableList size={13} />
              <span>Table</span>
            </button>
          </div>
        </motion.div>

        {/* Main Data Section */}
        {loading ? (
          <div className="glass-panel rounded-2xl border border-border-light p-6 space-y-4 animate-pulse">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{c.loadingText}</span>
            </div>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 pt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((card) => (
                  <div key={card} className="skeleton-box h-56 rounded-3xl" />
                ))}
              </div>
            ) : (
              [1, 2, 3, 4, 5, 6].map((row) => (
                <div key={row} className="skeleton-box h-12 rounded-xl" />
              ))
            )}
          </div>
        ) : error ? (
          <div className="glass-panel rounded-2xl border border-border-light p-12 text-center space-y-3">
            <span className="text-4xl inline-block">⚠️</span>
            <p className="text-xs text-rose-500 font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => fetchTab(activeTab)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-border-light p-12 text-center space-y-2">
            <Sprout size={28} className="mx-auto text-text-muted" />
            <p className="text-sm font-bold text-text-main">{c.noDataText}</p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {pagedRecords.map((rec) => (
                <ReflectiveCard
                  key={rec.id}
                  onClick={() => setActiveRecord(rec)}
                  tiltStrength={9}
                  radius={24}
                  intro
                >
                  <div className="flex flex-col h-full justify-between gap-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isDisease
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/35'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35'
                        }`}
                      >
                        <Sprout size={12} />
                        <span>{rec.crop}</span>
                      </span>
                      <span className="font-mono text-[11px] font-bold text-text-muted">
                        #{rec.slNo}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-text-main leading-snug line-clamp-2">
                        {isTamil && rec.nameTa ? rec.nameTa : rec.nameEn || rec.nameTa}
                      </h3>
                      {rec.nameEn && rec.nameTa && (
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          {isTamil ? rec.nameEn : rec.nameTa}
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-4 whitespace-pre-line m-0">
                      {rec.controlMessage}
                    </p>

                    <div className="flex items-center justify-between pt-2.5 border-t border-border-subtle text-xs">
                      <span className="text-[11px] font-semibold text-text-muted">
                        {isDisease ? c.tabDisease : c.tabPest}
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <Eye size={13} />
                        <span>{c.viewDetails}</span>
                      </span>
                    </div>
                  </div>
                </ReflectiveCard>
              ))}
            </div>

            {filteredRecords.length > CARDS_PAGE_SIZE && (
              <div className="flex justify-center pt-2">
                <Pagination
                  current={cardPage}
                  pageSize={CARDS_PAGE_SIZE}
                  total={filteredRecords.length}
                  showSizeChanger={false}
                  onChange={(page) => setCardPage(page)}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl glass-panel border border-border-light shadow-xl">
            <div className="w-full overflow-x-auto scrollbar-thin">
              <Table<CropHealthRecord>
                columns={columns}
                dataSource={filteredRecords}
                rowKey="id"
                pagination={{ pageSize: 15, showSizeChanger: false }}
                className="reservoirs-table"
                locale={{ emptyText: c.noDataText }}
                onRow={(rec) => ({
                  onClick: () => setActiveRecord(rec),
                  className: 'hover:bg-surface/50 transition-colors cursor-pointer',
                })}
              />
            </div>

            <div className="flex items-center justify-between px-5 py-3.5 border-t border-border-light bg-surface/40 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-500" />
                {c.sourceNote}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Full Advisory Detail Modal */}
      <Modal
        open={Boolean(activeRecord)}
        onCancel={() => setActiveRecord(null)}
        footer={null}
        width={680}
        title={
          activeRecord ? (
            <div className="flex flex-wrap items-center gap-2 pr-6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                <Sprout size={12} />
                {activeRecord.crop}
              </span>
              <span className="text-base font-extrabold text-text-main">
                {activeRecord.nameEn || activeRecord.nameTa}
              </span>
            </div>
          ) : null
        }
      >
        {activeRecord && (
          <div className="space-y-4 pt-2">
            {activeRecord.nameTa && (
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {activeRecord.nameTa}
              </div>
            )}
            <div className="p-4 rounded-2xl glass-surface border border-border-light">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted mb-2">
                {c.colControlMessage}
              </div>
              <p className="text-sm text-text-main whitespace-pre-line leading-relaxed m-0">
                {activeRecord.controlMessage}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

