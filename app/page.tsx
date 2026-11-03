'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import {
  SproutIcon,
  FlaskConicalIcon,
  WavesIcon,
  TractorIcon,
  DropletsIcon,
  ArrowUpRightIcon,
  ChevronRightIcon,
  CloudSunIcon,
  CheckCircleIcon,
  type IconProps,
} from '@/components/icons/Icons';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { AnimatedCounter } from '@/components/reactbits/AnimatedCounter';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';

const RiveVillageBackground = dynamic(
  () => import('@/components/dashboard/RiveVillageBackground').then((mod) => mod.RiveVillageBackground),
  { ssr: false }
);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

interface CultivationPlanSummary {
  id: string;
  farmerName: string;
  landSize: number;
  location: string;
  grandTotal: number;
  revenueTotal: number;
  netProfit: number;
  roi: number;
  updated_at: string;
}

interface ReservoirSnapshot {
  name: string;
  tamilName: string;
  storageMcft: number;
  capacityMcft: number;
  percent: number;
  inflow: number;
  outflow: number;
}

export default function FarmDashboardPage() {
  const { messages, locale } = useLanguage();
  const isTamil = locale === 'ta';
  const t = messages.dashboard;

  const [savedPlans, setSavedPlans] = useState<CultivationPlanSummary[]>([
    {
      id: 'plan_1793340611137',
      farmerName: 'Arun Kumar',
      landSize: 100,
      location: 'Kovilpatti, Thoothukkudi, Tamil Nadu',
      grandTotal: 59450,
      revenueTotal: 246000,
      netProfit: 186550,
      roi: 314,
      updated_at: '30 Oct 2026, 12:15 pm',
    },
    {
      id: 'plan_1793343120000',
      farmerName: 'Karthik',
      landSize: 100,
      location: 'Thoothukkudi, Tamil Nadu',
      grandTotal: 50000,
      revenueTotal: 200000,
      netProfit: 150000,
      roi: 300,
      updated_at: '30 Oct 2026, 12:57 pm',
    },
  ]);

  const [plansCount, setPlansCount] = useState<number>(2);
  const [reservoirPercent, setReservoirPercent] = useState<number>(55.4);
  const [seedVarietiesCount, setSeedVarietiesCount] = useState<number>(78);

  const majorDams: ReservoirSnapshot[] = [
    {
      name: 'Mettur Dam (Stanley)',
      tamilName: 'மேட்டூர் அணை (ஸ்டான்லி)',
      storageMcft: 59450,
      capacityMcft: 93470,
      percent: 63.6,
      inflow: 8420,
      outflow: 6500,
    },
    {
      name: 'Bhavanisagar Dam',
      tamilName: 'பவானிசாகர் அணை',
      storageMcft: 21340,
      capacityMcft: 32800,
      percent: 65.1,
      inflow: 3150,
      outflow: 2400,
    },
    {
      name: 'Vaigai Dam',
      tamilName: 'வைகை அணை',
      storageMcft: 4210,
      capacityMcft: 6140,
      percent: 68.6,
      inflow: 1820,
      outflow: 1100,
    },
  ];

  // Fetch live counts from our DB APIs silently on mount
  useEffect(() => {
    let mounted = true;

    // 1. Fetch fertilizer plans count for authenticated user
    fetch('/api/user')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!mounted || !json) return;
        const plansList = json.plans || [];
        if (Array.isArray(plansList)) {
          setPlansCount(plansList.length);
          const mapped: CultivationPlanSummary[] = plansList.slice(0, 3).map((item: any) => {
            const outlay = item.totals?.grandTotal || 50000;
            const profit = item.totals?.netProfit || 150000;
            const roiCalc = outlay > 0 ? Math.round((profit / outlay) * 100) : 0;
            const loc = [item.userDetails?.city, item.userDetails?.district, item.userDetails?.state]
              .filter(Boolean)
              .join(', ');
            return {
              id: item.id,
              farmerName: item.userDetails?.name || 'Farmer',
              landSize: Number(item.userDetails?.landSize) || 100,
              location: loc || 'Tamil Nadu',
              grandTotal: outlay,
              revenueTotal: item.totals?.revenueTotal || 200000,
              netProfit: profit,
              roi: roiCalc,
              updated_at: item.updated_at || item.created_at || 'Today',
            };
          });
          setSavedPlans(mapped);
        }
      })
      .catch(() => { });

    // 2. Fetch reservoirs telemetry
    fetch('/api/reservoirs')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!mounted || !json || !json.reservoirs) return;
        if (Array.isArray(json.reservoirs) && json.reservoirs.length > 0) {
          const totalCur = json.reservoirs.reduce((acc: number, r: any) => acc + (Number(r.currentStorage) || 0), 0);
          const totalCap = json.reservoirs.reduce((acc: number, r: any) => acc + (Number(r.fullCapacity) || 0), 0);
          if (totalCap > 0) {
            setReservoirPercent(Number(((totalCur / totalCap) * 100).toFixed(1)));
          }
        }
      })
      .catch(() => { });

    // 3. Fetch TNAU seeds count
    fetch('/api/tnau-seeds')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!mounted || !json) return;
        if (json.totalItems) {
          setSeedVarietiesCount(json.totalItems);
        } else if (Array.isArray(json.data)) {
          setSeedVarietiesCount(json.data.length);
        }
      })
      .catch(() => { });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full">
      {/* Dynamic Animated Rive Village Scene Background (Day to Night) */}
      <RiveVillageBackground />

      {/* Main Container */}
      <div className="relative z-10 space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto animate-fade-in pb-24 text-text-main">
        {/* Top Executive Header Dossier */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-panel rounded-2xl p-5 sm:p-7 shadow-2xl border border-border-light relative overflow-hidden"
        >
          <div className="space-y-2 z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t.telemetryStream}</span>
              </span>
              <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                Kaveri Delta • Zone 4
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-text-main tracking-tight">
              {t.title}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-3xl lg:max-w-4xl leading-relaxed">
              {t.subtitle}
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 z-10">
            <Link
              href="/fertilizer"
              className="rounded-xl px-4 py-2 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-glow active:scale-95"
            >
              <SproutIcon size={15} />
              <span>{t.newPlanBtn}</span>
            </Link>
            <Link
              href="/reservoirs"
              className="rounded-xl glass-surface px-3.5 py-2 text-xs font-bold text-text-main hover:bg-white/10 border border-border-light transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <WavesIcon size={15} className="text-cyan-400" />
              <span>{t.reservoirsBtn}</span>
            </Link>
            <Link
              href="/seeds"
              className="rounded-xl glass-surface px-3.5 py-2 text-xs font-bold text-text-main hover:bg-white/10 border border-border-light transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <SproutIcon size={15} className="text-emerald-400" />
              <span>{t.seedsBtn}</span>
            </Link>
          </div>
        </motion.div>

        {/* 4 Core Application KPI Metric Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        >
          {/* KPI 1: Active Fertilizer Plans */}
          <motion.div variants={itemVariants}>
            <SpotlightCard
              spotlightColor="rgba(16, 185, 129, 0.18)"
              className="h-full glass-panel p-5 rounded-2xl border-b-2 border-b-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_28px_-8px_rgba(16,185,129,0.3)] flex flex-col justify-between gap-3 group transition-all"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t.metrics.activePlans}
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-sm">
                  <FlaskConicalIcon size={18} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-text-main tracking-tight">
                <AnimatedCounter value={plansCount} suffix={isTamil ? ' ஆவணங்கள்' : ' Plans Saved'} />
              </div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span>✓</span>
                <span>{t.metrics.activePlansTrend}</span>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* KPI 2: Reservoirs Storage */}
          <motion.div variants={itemVariants}>
            <SpotlightCard
              spotlightColor="rgba(6, 182, 212, 0.18)"
              className="h-full glass-panel p-5 rounded-2xl border-b-2 border-b-cyan-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_28px_-8px_rgba(6,182,212,0.3)] flex flex-col justify-between gap-3 group transition-all"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t.metrics.reservoirsStorage}
                </span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-sm">
                  <WavesIcon size={18} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-text-main tracking-tight">
                <AnimatedCounter value={reservoirPercent} decimals={1} suffix="% Full" />
              </div>
              <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                <span>🌊</span>
                <span>{t.metrics.reservoirsTrend}</span>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* KPI 3: TNAU Seed Price Varieties */}
          <motion.div variants={itemVariants}>
            <SpotlightCard
              spotlightColor="rgba(168, 85, 247, 0.18)"
              className="h-full glass-panel p-5 rounded-2xl border-b-2 border-b-purple-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_28px_-8px_rgba(168,85,247,0.3)] flex flex-col justify-between gap-3 group transition-all"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t.metrics.tnauSeeds}
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center text-purple-400 shadow-sm">
                  <SproutIcon size={18} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-text-main tracking-tight">
                <AnimatedCounter value={seedVarietiesCount} suffix={isTamil ? ' வகைகள்' : ' Varieties'} />
              </div>
              <div className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <span>🌱</span>
                <span>{t.metrics.tnauSeedsTrend}</span>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* KPI 4: Commercial ROI & Net Profit */}
          <motion.div variants={itemVariants}>
            <SpotlightCard
              spotlightColor="rgba(16, 185, 129, 0.22)"
              className="h-full glass-panel p-5 rounded-2xl border-b-2 border-b-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_28px_-8px_rgba(16,185,129,0.3)] flex flex-col justify-between gap-3 group transition-all"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t.metrics.estRoi}
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-sm">
                  <TractorIcon size={18} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                <AnimatedCounter value={314} prefix="+" suffix="% ROI" />
              </div>
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <span>💰</span>
                <span>{t.metrics.estRoiTrend}</span>
              </div>
            </SpotlightCard>
          </motion.div>
        </motion.div>

        {/* Core Modules Trio Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-text-main">
                {t.quickOperations}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {isTamil
                  ? 'விவசாய மேலாண்மை, நீர் நிலவரம் மற்றும் விதை விலைகளுக்கான நேரடி அணுகல்'
                  : 'Direct access to precision agronomy calculation, dam hydrology, and seed market pricing'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Module 1: Fertilizer Mgmt */}
            <div className="rounded-2xl glass-panel p-6 shadow-xl flex flex-col justify-between group hover:border-emerald-500/40 transition-all">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {t.modules.fertilizerBadge}
                  </span>
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-lg shadow-sm">
                    🌾
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main group-hover:text-emerald-400 transition-colors">
                    {t.modules.fertilizerTitle}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed mt-1">
                    {t.modules.fertilizerDesc}
                  </p>
                </div>

                {/* Real-time Economic Snapshot Box */}
                <div className="p-3 rounded-xl glass-surface border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-text-muted">
                      {isTamil ? 'உத்தேச மண்டி வருவாய்' : 'Projected Mandi Realization'}
                    </span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹2,46,000
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/5">
                    <span className="text-[11px] font-semibold text-text-muted">
                      {isTamil ? 'சாகுபடி செலவு (4 நிலைகள்)' : 'Production Cost (4 Phases)'}
                    </span>
                    <span className="font-bold text-amber-500 dark:text-amber-400">
                      ₹59,450
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="px-2 py-0.5 rounded-md glass-surface text-[10px] font-semibold text-text-muted">
                    {isTamil ? 'உழவு & சேற்றுழவு' : 'Tractor Rent'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md glass-surface text-[10px] font-semibold text-text-muted">
                    {isTamil ? 'விதை & பயணச் செலவு' : 'Seed & Travel'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md glass-surface text-[10px] font-semibold text-text-muted">
                    {isTamil ? 'அறுவடை இயந்திரம்' : 'Harvester'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md glass-surface text-[10px] font-semibold text-text-muted">
                    {isTamil ? 'மண்டி விற்பனை' : 'Mandi Yield'}
                  </span>
                </div>
              </div>
              <div className="pt-6">
                <Link
                  href="/fertilizer"
                  className="w-full rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-sm group-hover:shadow-glow"
                >
                  <span>{t.modules.fertilizerCta}</span>
                  <ChevronRightIcon size={15} />
                </Link>
              </div>
            </div>

            {/* Module 2: Water Reservoirs */}
            <div className="rounded-2xl glass-panel p-6 shadow-xl flex flex-col justify-between group hover:border-cyan-500/40 transition-all">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-black text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                    {t.modules.reservoirsBadge}
                  </span>
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-lg shadow-sm">
                    🌊
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main group-hover:text-cyan-400 transition-colors">
                    {t.modules.reservoirsTitle}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed mt-1">
                    {t.modules.reservoirsDesc}
                  </p>
                </div>

                {/* Reservoir Hydrology Snapshot Box */}
                <div className="p-3 rounded-xl glass-surface border border-white/10 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-muted">Mettur (Stanley)</span>
                    <span className="font-extrabold text-cyan-500 dark:text-cyan-400">59,450 / 93,470 Mcft</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-muted">Bhavanisagar</span>
                    <span className="font-extrabold text-cyan-500 dark:text-cyan-400">21,340 / 32,800 Mcft</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-muted">Vaigai Dam</span>
                    <span className="font-extrabold text-cyan-500 dark:text-cyan-400">4,820 / 6,140 Mcft</span>
                  </div>
                  <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-text-muted font-medium">
                    <span>Inflow: 8,420 cusecs</span>
                    <span>Outflow: 6,500 cusecs</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="px-2 py-0.5 rounded-md glass-surface text-[10px] font-semibold text-text-muted">
                    {isTamil ? 'மேட்டூர் அணை' : 'Mettur (Stanley)'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md glass-surface text-[10px] font-semibold text-text-muted">
                    {isTamil ? 'பவானிசாகர்' : 'Bhavanisagar'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md glass-surface text-[10px] font-semibold text-text-muted">
                    {isTamil ? 'வைகை' : 'Vaigai'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md glass-surface text-[10px] font-semibold text-text-muted">
                    {isTamil ? 'நீர்வரத்து / வெளியேற்றம்' : 'Inflow & Outflow'}
                  </span>
                </div>
              </div>
              <div className="pt-6">
                <Link
                  href="/reservoirs"
                  className="w-full rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-sm group-hover:shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                >
                  <span>{t.modules.reservoirsCta}</span>
                  <ChevronRightIcon size={15} />
                </Link>
              </div>
            </div>

            {/* Module 3: TNAU Seed Prices */}
            <div className="rounded-2xl glass-panel p-6 shadow-xl flex flex-col justify-between group hover:border-purple-500/40 transition-all">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-black text-purple-700 dark:text-purple-300 border border-purple-500/30">
                    {t.modules.seedsBadge}
                  </span>
                  <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center text-lg shadow-sm">
                    🌱
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main group-hover:text-purple-400 transition-colors">
                    {t.modules.seedsTitle}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed mt-1">
                    {t.modules.seedsDesc}
                  </p>
                </div>

                {/* TNAU Seed Price Snapshot Box */}
                <div className="p-3 rounded-xl glass-surface border border-white/10 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-muted">ADT 43 (Medium Duration)</span>
                    <span className="font-extrabold text-purple-600 dark:text-purple-400">₹42.50/kg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-muted">CR 1009 Sub 1 (Samba)</span>
                    <span className="font-extrabold text-purple-600 dark:text-purple-400">₹44.00/kg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-muted">CO 51 (Short 105d)</span>
                    <span className="font-extrabold text-purple-600 dark:text-purple-400">₹46.50/kg</span>
                  </div>
                  <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-text-muted font-medium">
                    <span>Vegetable Seeds</span>
                    <span>Breeder Seeds</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="px-2 py-0.5 rounded-md glass-surface text-[10px] font-semibold text-text-muted">
                    {isTamil ? 'காய்கறி விதைகள்' : 'Vegetable Seeds'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md glass-surface text-[10px] font-semibold text-text-muted">
                    {isTamil ? 'வல்லுநர் விதைகள்' : 'Breeder Seeds'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md glass-surface text-[10px] font-semibold text-text-muted">
                    {isTamil ? 'பழ விதைகள்' : 'Fruit Seeds'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md glass-surface text-[10px] font-semibold text-text-muted">
                    {isTamil ? 'அரசு நிர்ணய விலை' : 'Official ₹/kg Rates'}
                  </span>
                </div>
              </div>
              <div className="pt-6">
                <Link
                  href="/seeds"
                  className="w-full rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 px-4 py-2.5 text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-sm group-hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]"
                >
                  <span>{t.modules.seedsCta}</span>
                  <ChevronRightIcon size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Dual Column: Saved Cultivation Records Snapshot + Reservoirs Telemetry & Advisory */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Recent Cultivation Dossiers */}
          <div className="rounded-2xl glass-panel p-6 border border-border-light shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="text-base font-black text-text-main">
                    {t.recentRecords.title}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {t.recentRecords.subtitle}
                  </p>
                </div>
                <Link
                  href="/fertilizer"
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>{t.recentRecords.viewAll}</span>
                </Link>
              </div>

              {savedPlans.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-muted">
                  {t.recentRecords.noPlans}
                </div>
              ) : (
                <div className="space-y-3 pt-4">
                  {savedPlans.map((plan, idx) => (
                    <div
                      key={plan.id}
                      className="p-4 rounded-xl glass-surface border border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-text-main">
                            #{idx + 1} {plan.farmerName}
                          </span>
                          <span className="px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            {plan.landSize} Cents
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted truncate max-w-xs">
                          📍 {plan.location}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          🕒 {plan.updated_at}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-text-muted">
                            {t.recentRecords.netProfit}
                          </div>
                          <div className="text-sm font-black text-emerald-700 dark:text-emerald-400" suppressHydrationWarning>
                            ₹{plan.netProfit.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/30 text-xs font-black">
                          +{plan.roi}% ROI
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <Link
                href="/fertilizer"
                className="w-full rounded-xl bg-surface hover:bg-surface/80 border border-border-light p-3 text-xs font-bold text-text-secondary hover:text-text-main transition-colors flex items-center justify-center gap-2"
              >
                <span>{isTamil ? 'அனைத்து சாகுபடி ஆவணங்களையும் பார்வையிடுக' : 'Inspect All Cultivation Plans in Fertilizer Manager'}</span>
                <ArrowUpRightIcon size={14} />
              </Link>
            </div>
          </div>

          {/* Right Column: Major Tamil Nadu Reservoirs Snapshot & Advisory */}
          <div className="rounded-2xl glass-panel p-6 border border-border-light shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div>
                  <h3 className="text-base font-black text-text-main">
                    {t.reservoirsSnapshot.title}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {t.reservoirsSnapshot.subtitle}
                  </p>
                </div>
                <Link
                  href="/reservoirs"
                  className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>{t.reservoirsSnapshot.viewAll}</span>
                </Link>
              </div>

              {/* Dam Storage Meters */}
              <div className="space-y-3.5 pt-4">
                {majorDams.map((dam) => (
                  <div
                    key={dam.name}
                    className="p-3.5 rounded-xl glass-surface border border-border-subtle space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-text-main">
                          {isTamil ? dam.tamilName : dam.name}
                        </span>
                        <span className="text-[10px] text-text-muted ml-2 font-mono" suppressHydrationWarning>
                          {dam.storageMcft.toLocaleString('en-IN')} / {dam.capacityMcft.toLocaleString('en-IN')} Mcft
                        </span>
                      </div>
                      <span className="font-black text-cyan-700 dark:text-cyan-400">
                        {dam.percent}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden border border-border-subtle">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-700"
                        style={{ width: `${dam.percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-text-muted font-medium">
                      <span>↓ {isTamil ? 'வரத்து' : 'Inflow'}: <strong>{dam.inflow} cusecs</strong></span>
                      <span>↑ {isTamil ? 'வெளியேற்றம்' : 'Outflow'}: <strong>{dam.outflow} cusecs</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agronomic Advisory Banner */}
            <div className="pt-2">
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-start gap-3 text-xs">
                <span className="text-base shrink-0 mt-0.5">🌾</span>
                <div className="space-y-1">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                    {t.advisory.item1Title}
                  </span>
                  <p className="text-text-secondary leading-relaxed text-[11px]">
                    {t.advisory.item1Desc}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
