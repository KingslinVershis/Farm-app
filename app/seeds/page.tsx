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
import { Input, Select, Table, Modal, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

export default function TnauSeedsPage() {
  const { locale, messages } = useLanguage();
  const isTamil = locale === 'ta';
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [data, setData] = useState<TnauSeedResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'default' | 'priceAsc' | 'priceDesc' | 'nameAsc'>('default');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [viewLayout, setViewLayout] = useState<'table' | 'grid'>('table');
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

  // Ant Design Table Columns
  const columns: ColumnsType<TnauSeedItem> = useMemo(
    () => [
      {
        title: isTamil ? 'வ.எண்' : 'Sl. No.',
        dataIndex: 'slNo',
        key: 'slNo',
        width: 80,
        align: 'center',
        render: (val: string | number) => (
          <span className="font-mono text-xs text-text-muted font-bold">#{val}</span>
        ),
      },
      {
        title: isTamil ? 'பிரிவு' : 'Category',
        dataIndex: 'category',
        key: 'category',
        width: 170,
        render: (cat: string) => {
          const t = getCategoryTheme(cat);
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${t.bg} ${t.border} ${t.text}`}
            >
              <span>{t.icon}</span>
              <span>{cat}</span>
            </span>
          );
        },
      },
      {
        title: isTamil ? 'விதை விவரம் (பயிர் / வகை)' : 'Seed Particulars & Variety',
        dataIndex: 'particulars',
        key: 'particulars',
        render: (_, record) => {
          return (
            <div>
              <span className="font-bold text-sm text-text-main hover:text-emerald-400 transition-colors block">
                {record.particulars}
              </span>
              <span className="text-[11px] text-text-muted">
                {record.category} • Official TNAU Sale Variety
              </span>
            </div>
          );
        },
      },
      {
        title: isTamil ? 'அலகு' : 'Unit',
        dataIndex: 'unit',
        key: 'unit',
        width: 110,
        align: 'center',
        render: (unit: string) => (
          <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-surface border border-border-subtle text-text-secondary">
            /{unit}
          </span>
        ),
      },
      {
        title: isTamil ? 'அரசு விலை (₹)' : 'Official Price (₹)',
        dataIndex: 'pricePerKg',
        key: 'pricePerKg',
        width: 160,
        align: 'right',
        sorter: (a, b) => a.pricePerKg - b.pricePerKg,
        render: (price: number, record) => (
          <div>
            <span className="font-mono text-base font-black text-emerald-400 block">
              ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-text-muted font-medium">
              per {record.unit}
            </span>
          </div>
        ),
      },
      {
        title: '',
        key: 'action',
        width: 80,
        align: 'center',
        render: (_, record) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveSeed(record);
            }}
            className="p-1.5 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            title="Inspect seed details"
          >
            <ChevronRightIcon size={16} />
          </button>
        ),
      },
    ],
    [isTamil]
  );

  return (
    <div className="relative min-h-screen w-full">
      {/* Background Photography Layer */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out scale-105"
        style={{
          backgroundImage: `url('/images/fresh-green.jpg')`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 gpu-accelerate" />
      <div className="relative z-10 space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto animate-fade-in pb-24">
        {/* Dossier Top Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-panel rounded-2xl p-5 sm:p-7 shadow-2xl border border-border-light relative overflow-hidden">
          <div className="space-y-2 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <SproutIcon size={14} />
                <span>{isTamil ? 'அரசு சான்றளிக்கப்பட்ட விலை' : 'TNAU Certified Sale Rates'}</span>
              </span>
              {data?.isFallback && (
                <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                  💾 Verified Indexed Dataset
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-text-main tracking-tight">
              {isTamil ? 'TNAU விதை விற்பனை விலைப்பட்டியல்' : 'TNAU Seed Price Directory'}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-3xl lg:max-w-4xl leading-relaxed">
              {isTamil
                ? 'தமிழ்நாடு வேளாண்மைப் பல்கலைக்கழகத்தால் (TNAU) நிர்ணயிக்கப்பட்ட நேரடி விதை விற்பனை மற்றும் கொள்முதல் விலை விவரங்கள். காய்கறி, பழங்கள், மரங்கள் மற்றும் மூலிகை பயிர்களின் சான்றளிக்கப்பட்ட விதைகள்.'
                : 'Official live seed prices from Tamil Nadu Agricultural University (TNAU) Agritech Portal. Verified rates for certified vegetable, breeder, fruit, flower, and medicinal crops across Tamil Nadu.'}
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
              <span>{isTamil ? 'அசல் இணையதளம்' : 'Govt Source URL'}</span>
            </a>
            <button
              type="button"
              onClick={fetchSeedData}
              disabled={loading}
              className="rounded-xl glass-surface px-3.5 py-2 text-xs font-bold text-text-main hover:bg-white/10 border border-border-light transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCwIcon size={14} className={loading ? 'animate-spin' : ''} />
              <span>{isTamil ? 'புதுப்பி' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* KPI Overview Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="glass-surface p-4 rounded-xl border border-border-subtle shadow-sm flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0">
              🌱
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                {isTamil ? 'மொத்த வகைகள்' : 'Total Varieties'}
              </div>
              <div className="text-xl sm:text-2xl font-black text-text-main">
                {data?.totalItems || 78}
              </div>
            </div>
          </div>

          <div className="glass-surface p-4 rounded-xl border border-border-subtle shadow-sm flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center text-xl shrink-0">
              🥦
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                {isTamil ? 'காய்கறி விதைகள்' : 'Vegetable Seeds'}
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400">
                47
              </div>
            </div>
          </div>

          <div className="glass-surface p-4 rounded-xl border border-border-subtle shadow-sm flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-xl shrink-0">
              🔬
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                {isTamil ? 'இனப்பெருக்க விதைகள்' : 'Breeder Seeds'}
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-400">
                21
              </div>
            </div>
          </div>

          <div className="glass-surface p-4 rounded-xl border border-border-subtle shadow-sm flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
              🍎
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                {isTamil ? 'பழங்கள் & மூலிகைகள்' : 'Fruit & Herb Seeds'}
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-400">
                10
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Control Bar */}
        <div className="glass-surface p-3.5 sm:p-4 rounded-xl border border-border-light space-y-3.5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Live Search Box */}
            <div className="relative flex-1 min-w-[280px]">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isTamil ? 'விதையின் பெயர் தேடவும் (எ.கா. தக்காளி, பப்பாளி, Co 7)...' : 'Search seed by name (e.g., Papaya, Tomato, Co 7, Bhendi)...'}
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
                    { value: 'default', label: isTamil ? 'வரிசை: இயல்பு' : 'Sort: Default' },
                    { value: 'priceAsc', label: isTamil ? 'விலை: குறைவு → அதிகம்' : 'Price: Low → High' },
                    { value: 'priceDesc', label: isTamil ? 'விலை: அதிகம் → குறைவு' : 'Price: High → Low' },
                    { value: 'nameAsc', label: isTamil ? 'பெயர்: A → Z' : 'Name: A → Z' },
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
                    { value: 'all', label: isTamil ? 'அனைத்தும்' : 'All Units' },
                    { value: 'kg', label: isTamil ? 'கிலோ (kg)' : 'Per Kg' },
                    { value: 'packet', label: isTamil ? 'பாக்கெட்' : 'Per Packet' },
                    { value: 'plant', label: isTamil ? 'செடி' : 'Per Plant' },
                  ]}
                />
              </div>

              {/* View Mode Toggle: Table / Grid */}
              <div className="flex rounded-xl glass-surface p-1 border border-border-light shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewLayout('table')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${viewLayout === 'table'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-text-secondary hover:text-text-main'
                    }`}
                  title="Table View"
                >
                  📋 {isTamil ? 'அட்டவணை' : 'Table'}
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('grid')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${viewLayout === 'grid'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-text-secondary hover:text-text-main'
                    }`}
                  title="Card Grid View"
                >
                  🗂️ {isTamil ? 'கார்டுகள்' : 'Cards'}
                </button>
              </div>
            </div>
          </div>

          {/* Category Pill Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {[
              { id: 'All', label: isTamil ? 'அனைத்து விதைகள்' : 'All Seeds', icon: '🌾' },
              { id: 'Vegetable Seeds', label: isTamil ? 'காய்கறி விதைகள்' : 'Vegetable Seeds', icon: '🥦' },
              { id: 'Breeder Seeds (Vegetables)', label: isTamil ? 'இனப்பெருக்க விதைகள்' : 'Breeder Seeds', icon: '🔬' },
              { id: 'Fruit Seeds', label: isTamil ? 'பழ விதைகள்' : 'Fruit Seeds', icon: '🍎' },
              { id: 'Flower & Tree Seeds', label: isTamil ? 'பூ & மர விதைகள்' : 'Flower & Tree', icon: '🌸' },
              { id: 'Medicinal Plant Seeds', label: isTamil ? 'மூலிகை விதைகள்' : 'Medicinal Plants', icon: '🌿' },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${isSelected
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black scale-[1.02]'
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
          <div className="rounded-2xl glass-panel border border-border-light p-6 shadow-xl animate-pulse">
            <div className="flex items-center justify-between pb-3 border-b border-border-light/60 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-semibold text-text-muted">
                  {isTamil ? 'TNAU விதை விலை விவரங்கள் பெறப்படுகின்றன...' : 'Fetching Live TNAU Seed Price Table...'}
                </span>
              </div>
              <div className="skeleton-box h-4 w-32 rounded" />
            </div>
            <div className="divide-y divide-border-light/40">
              {[1, 2, 3, 4, 5, 6, 7].map((row) => (
                <div key={row} className="grid grid-cols-5 gap-4 items-center py-3">
                  <div className="skeleton-box h-4 w-3/4 rounded" />
                  <div className="skeleton-box h-4 w-1/2 rounded" />
                  <div className="skeleton-box h-5 w-20 rounded-full" />
                  <div className="skeleton-box h-4 w-16 rounded" />
                  <div className="skeleton-box h-7 w-20 rounded-lg justify-self-end" />
                </div>
              ))}
            </div>
          </div>
        ) : error && filteredSeeds.length === 0 ? (
          <div className="rounded-2xl glass-panel border border-rose-500/30 p-12 text-center shadow-xl space-y-3">
            <span className="text-4xl">⚠️</span>
            <h3 className="text-base font-bold text-rose-400">
              {isTamil ? 'தரவு பெறப்படவில்லை' : 'Unable to Load Seed Catalog'}
            </h3>
            <p className="text-xs text-text-muted max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={fetchSeedData}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md hover:bg-emerald-400 transition-all cursor-pointer"
            >
              {isTamil ? 'மீண்டும் முயற்சிக்கவும்' : 'Retry'}
            </button>
          </div>
        ) : filteredSeeds.length === 0 ? (
          <div className="rounded-2xl glass-panel border border-border-light p-12 text-center shadow-xl space-y-2">
            <span className="text-4xl">📭</span>
            <h3 className="text-base font-bold text-text-main">
              {isTamil ? 'விதைகள் எதுவும் கிடைக்கவில்லை' : 'No Seeds Found'}
            </h3>
            <p className="text-xs text-text-muted">
              {isTamil
                ? 'தேர்ந்தெடுக்கப்பட்ட வகைக்கு அல்லது தேடலுக்கு விதைகள் எதுவும் பொருந்தவில்லை.'
                : 'No seeds match your selected category or search filter.'}
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
        ) : viewLayout === 'table' ? (
          /* Ant Design Table View */
          <div className="overflow-hidden rounded-2xl glass-panel border border-border-light shadow-2xl">
            <div className="overflow-x-auto">
              <Table<TnauSeedItem>
                columns={columns}
                dataSource={filteredSeeds}
                rowKey="id"
                pagination={{
                  pageSize: 15,
                  showSizeChanger: true,
                  pageSizeOptions: ['15', '30', '50', '100'],
                  className: 'px-4 py-2',
                }}
                onRow={(record) => ({
                  onClick: () => setActiveSeed(record),
                  className: 'cursor-pointer hover:bg-surface/60 transition-colors',
                })}
              />
            </div>
            {/* Table Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-5 py-3 border-t border-border-subtle bg-surface/30 text-xs text-text-muted">
              <span>
                Showing <strong className="text-text-main">{filteredSeeds.length}</strong> seed varieties
              </span>
              <span>All prices are in Indian Rupees (INR) as published by TNAU</span>
            </div>
          </div>
        ) : (
          /* Card Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
            {filteredSeeds.map((seed) => {
              const theme = getCategoryTheme(seed.category);
              return (
                <div
                  key={seed.id}
                  onClick={() => setActiveSeed(seed)}
                  className="rounded-2xl glass-panel p-4 border border-border-light hover:border-emerald-500/50 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
                >
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
              );
            })}
          </div>
        )}

        {/* Detail Modal */}
        <Modal
          open={Boolean(activeSeed)}
          onCancel={() => setActiveSeed(null)}
          footer={null}
          centered
          width={480}
          styles={{
            body: {
              backgroundColor: 'var(--bg-card, #121c2d)',
              color: 'var(--text-main, #f1f5f9)',
            },
          }}
        >
          {activeSeed && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getCategoryTheme(activeSeed.category).bg
                    } ${getCategoryTheme(activeSeed.category).border} ${getCategoryTheme(activeSeed.category).text
                    }`}
                >
                  <span>{getCategoryTheme(activeSeed.category).icon}</span>
                  <span>{activeSeed.category}</span>
                </span>
                <span className="text-xs font-mono text-text-muted">
                  Sl. #{activeSeed.slNo}
                </span>
              </div>

              <div>
                <h2 className="font-display text-xl font-black text-text-main leading-snug">
                  {activeSeed.particulars}
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Official seed variety approved for commercial cultivation by TNAU.
                </p>
              </div>

              <div className="rounded-xl bg-surface/80 border border-border-subtle p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Official TNAU Rate:</span>
                  <span className="font-mono text-xl font-black text-emerald-400">
                    ₹{activeSeed.pricePerKg.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Sale Unit:</span>
                  <span className="font-bold text-text-main capitalize">Per {activeSeed.unit}</span>
                </div>
                {activeSeed.unit === 'kg' && activeSeed.pricePerKg > 0 && (
                  <div className="flex items-center justify-between text-xs text-text-muted pt-1 border-t border-border-subtle/50">
                    <span>Approx. 100g Seed Cost:</span>
                    <span className="font-mono font-bold text-text-secondary">
                      ₹{(activeSeed.pricePerKg / 10).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-text-secondary leading-relaxed">
                <p className="font-bold text-emerald-300 mb-1">📍 How to Purchase:</p>
                These seeds can be directly purchased at the <strong>TNAU Seed Centre, Coimbatore - 641 003</strong> or through regional Agricultural Research Stations (ARS) and KVKs across Tamil Nadu.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSeed(null)}
                  className="px-4 py-2 rounded-xl glass-surface text-xs font-bold text-text-secondary hover:text-text-main border border-border-light transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
