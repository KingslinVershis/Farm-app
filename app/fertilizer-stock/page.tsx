'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { motion } from 'motion/react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ShinyText } from '@/components/reactbits/ShinyText';
import { AnimatedCounter } from '@/components/reactbits/AnimatedCounter';
import { Store, Boxes, Phone, Search, RefreshCw, AlertCircle } from '@/components/icons/FlaticonIcons';
import type {
  FertDistrictItem,
  FertSubdistrictItem,
  FertDealerRecord,
  FertPriceProductItem,
  FertPriceDetailRow,
  FertStockApiResponse,
} from '@/app/api/fertilizer-stock/route';

export default function FertilizerStockPage() {
  const { messages, locale } = useLanguage();
  const fs = (messages as any).fertilizerStockPage;

  const [activeTab, setActiveTab] = useState<'shop' | 'price'>('shop');

  // --- Tab 1: Fertilizer Shop States ---
  const [districts, setDistricts] = useState<FertDistrictItem[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [districtSearchText, setDistrictSearchText] = useState<string>('');
  const [districtSearching, setDistrictSearching] = useState<boolean>(false);

  const [subdistricts, setSubdistricts] = useState<FertSubdistrictItem[]>([]);
  const [selectedSubdistrictId, setSelectedSubdistrictId] = useState<string>('');
  const [subdistrictSearchText, setSubdistrictSearchText] = useState<string>('');
  const [subdistrictSearching, setSubdistrictSearching] = useState<boolean>(false);

  const [dealers, setDealers] = useState<FertDealerRecord[]>([]);
  const [availableFertilizers, setAvailableFertilizers] = useState<string[]>([]);
  const [selectedFertilizer, setSelectedFertilizer] = useState<string>('all');
  const [shopSearchText, setShopSearchText] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>('');

  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(true);
  const [loadingSubdistricts, setLoadingSubdistricts] = useState<boolean>(false);
  const [loadingDealers, setLoadingDealers] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- Tab 2: Fertilizer Price States ---
  const [priceProducts, setPriceProducts] = useState<FertPriceProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productSearchText, setProductSearchText] = useState<string>('');
  const [productSearching, setProductSearching] = useState<boolean>(false);
  const [priceRows, setPriceRows] = useState<FertPriceDetailRow[]>([]);
  const [priceUnitLabel, setPriceUnitLabel] = useState<string>('Rs / 50 kgs');
  const [companySearchText, setCompanySearchText] = useState<string>('');
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [loadingPrices, setLoadingPrices] = useState<boolean>(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  const fetchPriceProducts = useCallback(async () => {
    setLoadingProducts(true);
    setPriceError(null);
    try {
      const res = await fetch('/api/fertilizer-stock?mode=price-products');
      if (!res.ok) throw new Error(`Failed to fetch products (${res.status})`);
      const json: FertStockApiResponse = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load products.');
      setPriceProducts(json.products || []);
    } catch (err: any) {
      setPriceError(err?.message || 'Unable to load fertilizer products.');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchPricesForProduct = useCallback(async (productId: string) => {
    if (!productId) return;
    setLoadingPrices(true);
    setPriceError(null);
    try {
      const res = await fetch(
        `/api/fertilizer-stock?priceProductId=${encodeURIComponent(productId)}`
      );
      if (!res.ok) throw new Error(`Failed to fetch prices (${res.status})`);
      const json: FertStockApiResponse = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load price details.');
      setPriceRows(json.prices || []);
      if (json.unitLabel) setPriceUnitLabel(json.unitLabel);
    } catch (err: any) {
      setPriceError(err?.message || 'Unable to load fertilizer prices.');
    } finally {
      setLoadingPrices(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'price' && priceProducts.length === 0 && !loadingProducts) {
      fetchPriceProducts();
    }
  }, [activeTab, priceProducts.length, loadingProducts, fetchPriceProducts]);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    setProductSearchText('');
    setProductSearching(false);
    setCompanySearchText('');
    fetchPricesForProduct(productId);
  };

  const filteredPriceRows = useMemo(() => {
    const q = companySearchText.trim().toLowerCase();
    if (!q) return priceRows;
    return priceRows.filter(
      (r) =>
        r.company.toLowerCase().includes(q) ||
        r.companyTamil.toLowerCase().includes(q) ||
        r.price.toLowerCase().includes(q)
    );
  }, [priceRows, companySearchText]);

  const priceColumns: ColumnsType<FertPriceDetailRow> = useMemo(
    () => [
      {
        title: fs.colSlNo,
        dataIndex: 'slNo',
        key: 'slNo',
        width: '12%',
        align: 'center',
        render: (slNo: number) => (
          <span className="font-mono text-xs font-bold text-text-muted">{slNo}</span>
        ),
      },
      {
        title: fs.colCompany,
        dataIndex: 'company',
        key: 'company',
        width: '58%',
        render: (_: string, row) => (
          <span className="font-extrabold text-xs sm:text-sm text-text-main">
            {locale === 'ta' && row.companyTamil ? row.companyTamil : row.company}
          </span>
        ),
      },
      {
        title: `${fs.colPrice} (${priceUnitLabel})`,
        dataIndex: 'price',
        key: 'price',
        width: '30%',
        align: 'right',
        render: (price: string) => (
          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 font-mono text-xs sm:text-sm font-black whitespace-nowrap">
            ₹{price}
          </span>
        ),
      },
    ],
    [fs, locale, priceUnitLabel]
  );

  const fetchDistricts = useCallback(async () => {
    setLoadingDistricts(true);
    setError(null);
    try {
      const res = await fetch(`/api/fertilizer-stock?lang=${locale}`);
      if (!res.ok) throw new Error(`Failed to fetch districts (${res.status})`);
      const json: FertStockApiResponse = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load districts.');
      setDistricts(json.districts || []);
      if (json.reportDate) setReportDate(json.reportDate);
    } catch (err: any) {
      setError(err?.message || 'Unable to load district list.');
    } finally {
      setLoadingDistricts(false);
    }
  }, [locale]);

  const fetchSubdistricts = useCallback(
    async (districtId: string) => {
      if (!districtId) return;
      setLoadingSubdistricts(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/fertilizer-stock?districtId=${encodeURIComponent(districtId)}&lang=${locale}`
        );
        if (!res.ok) throw new Error(`Failed to fetch sub-districts (${res.status})`);
        const json: FertStockApiResponse = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load sub-districts.');
        setSubdistricts(json.subdistricts || []);
        if (json.reportDate) setReportDate(json.reportDate);
      } catch (err: any) {
        setError(err?.message || 'Unable to load sub-district list.');
      } finally {
        setLoadingSubdistricts(false);
      }
    },
    [locale]
  );

  const fetchDealers = useCallback(
    async (subdistrictId: string) => {
      if (!subdistrictId) return;
      setLoadingDealers(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/fertilizer-stock?subdistrictId=${encodeURIComponent(subdistrictId)}&lang=${locale}`
        );
        if (!res.ok) throw new Error(`Failed to fetch dealer stock (${res.status})`);
        const json: FertStockApiResponse = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to load dealer stock.');
        setDealers(json.dealers || []);
        setAvailableFertilizers(json.availableFertilizers || []);
        if (json.reportDate) setReportDate(json.reportDate);
      } catch (err: any) {
        setError(err?.message || 'Unable to load dealer stock report.');
      } finally {
        setLoadingDealers(false);
      }
    },
    [locale]
  );

  useEffect(() => {
    fetchDistricts();
  }, [fetchDistricts]);

  // Re-fetch active dropdown levels if locale changes
  useEffect(() => {
    if (selectedDistrictId) {
      fetchSubdistricts(selectedDistrictId);
    }
    if (selectedSubdistrictId) {
      fetchDealers(selectedSubdistrictId);
    }
  }, [locale, selectedDistrictId, selectedSubdistrictId, fetchSubdistricts, fetchDealers]);

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrictId(districtId);
    setDistrictSearchText('');
    setDistrictSearching(false);
    setSelectedSubdistrictId('');
    setSubdistrictSearchText('');
    setSubdistrictSearching(false);
    setSubdistricts([]);
    setDealers([]);
    setAvailableFertilizers([]);
    setSelectedFertilizer('all');
    setShopSearchText('');
    fetchSubdistricts(districtId);
  };

  const handleSubdistrictChange = (subdistrictId: string) => {
    setSelectedSubdistrictId(subdistrictId);
    setSubdistrictSearchText('');
    setSubdistrictSearching(false);
    setSelectedFertilizer('all');
    setShopSearchText('');
    fetchDealers(subdistrictId);
  };

  const filteredDealers = useMemo(() => {
    const query = shopSearchText.trim().toLowerCase();
    return dealers.filter((dealer) => {
      const fertMatch =
        selectedFertilizer === 'all' ||
        dealer.stocks.some((s) => s.fertilizer === selectedFertilizer);
      const searchMatch =
        !query ||
        dealer.shopName.toLowerCase().includes(query) ||
        dealer.phone.toLowerCase().includes(query);
      return fertMatch && searchMatch;
    });
  }, [dealers, selectedFertilizer, shopSearchText]);

  const totalStockMt = useMemo(() => {
    return (
      Math.round(
        filteredDealers.reduce((sum, d) => {
          if (selectedFertilizer === 'all') return sum + d.totalStockMt;
          const item = d.stocks.find((s) => s.fertilizer === selectedFertilizer);
          return sum + (item ? item.quantityMt : 0);
        }, 0) * 100
      ) / 100
    );
  }, [filteredDealers, selectedFertilizer]);

  const activeStockShopsCount = useMemo(() => {
    return filteredDealers.filter((d) => d.stocks.length > 0).length;
  }, [filteredDealers]);

  const columns: ColumnsType<FertDealerRecord> = useMemo(
    () => [
      {
        title: fs.colShopName,
        dataIndex: 'shopName',
        key: 'shopName',
        width: '26%',
        render: (name: string) => (
          <div className="flex items-center gap-2.5 pr-2">
            <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
              <Store size={15} />
            </span>
            <span className="font-extrabold text-xs sm:text-sm text-text-main leading-snug">
              {name}
            </span>
          </div>
        ),
      },
      {
        title: fs.colPhone,
        dataIndex: 'phone',
        key: 'phone',
        width: '16%',
        render: (phone: string) =>
          phone && phone !== '-' ? (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 font-mono text-xs font-bold hover:bg-rose-500/25 transition-colors whitespace-nowrap"
            >
              <Phone size={12} />
              <span>{phone}</span>
            </a>
          ) : (
            <span className="text-xs text-text-muted font-mono">-</span>
          ),
      },
      {
        title: fs.colStocks,
        dataIndex: 'stocks',
        key: 'stocks',
        width: '46%',
        render: (stocks: FertDealerRecord['stocks']) => {
          if (!stocks || stocks.length === 0) {
            return (
              <span className="text-xs text-text-muted italic">{fs.noStockRecorded}</span>
            );
          }
          const visibleStocks =
            selectedFertilizer === 'all'
              ? stocks
              : stocks.filter((s) => s.fertilizer === selectedFertilizer);
          return (
            <div className="flex flex-wrap gap-1.5 py-0.5">
              {visibleStocks.map((item) => (
                <span
                  key={item.fertilizer}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg glass-surface border border-border-subtle text-[11px] font-semibold text-text-main"
                >
                  <span className="text-text-secondary">{item.fertilizer}:</span>
                  <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                    {item.quantityMt.toFixed(2)} MT
                  </span>
                </span>
              ))}
            </div>
          );
        },
      },
      {
        title: fs.colTotalMt,
        dataIndex: 'totalStockMt',
        key: 'totalStockMt',
        align: 'right',
        width: '12%',
        render: (_: number, record) => {
          const val =
            selectedFertilizer === 'all'
              ? record.totalStockMt
              : record.stocks.find((s) => s.fertilizer === selectedFertilizer)?.quantityMt || 0;
          return (
            <span className="font-mono text-xs sm:text-sm font-black text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
              {val.toFixed(2)}
            </span>
          );
        },
      },
    ],
    [fs, selectedFertilizer]
  );

  return (
    <div className="relative min-h-screen w-full">
      <div className="relative z-10 fade-in flex flex-col gap-5 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto pb-20">
        {/* Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-2xl glass-panel p-5 sm:p-7 shadow-xl border border-border-light"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <Boxes size={13} />
                  {fs.bannerTag}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {fs.liveBadge}
                </span>
                {reportDate && (
                  <span className="text-xs font-bold text-text-secondary bg-surface px-2.5 py-0.5 rounded-md border border-border-subtle">
                    {fs.reportDateLabel} {reportDate}
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-text-main">
                <ShinyText text={fs.pageTitle} speed={6} />
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
                {fs.pageSubtitle}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Two-Tab Switcher: Fertilizer Shop | Fertilizer Price */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl glass-panel border border-border-light shadow-md">
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'shop'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white keep-white shadow-md font-extrabold'
                : 'text-text-secondary hover:text-text-main hover:bg-surface/60'
            }`}
          >
            <Store size={16} />
            <span>{fs.tabShop}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('price')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'price'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white keep-white shadow-md font-extrabold'
                : 'text-text-secondary hover:text-text-main hover:bg-surface/60'
            }`}
          >
            <Boxes size={16} />
            <span>{fs.tabPrice}</span>
          </button>
        </div>

        {activeTab === 'shop' ? (
          <>
            {/* Cascading Dropdowns & Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: 'easeOut' }}
          className="glass-panel p-4 sm:p-5 rounded-2xl border border-border-light shadow-xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
            {/* District Dropdown */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-text-muted mb-1.5">
                {fs.districtLabel} *
              </label>
              <Select
                showSearch
                loading={loadingDistricts}
                value={districtSearchText ? undefined : selectedDistrictId || undefined}
                searchValue={districtSearchText}
                placeholder={loadingDistricts ? fs.loadingDistricts : fs.districtPlaceholder}
                onChange={handleDistrictChange}
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
                  String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                }
                options={districts.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
            </div>

            {/* Sub-District Dropdown (enabled after District is chosen) */}
            <div className="md:col-span-4">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-text-muted mb-1.5">
                {fs.subdistrictLabel} *
              </label>
              <Select
                showSearch
                loading={loadingSubdistricts}
                disabled={!selectedDistrictId || loadingSubdistricts}
                value={subdistrictSearchText ? undefined : selectedSubdistrictId || undefined}
                searchValue={subdistrictSearchText}
                placeholder={
                  !selectedDistrictId
                    ? fs.subdistrictPlaceholder
                    : loadingSubdistricts
                      ? fs.loadingSubdistricts
                      : fs.subdistrictReadyPlaceholder
                }
                onChange={handleSubdistrictChange}
                onSearch={(val) => {
                  setSubdistrictSearchText(val);
                  setSubdistrictSearching(val.length > 0);
                }}
                onBlur={() => {
                  setSubdistrictSearchText('');
                  setSubdistrictSearching(false);
                }}
                onSelect={() => {
                  setSubdistrictSearchText('');
                  setSubdistrictSearching(false);
                }}
                onDropdownVisibleChange={(open) => {
                  if (!open) {
                    setSubdistrictSearchText('');
                    setSubdistrictSearching(false);
                  }
                }}
                className={`w-full h-10 text-xs font-semibold custom-antd-select ${subdistrictSearching ? 'is-searching' : ''}`}
                filterOption={(input, option) =>
                  String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                }
                options={subdistricts.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
              />
            </div>

            {/* Shop Search & Fertilizer Filter (when subdistrict is active) */}
            <div className="md:col-span-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
                <input
                  type="text"
                  value={shopSearchText}
                  onChange={(e) => setShopSearchText(e.target.value)}
                  disabled={!selectedSubdistrictId}
                  placeholder={fs.searchShopPlaceholder}
                  className="w-full h-10 pl-8 pr-3 rounded-xl glass-surface border border-border-light text-xs font-semibold text-text-main placeholder:text-text-muted focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>

              {selectedSubdistrictId && (
                <button
                  type="button"
                  onClick={() => fetchDealers(selectedSubdistrictId)}
                  disabled={loadingDealers}
                  title="Refresh"
                  className="h-10 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RefreshCw size={14} className={loadingDealers ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
          </div>

          {/* Optional Fertilizer Filter Pills when dealers load */}
          {selectedSubdistrictId && availableFertilizers.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-border-subtle flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted mr-1">
                Filter:
              </span>
              <Select
                showSearch
                value={selectedFertilizer}
                onChange={(val) => setSelectedFertilizer(val)}
                className="w-full sm:w-64 h-9 text-xs font-semibold custom-antd-select"
                options={[
                  { value: 'all', label: fs.filterFertPlaceholder },
                  ...availableFertilizers.map((f) => ({ value: f, label: f })),
                ]}
              />
            </div>
          )}
        </motion.div>

        {/* Summary KPI Cards when Sub-District is selected */}
        {selectedSubdistrictId && !loadingDealers && dealers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel rounded-2xl border border-border-light p-4 shadow-lg">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted block">
                {fs.totalDealersLabel}
              </span>
              <span className="text-2xl font-black text-text-main font-mono mt-1 block">
                <AnimatedCounter value={filteredDealers.length} />
              </span>
            </div>

            <div className="glass-panel rounded-2xl border border-border-light p-4 shadow-lg">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted block">
                {fs.inStockLabel}
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
                <AnimatedCounter value={activeStockShopsCount} />
              </span>
            </div>

            <div className="glass-panel rounded-2xl border border-border-light p-4 shadow-lg">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted block">
                {fs.totalStockLabel}
              </span>
              <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono mt-1 block">
                <AnimatedCounter value={totalStockMt} decimals={2} /> MT
              </span>
            </div>
          </div>
        )}

        {/* Dealer Wise Stock Table Container */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.14, ease: 'easeOut' }}
          className="overflow-hidden rounded-2xl glass-panel border border-border-light shadow-xl"
        >
          {loadingDealers ? (
            <div className="p-6 space-y-4 animate-pulse">
              <div className="flex items-center gap-2 pb-3 border-b border-border-light/60">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-semibold text-text-muted">{fs.loadingDealers}</span>
              </div>
              {[1, 2, 3, 4, 5, 6].map((row) => (
                <div key={row} className="grid grid-cols-4 gap-4 items-center py-2.5">
                  <div className="skeleton-box h-4 w-4/5 rounded" />
                  <div className="skeleton-box h-4 w-2/3 rounded" />
                  <div className="skeleton-box h-5 w-full rounded" />
                  <div className="skeleton-box h-4 w-1/2 rounded justify-self-end" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
              <span className="text-4xl">⚠️</span>
              <p className="text-xs text-rose-500 font-semibold max-w-md">{error}</p>
            </div>
          ) : !selectedDistrictId || !selectedSubdistrictId ? (
            <div className="flex flex-col items-center justify-center p-14 text-center gap-3">
              <span className="p-4 rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                <Store size={28} />
              </span>
              <h3 className="text-base font-bold text-text-main m-0">
                {fs.selectPromptTitle}
              </h3>
              <p className="text-xs text-text-muted max-w-md m-0">
                {fs.selectPromptDesc}
              </p>
            </div>
          ) : filteredDealers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
              <span className="text-4xl">📭</span>
              <p className="text-xs text-text-muted max-w-md">{fs.noDealersFound}</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto scrollbar-thin">
              <Table<FertDealerRecord>
                columns={columns}
                dataSource={filteredDealers}
                rowKey="id"
                pagination={{ pageSize: 15, showSizeChanger: false }}
                className="reservoirs-table"
                onRow={() => ({
                  className: 'hover:bg-surface/50 transition-colors',
                })}
              />
            </div>
          )}

          {/* Footer Note */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-5 py-3.5 border-t border-border-light bg-surface/40 text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <span>🧪</span>
              <span>{fs.sourceNote}</span>
            </div>
            {selectedSubdistrictId && (
              <span className="font-semibold text-text-secondary">
                {fs.totalDealersLabel}: <strong className="text-text-main">{filteredDealers.length}</strong>
              </span>
            )}
          </div>
        </motion.div>
          </>
        ) : (
          <>
            {/* Fertilizer Price Controls */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="glass-panel p-4 sm:p-5 rounded-2xl border border-border-light shadow-xl"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                <div className="md:col-span-6">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-text-muted mb-1.5">
                    {fs.priceProductLabel} *
                  </label>
                  <Select
                    showSearch
                    loading={loadingProducts}
                    value={productSearchText ? undefined : selectedProductId || undefined}
                    searchValue={productSearchText}
                    placeholder={loadingProducts ? fs.loadingProducts : fs.priceProductPlaceholder}
                    onChange={handleProductChange}
                    onSearch={(val) => {
                      setProductSearchText(val);
                      setProductSearching(val.length > 0);
                    }}
                    onBlur={() => {
                      setProductSearchText('');
                      setProductSearching(false);
                    }}
                    onSelect={() => {
                      setProductSearchText('');
                      setProductSearching(false);
                    }}
                    onDropdownVisibleChange={(open) => {
                      if (!open) {
                        setProductSearchText('');
                        setProductSearching(false);
                      }
                    }}
                    className={`w-full h-10 text-xs font-semibold custom-antd-select ${productSearching ? 'is-searching' : ''}`}
                    filterOption={(input, option) =>
                      String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={priceProducts.map((p) => ({
                      value: p.id,
                      label: p.name,
                    }))}
                  />
                </div>

                <div className="md:col-span-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                    <input
                      type="text"
                      value={companySearchText}
                      onChange={(e) => setCompanySearchText(e.target.value)}
                      disabled={!selectedProductId}
                      placeholder={fs.searchCompanyPlaceholder}
                      className="w-full h-10 pl-8 pr-3 rounded-xl glass-surface border border-border-light text-xs font-semibold text-text-main placeholder:text-text-muted focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                    />
                  </div>

                  {selectedProductId && (
                    <button
                      type="button"
                      onClick={() => fetchPricesForProduct(selectedProductId)}
                      disabled={loadingPrices}
                      title="Refresh"
                      className="h-10 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <RefreshCw size={14} className={loadingPrices ? 'animate-spin' : ''} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Printed Price Bag Advisory Banner */}
            <div className="glass-panel rounded-2xl border border-amber-500/35 p-4 flex items-center gap-3 text-xs sm:text-sm font-semibold text-text-main shadow-md">
              <span className="p-2 rounded-xl bg-amber-500/15 text-amber-500 shrink-0">
                <AlertCircle size={16} />
              </span>
              <span>{fs.priceAdvisoryNote}</span>
            </div>

            {/* Fertilizer Price Table Container */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="overflow-hidden rounded-2xl glass-panel border border-border-light shadow-xl"
            >
              {loadingPrices ? (
                <div className="p-6 space-y-4 animate-pulse">
                  <div className="flex items-center gap-2 pb-3 border-b border-border-light/60">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-semibold text-text-muted">{fs.loadingPrices}</span>
                  </div>
                  {[1, 2, 3, 4, 5].map((row) => (
                    <div key={row} className="grid grid-cols-3 gap-4 items-center py-2.5">
                      <div className="skeleton-box h-4 w-12 rounded" />
                      <div className="skeleton-box h-4 w-2/3 rounded" />
                      <div className="skeleton-box h-5 w-24 rounded justify-self-end" />
                    </div>
                  ))}
                </div>
              ) : priceError ? (
                <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
                  <span className="text-4xl">⚠️</span>
                  <p className="text-xs text-rose-500 font-semibold max-w-md">{priceError}</p>
                </div>
              ) : !selectedProductId ? (
                <div className="flex flex-col items-center justify-center p-14 text-center gap-3">
                  <span className="p-4 rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
                    <Boxes size={28} />
                  </span>
                  <h3 className="text-base font-bold text-text-main m-0">
                    {fs.selectPricePromptTitle}
                  </h3>
                  <p className="text-xs text-text-muted max-w-md m-0">
                    {fs.selectPricePromptDesc}
                  </p>
                </div>
              ) : filteredPriceRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
                  <span className="text-4xl">📭</span>
                  <p className="text-xs text-text-muted max-w-md">{fs.noPricesFound}</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto scrollbar-thin">
                  <Table<FertPriceDetailRow>
                    columns={priceColumns}
                    dataSource={filteredPriceRows}
                    rowKey={(row) => `${row.slNo}-${row.company}`}
                    pagination={false}
                    className="reservoirs-table"
                    onRow={() => ({
                      className: 'hover:bg-surface/50 transition-colors',
                    })}
                  />
                </div>
              )}

              {/* Footer Note */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-5 py-3.5 border-t border-border-light bg-surface/40 text-xs text-text-muted">
                <div className="flex items-center gap-2">
                  <span>🏷️</span>
                  <span>{fs.priceSourceNote}</span>
                </div>
                {selectedProductId && (
                  <span className="font-semibold text-text-secondary">
                    {fs.colCompany}: <strong className="text-text-main">{filteredPriceRows.length}</strong> ({priceUnitLabel})
                  </span>
                )}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

