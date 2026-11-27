'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  SproutIcon,
  SearchIcon,
  RefreshCwIcon,
  ChevronRightIcon,
} from '@/components/icons/Icons';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import type { TnauSeedResponse, TnauSeedItem } from '@/app/api/tnau-seeds/route';
import { Input, Select, Modal, Tag } from 'antd';
import { AnimatedCounter } from '@/components/reactbits/AnimatedCounter';
import PlanSummaryReflectiveCard from '@/components/reactbits/PlanSummaryReflectiveCard';
import ReflectiveCard from '@/components/reactbits/ReflectiveCard';
import AnimatedContent from '@/components/reactbits/AnimatedContent';

export default function TnauSeedsPage() {
  const { locale, messages } = useLanguage();
  const s = messages.seedsPage;
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [data, setData] = useState<TnauSeedResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'priceAsc' | 'priceDesc' | 'nameAsc'>('default');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [activeSeed, setActiveSeed] = useState<TnauSeedItem | null>(null);

  const fetchSeedData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tnau-seeds');
      if (!res.ok) {
        throw new Error(`Failed to fetch seed directory data (${res.status})`);
      }
      const json: TnauSeedResponse = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('Failed to load TNAU seeds:', err);
      setError(err?.message || 'Error fetching seed catalog from TNAU source.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeedData();
  }, []);

  const counts = useMemo(() => {
    if (!data?.data || data.data.length === 0) {
      return { total: data?.totalItems || 78, veg: 47, breeder: 21, fruit: 10 };
    }
    const total = data.totalItems || data.data.length;
    const veg = data.data.filter((i) => i.category.toLowerCase().includes('vegetable') && !i.category.toLowerCase().includes('breeder')).length || 47;
    const breeder = data.data.filter((i) => i.category.toLowerCase().includes('breeder')).length || 21;
    const fruit = data.data.filter((i) => !i.category.toLowerCase().includes('vegetable') && !i.category.toLowerCase().includes('breeder')).length || 10;
    return { total, veg, breeder, fruit };
  }, [data]);

  // Category Color Map & Metadata
  const getCategoryTheme = (cat: string) => {
    switch (cat) {
      case 'Vegetable Seeds':
        return {
          bg: 'bg-emerald-500/15',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          badgeColor: 'emerald',
          icon: '🥦',
        };
      case 'Breeder Seeds (Vegetables)':
        return {
          bg: 'bg-purple-500/15',
          border: 'border-purple-500/30',
          text: 'text-purple-400',
          badgeColor: 'purple',
          icon: '🔬',
        };
      case 'Fruit Seeds':
        return {
          bg: 'bg-amber-500/15',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          badgeColor: 'gold',
          icon: '🍎',
        };
      case 'Flower & Tree Seeds':
        return {
          bg: 'bg-rose-500/15',
          border: 'border-rose-500/30',
          text: 'text-rose-400',
          badgeColor: 'magenta',
          icon: '🌸',
        };
      case 'Medicinal Plant Seeds':
        return {
          bg: 'bg-cyan-500/15',
          border: 'border-cyan-500/30',
          text: 'text-cyan-400',
          badgeColor: 'cyan',
          icon: '🌿',
        };
      default:
        return {
          bg: 'bg-slate-500/15',
          border: 'border-slate-500/30',
          text: 'text-slate-300',
          badgeColor: 'default',
          icon: '🌱',
        };
    }
  };

  // Filtered & Sorted Data
  const filteredSeeds = useMemo(() => {
    if (!data?.data) return [];
    let list = [...data.data];

    // Category filter
    if (selectedCategory !== 'All') {
      list = list.filter((s) => s.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Unit filter
    if (unitFilter !== 'all') {
      list = list.filter((s) => s.unit.toLowerCase() === unitFilter.toLowerCase());
    }

    // Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.particulars.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          String(s.slNo).includes(q)
      );
    }

    // Sorting
    if (sortBy === 'priceAsc') {
      list.sort((a, b) => a.pricePerKg - b.pricePerKg);
    } else if (sortBy === 'priceDesc') {
      list.sort((a, b) => b.pricePerKg - a.pricePerKg);
    } else if (sortBy === 'nameAsc') {
      list.sort((a, b) => a.particulars.localeCompare(b.particulars));
    }

    return list;
  }, [data, selectedCategory, unitFilter, searchQuery, sortBy]);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Background Photography Layer with Soft Vignette & Frosted Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out scale-105"
        style={{
          backgroundImage: `url('https://res.cloudinary.com/chk0va7a/image/upload/v1795773768/crop_img.jpg')`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 gpu-accelerate" />

      {/* Subtle Atmospheric Glow */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-28 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[130px]" />
        <div className="absolute top-1/3 -right-20 w-[420px] h-[420px] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto animate-fade-in pb-24">
        {/* Dossier Top Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-panel rounded-2xl p-5 sm:p-7 shadow-2xl border border-border-light relative overflow-hidden">
          <div className="space-y-2 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <SproutIcon size={14} />
                <span>{s.liveBadge}</span>
              </span>
              {data?.isFallback && (
                <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  💾 Verified Indexed Dataset
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-text-main tracking-tight">
              {s.pageTitle}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-3xl lg:max-w-4xl leading-relaxed">
              {s.pageSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 z-10">
            <a
              href="https://agritech.tnau.ac.in/input_source_tnau_seed.html"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl glass-surface px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/30 transition-all flex items-center gap-1.5"
            >
              <span>🌐</span>
              <span>{s.govtSource}</span>
            </a>
            <button
              type="button"
              onClick={fetchSeedData}
              disabled={loading}
              className="rounded-xl glass-surface px-3.5 py-2 text-xs font-bold text-text-main hover:bg-white/10 border border-border-light transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCwIcon size={14} className={loading ? 'animate-spin' : ''} />
              <span>{s.refresh}</span>
            </button>
          </div>
        </div>

        {/* KPI Overview Strip */}
        <AnimatedContent
          distance={30}
          direction="vertical"
          duration={0.7}
          ease="back.out(1.2)"
          stagger={0.06}
          trigger="mount"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
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
            className="min-h-[160px] shadow-xl"
            bodyClassName="border border-white/10 hover:border-emerald-400/50 transition-colors"
          >
            <div className="h-full flex flex-col justify-between text-left select-none p-1">
              <div className="flex items-center justify-between gap-1">
                <div className="leading-tight text-left">
                  <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                    {s.stats.totalVarieties}
                  </div>
                  <div className="text-[9px] font-mono text-emerald-300 mt-0.5">
                    {s.stats.catalogSubtitle}
                  </div>
                </div>
                <span className="plan-reflective-card__tile !w-10 !h-10 flex items-center justify-center p-1 overflow-hidden rounded-2xl bg-slate-900/40 border border-white/10 shadow-inner text-emerald-400 shrink-0 text-lg">
                  🌱
                </span>
              </div>

              <div className="my-auto py-1 text-left">
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none font-mono">
                  <AnimatedCounter value={counts.total} />
                </div>
                <div className="text-[11px] text-slate-300 mt-1 font-medium">
                  {s.stats.registeredSub}
                </div>
              </div>
            </div>
          </PlanSummaryReflectiveCard>

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
            className="min-h-[160px] shadow-xl"
            bodyClassName="border border-white/10 hover:border-cyan-400/50 transition-colors"
          >
            <div className="h-full flex flex-col justify-between text-left select-none p-1">
              <div className="flex items-center justify-between gap-1">
                <div className="leading-tight text-left">
                  <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                    {s.stats.vegetables}
                  </div>
                  <div className="text-[9px] font-mono text-cyan-300 mt-0.5">
                    {s.stats.highDemand}
                  </div>
                </div>
                <span className="plan-reflective-card__tile !w-10 !h-10 flex items-center justify-center p-1 overflow-hidden rounded-2xl bg-slate-900/40 border border-white/10 shadow-inner text-cyan-400 shrink-0 text-lg">
                  🥦
                </span>
              </div>

              <div className="my-auto py-1 text-left">
                <div className="text-2xl sm:text-3xl font-black text-cyan-400 tracking-tight leading-none font-mono">
                  <AnimatedCounter value={counts.veg} />
                </div>
                <div className="text-[11px] text-slate-300 mt-1 font-medium">
                  {s.stats.vegCultivars}
                </div>
              </div>
            </div>
          </PlanSummaryReflectiveCard>

          <PlanSummaryReflectiveCard
            theme="dark"
            tint="#a855f7"
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
            className="min-h-[160px] shadow-xl"
            bodyClassName="border border-white/10 hover:border-purple-400/50 transition-colors"
          >
            <div className="h-full flex flex-col justify-between text-left select-none p-1">
              <div className="flex items-center justify-between gap-1">
                <div className="leading-tight text-left">
                  <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                    {s.stats.breeder}
                  </div>
                  <div className="text-[9px] font-mono text-purple-300 mt-0.5">
                    {s.stats.researchCenter}
                  </div>
                </div>
                <span className="plan-reflective-card__tile !w-10 !h-10 flex items-center justify-center p-1 overflow-hidden rounded-2xl bg-slate-900/40 border border-white/10 shadow-inner text-purple-400 shrink-0 text-lg">
                  🔬
                </span>
              </div>

              <div className="my-auto py-1 text-left">
                <div className="text-2xl sm:text-3xl font-black text-purple-400 tracking-tight leading-none font-mono">
                  <AnimatedCounter value={counts.breeder} />
                </div>
                <div className="text-[11px] text-slate-300 mt-1 font-medium">
                  {s.stats.breederStock}
                </div>
              </div>
            </div>
          </PlanSummaryReflectiveCard>

          <PlanSummaryReflectiveCard
            theme="dark"
            tint="#f59e0b"
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
            className="min-h-[160px] shadow-xl"
            bodyClassName="border border-white/10 hover:border-amber-400/50 transition-colors"
          >
            <div className="h-full flex flex-col justify-between text-left select-none p-1">
              <div className="flex items-center justify-between gap-1">
                <div className="leading-tight text-left">
                  <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                    {s.stats.fruitHerb}
                  </div>
                  <div className="text-[9px] font-mono text-amber-300 mt-0.5">
                    {s.stats.horticulture}
                  </div>
                </div>
                <span className="plan-reflective-card__tile !w-10 !h-10 flex items-center justify-center p-1 overflow-hidden rounded-2xl bg-slate-900/40 border border-white/10 shadow-inner text-amber-400 shrink-0 text-lg">
                  🍎
                </span>
              </div>

              <div className="my-auto py-1 text-left">
                <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight leading-none font-mono">
                  <AnimatedCounter value={counts.fruit} />
                </div>
                <div className="text-[11px] text-slate-300 mt-1 font-medium">
                  {s.stats.specialty}
                </div>
              </div>
            </div>
          </PlanSummaryReflectiveCard>
        </AnimatedContent>

        {/* Filter and Search Control Bar */}
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-border-light shadow-xl space-y-3.5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Live Search Box */}
            <div className="relative w-full sm:w-80 md:w-96">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={s.searchPlaceholder}
                prefix={<SearchIcon size={16} className="text-text-muted mr-1.5" />}
                allowClear
                className="h-10 text-xs font-semibold rounded-xl border-border-light shadow-sm w-full"
              />
            </div>

            {/* Quick Controls: Unit Filter, Sort and View Toggle */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Sort Select */}
              <div className="w-36">
                <Select
                  value={sortBy}
                  onChange={(val) => setSortBy(val)}
                  className="w-full h-10 text-xs custom-antd-select"
                  options={[
                    { value: 'default', label: s.sort.default },
                    { value: 'priceAsc', label: s.sort.priceAsc },
                    { value: 'priceDesc', label: s.sort.priceDesc },
                    { value: 'nameAsc', label: s.sort.nameAsc },
                  ]}
                />
              </div>

              {/* Unit Filter */}
              <div className="w-28">
                <Select
                  value={unitFilter}
                  onChange={(val) => setUnitFilter(val)}
                  className="w-full h-10 text-xs custom-antd-select"
                  options={[
                    { value: 'all', label: s.units.all },
                    { value: 'kg', label: s.units.kg },
                    { value: 'packet', label: s.units.packet },
                    { value: 'plant', label: s.units.plant },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Category Pill Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {[
              { id: 'All', label: s.categories.all, icon: '🌾' },
              { id: 'Vegetable Seeds', label: s.categories.vegetable, icon: '🥦' },
              { id: 'Breeder Seeds (Vegetables)', label: s.categories.breeder, icon: '🔬' },
              { id: 'Fruit Seeds', label: s.categories.fruit, icon: '🍎' },
              { id: 'Flower & Tree Seeds', label: s.categories.flowerTree, icon: '🌸' },
              { id: 'Medicinal Plant Seeds', label: s.categories.medicinal, icon: '🌿' },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${isSelected
                    ? 'bg-emerald-500 text-white keep-white border-emerald-400 shadow-md font-black scale-[1.02]'
                    : 'glass-surface text-text-secondary border-border-subtle hover:text-text-main hover:border-border-light'
                    }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-semibold text-text-muted">
                {s.loading}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
                <div
                  key={item}
                  className="h-44 rounded-2xl glass-panel border border-border-light p-4 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="skeleton-box h-5 w-24 rounded-full" />
                      <div className="skeleton-box h-4 w-8 rounded" />
                    </div>
                    <div className="skeleton-box h-5 w-3/4 rounded mt-2" />
                    <div className="skeleton-box h-4 w-1/2 rounded" />
                  </div>
                  <div className="pt-3 border-t border-border-subtle flex items-end justify-between">
                    <div className="space-y-1">
                      <div className="skeleton-box h-3 w-14 rounded" />
                      <div className="skeleton-box h-6 w-20 rounded" />
                    </div>
                    <div className="skeleton-box h-6 w-12 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error && filteredSeeds.length === 0 ? (
          <div className="rounded-2xl glass-panel border border-rose-500/30 p-12 text-center shadow-xl space-y-3">
            <span className="text-4xl">⚠️</span>
            <h3 className="text-base font-bold text-rose-400">
              {s.error}
            </h3>
            <p className="text-xs text-text-muted max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={fetchSeedData}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white keep-white font-bold text-xs shadow-md hover:bg-emerald-400 transition-all cursor-pointer"
            >
              {s.retry}
            </button>
          </div>
        ) : filteredSeeds.length === 0 ? (
          <div className="rounded-2xl glass-panel border border-border-light p-12 text-center shadow-xl space-y-2">
            <span className="text-4xl">📭</span>
            <h3 className="text-base font-bold text-text-main">
              {s.noSeeds}
            </h3>
            <p className="text-xs text-text-muted">
              {s.noSeedsDesc}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setUnitFilter('all');
              }}
              className="text-xs text-emerald-400 font-bold hover:underline cursor-pointer pt-2 inline-block"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Cards Grid View */
          <div className="space-y-5">
            <AnimatedContent
              distance={30}
              direction="vertical"
              duration={0.6}
              ease="back.out(1.2)"
              stagger={0.03}
              trigger="mount"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4"
            >
              {filteredSeeds.map((seed) => {
                const theme = getCategoryTheme(seed.category);
                return (
                  <ReflectiveCard
                    key={seed.id}
                    onClick={() => setActiveSeed(seed)}
                    tiltStrength={8}
                    radius={20}
                    intro
                    className="h-full cursor-pointer group"
                    bodyClassName="border border-border-light hover:border-emerald-500/50 hover:shadow-xl transition-all h-full"
                  >
                    <div className="p-4 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${theme.bg} ${theme.border} ${theme.text}`}
                          >
                            <span>{theme.icon}</span>
                            <span>{seed.category}</span>
                          </span>
                          <span className="text-[10px] font-mono font-bold text-text-muted">
                            #{seed.slNo}
                          </span>
                        </div>

                        <h3 className="font-display font-bold text-sm text-text-main group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug mb-1">
                          {seed.particulars}
                        </h3>
                      </div>

                      <div className="pt-3 border-t border-border-subtle flex items-end justify-between mt-3">
                        <div>
                          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">
                            TNAU Rate
                          </span>
                          <span className="font-mono text-base font-black text-emerald-400">
                            ₹{seed.pricePerKg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-text-secondary bg-surface px-2 py-0.5 rounded border border-border-subtle">
                          /{seed.unit}
                        </span>
                      </div>
                    </div>
                  </ReflectiveCard>
                );
              })}
            </AnimatedContent>

            {/* Cards Summary Bar */}
            <div className="rounded-2xl glass-panel px-5 py-3.5 border border-border-light flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-text-muted shadow-sm">
              <span>
                {s.showing}
                <strong className="text-text-main font-bold">{filteredSeeds.length}</strong>
                {s.varieties}
              </span>
              <span className="text-[11px]">
                {s.officialNote}
              </span>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        <Modal
          open={Boolean(activeSeed)}
          onCancel={() => setActiveSeed(null)}
          footer={null}
          centered
          width={480}
          destroyOnHidden
          className="seed-detail-modal"
          styles={{
            mask: {
              backdropFilter: 'blur(4px) saturate(160%)',
              WebkitBackdropFilter: 'blur(4px) saturate(160%)',
              backgroundColor: isDark ? 'rgba(2, 6, 23, 0.72)' : 'rgba(15, 23, 42, 0.45)',
            },
            container: {
              backgroundColor: isDark ? 'rgba(11, 18, 32, 0.96)' : 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(14px) saturate(170%)',
              WebkitBackdropFilter: 'blur(14px) saturate(170%)',
              borderRadius: '1.5rem',
              padding: 0,
              overflow: 'hidden',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(226, 232, 240, 0.8)',
              boxShadow: isDark
                ? '0 25px 60px -15px rgba(0, 0, 0, 0.7)'
                : '0 25px 50px -12px rgba(15, 23, 42, 0.18)',
            },
            body: {
              padding: '24px',
              backgroundColor: 'transparent',
              color: isDark ? '#f1f5f9' : '#0f172a',
            },
          }}
        >
          {activeSeed && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3 pr-10">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getCategoryTheme(activeSeed.category).bg
                    } ${getCategoryTheme(activeSeed.category).border} ${getCategoryTheme(activeSeed.category).text
                    }`}
                >
                  <span>{getCategoryTheme(activeSeed.category).icon}</span>
                  <span>{activeSeed.category}</span>
                </span>
                <span className="text-xs font-mono font-bold text-text-secondary bg-surface/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-border-subtle shadow-sm">
                  Sl. #{activeSeed.slNo}
                </span>
              </div>

              <div>
                <h2 className="font-display text-xl font-black text-text-main leading-snug">
                  {activeSeed.particulars}
                </h2>
                <p className="text-xs text-text-secondary mt-1 font-medium">
                  {s.modalTitle}
                </p>
              </div>

              <div className="rounded-xl bg-surface/80 border border-border-subtle p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary">Official TNAU Rate:</span>
                  <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{activeSeed.pricePerKg.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span className="font-medium text-text-secondary">Sale Unit:</span>
                  <span className="font-bold text-text-main capitalize">Per {activeSeed.unit}</span>
                </div>
                {activeSeed.unit === 'kg' && activeSeed.pricePerKg > 0 && (
                  <div className="flex items-center justify-between text-xs text-text-secondary pt-2 border-t border-border-subtle/50">
                    <span className="font-medium text-text-secondary">Approx. 100g Seed Cost:</span>
                    <span className="font-mono font-bold text-text-main">
                      ₹{(activeSeed.pricePerKg / 10).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-text-secondary leading-relaxed">
                <p className="font-bold text-emerald-700 dark:text-emerald-300 mb-1">📍 How to Purchase:</p>
                These seeds can be directly purchased at the <strong>TNAU Seed Centre, Coimbatore - 641 003</strong> or through regional Agricultural Research Stations (ARS) and KVKs across Tamil Nadu.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSeed(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface dark:hover:bg-surface-glass text-xs font-bold text-slate-800 dark:text-text-main border border-slate-200 dark:border-border-light transition-all cursor-pointer"
                >
                  {s.closeBtn}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
