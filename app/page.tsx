'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowUpRightIcon,
  ChevronRightIcon,
  CloudSunIcon,
} from '@/components/icons/Icons';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { fetchUserData } from '@/lib/clientUser';
import MotionAutoplayCarousel from '@/components/reactbits/MotionAutoplayCarousel';
import ScrollStack, { ScrollStackItemData } from '@/components/reactbits/ScrollStack';
import ScrollExpand from '@/components/reactbits/ScrollExpand';
import HourlyWeatherSection from '@/components/weather/HourlyWeatherSection';
import AnimatedContent from '@/components/reactbits/AnimatedContent';
import DepthCard from '@/components/reactbits/DepthCard';

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

export default function FarmLandingPage() {
  const { messages, locale } = useLanguage();
  const isTamil = locale === 'ta';
  const t = messages.dashboard;

  const [savedPlans, setSavedPlans] = useState<CultivationPlanSummary[]>([
    {
      id: '1',
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
      id: '2',
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

  const [activeConsoleTab, setActiveConsoleTab] = useState<'plans' | 'reservoirs' | 'seeds' | 'advisory'>('plans');

  const [majorDams, setMajorDams] = useState<ReservoirSnapshot[]>([
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
  ]);

  const cultivationPhases: ScrollStackItemData[] = useMemo(
    () => [
      {
        id: 'phase-1',
        eyebrow: t.scrollStack.phases.phase1.eyebrow,
        title: t.scrollStack.phases.phase1.title,
        body: t.scrollStack.phases.phase1.body,
        image: 'https://res.cloudinary.com/chk0va7a/image/upload/v1795763636/phase_1.jpg',
        accent: '#10b981',
        link: '/fertilizer',
        linkText: t.scrollStack.phases.phase1.linkText,
      },
      {
        id: 'phase-2',
        eyebrow: t.scrollStack.phases.phase2.eyebrow,
        title: t.scrollStack.phases.phase2.title,
        body: t.scrollStack.phases.phase2.body,
        image: 'https://res.cloudinary.com/chk0va7a/image/upload/v1795763634/phase_2.png',
        accent: '#8b5cf6',
        link: '/seeds',
        linkText: t.scrollStack.phases.phase2.linkText,
      },
      {
        id: 'phase-3',
        eyebrow: t.scrollStack.phases.phase3.eyebrow,
        title: t.scrollStack.phases.phase3.title,
        body: t.scrollStack.phases.phase3.body,
        image: 'https://res.cloudinary.com/chk0va7a/image/upload/v1795763632/phase_3.png',
        accent: '#06b6d4',
        link: '/fertilizer',
        linkText: t.scrollStack.phases.phase3.linkText,
      },
      {
        id: 'phase-4',
        eyebrow: t.scrollStack.phases.phase4.eyebrow,
        title: t.scrollStack.phases.phase4.title,
        body: t.scrollStack.phases.phase4.body,
        image: 'https://res.cloudinary.com/chk0va7a/image/upload/v1795773731/phase_4.jpg',
        accent: '#f59e0b',
        link: '/crop-health',
        linkText: t.scrollStack.phases.phase4.linkText,
      },
      {
        id: 'phase-5',
        eyebrow: t.scrollStack.phases.phase5.eyebrow,
        title: t.scrollStack.phases.phase5.title,
        body: t.scrollStack.phases.phase5.body,
        image: 'https://res.cloudinary.com/chk0va7a/image/upload/v1795763646/phase_5.jpg',
        accent: '#3b82f6',
        link: '/fertilizer',
        linkText: t.scrollStack.phases.phase5.linkText,
      },
    ],
    [t.scrollStack]
  );

  // 6 Core Platform Showcase Cards for the ScrollExpand Video Section
  const platformShowcaseCards = useMemo(
    () => [
      {
        id: 'card-fertilizer',
        title: t.whatWeOffer.cards.fertilizer,
        href: '/fertilizer',
        image: 'https://res.cloudinary.com/chk0va7a/image/upload/v1795758908/farm.jpg',
      },
      {
        id: 'card-crop-health',
        title: t.whatWeOffer.cards.cropHealth,
        href: '/crop-health',
        image: 'https://res.cloudinary.com/chk0va7a/image/upload/v1795773768/crop_img.jpg',
      },
      {
        id: 'card-weather',
        title: t.whatWeOffer.cards.weather,
        href: '/weather-mcp',
        image: 'https://res.cloudinary.com/chk0va7a/image/upload/v1795773757/weather.jpg',
      },
      {
        id: 'card-rainfall',
        title: t.whatWeOffer.cards.rainfall,
        href: '/rainfall',
        image: 'https://res.cloudinary.com/chk0va7a/image/upload/v1795763637/city.jpg',
      },
      {
        id: 'card-reservoirs',
        title: t.whatWeOffer.cards.reservoirs,
        href: '/reservoirs',
        image: 'https://res.cloudinary.com/chk0va7a/image/upload/v1795763642/water_dam.jpg',
      },
      {
        id: 'card-seeds',
        title: t.whatWeOffer.cards.seeds,
        href: '/seeds',
        image: 'https://res.cloudinary.com/chk0va7a/image/upload/v1795763646/seed.jpg',
      },
    ],
    [t.whatWeOffer]
  );

  // Fetch live counts from our DB APIs silently on mount
  useEffect(() => {
    let mounted = true;

    // 1. Fetch fertilizer plans count for authenticated user (deduplicated)
    fetchUserData().then((json) => {
      if (!mounted || !json) return;
      const plansList = json.plans || [];
      if (Array.isArray(plansList)) {
        const mapped: CultivationPlanSummary[] = plansList.slice(0, 2).map((item: any) => {
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
        if (mapped.length > 0) {
          setSavedPlans(mapped);
        }
      }
    })
      .catch(() => { });

    // 2. Fetch reservoirs telemetry
    fetch('/api/reservoirs')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!mounted || !json || !json.reservoirs) return;

        if (Array.isArray(json.reservoirs) && json.reservoirs.length > 0) {
          const targets = [
            { key: 'mettur', name: 'Mettur Dam (Stanley)', tamilName: 'மேட்டூர் அணை (ஸ்டான்லி)' },
            { key: 'bhavanisagar', name: 'Bhavanisagar Dam', tamilName: 'பவானிசாகர் அணை' },
            { key: 'vaigai', name: 'Vaigai Dam', tamilName: 'வைகை அணை' },
          ];
          setMajorDams((prev) =>
            targets.map((target, idx) => {
              const found = json.reservoirs.find((r: any) =>
                String(r.name || r.rawName || '').toLowerCase().includes(target.key)
              );
              if (!found) return prev[idx];
              const storageMcft = Number(found.currentStorageMcft) || 0;
              const capacityMcft = Number(found.fullCapacityMcft) || 0;
              const percent =
                typeof found.storagePercentage === 'number'
                  ? Number(found.storagePercentage.toFixed(1))
                  : capacityMcft > 0
                    ? Number(((storageMcft / capacityMcft) * 100).toFixed(1))
                    : 0;
              return {
                name: target.name,
                tamilName: target.tamilName,
                storageMcft,
                capacityMcft,
                percent,
                inflow: Number(found.currentInflowCusecs) || 0,
                outflow: Number(found.currentOutflowCusecs) || 0,
              };
            })
          );
        }
      })
      .catch(() => { });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-background text-text-main">
      {/* 1. HERO SHOWCASE: Full-Page Edge-to-Edge Autoplay Carousel with Scroll-Zoom Hero */}
      <section className="relative w-full">
        <AnimatedContent
          distance={100}
          direction="vertical"
          duration={0.8}
          ease="back.out(1.6)"
          blur={0}
          stagger={0.08}
          threshold={0.1}
          className="w-full"
        >
          <MotionAutoplayCarousel />
        </AnimatedContent>
      </section>

      {/* 2. SPLIT FEATURE SHOWCASE 1: Precision Fertilizer & Nutrient Scheduling (No image border) */}
      <section id="feature-sections" className="relative z-10 w-full py-16 sm:py-24">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedContent
            distance={100}
            direction="vertical"
            duration={0.8}
            ease="back.out(1.6)"
            blur={0}
            stagger={0.08}
            threshold={0.1}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center"
          >
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                <span>{t.features.nutrition.badge}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-text-main leading-tight">
                {t.features.nutrition.title}
              </h2>

              <p className="text-base sm:text-lg text-text-secondary leading-relaxed font-normal">
                {t.features.nutrition.desc}
              </p>

              {/* Feature Points */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-main">
                      {t.features.nutrition.stage4Title}
                    </h4>
                    <p className="text-xs text-text-secondary mt-0.5 font-medium">
                      {t.features.nutrition.stage4Desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-main">
                      {t.features.nutrition.roiTitle}
                    </h4>
                    <p className="text-xs text-text-secondary mt-0.5 font-medium">
                      {t.features.nutrition.roiDesc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Economic Pill Callout */}
              <div className="p-4 rounded-2xl glass-panel border border-emerald-500/30 bg-emerald-500/[0.04] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                    {t.features.nutrition.sampleReturnLabel}
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {t.features.nutrition.sampleReturnVal}
                  </div>
                </div>
                <Link
                  href="/fertilizer"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white !text-white font-bold text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-white !text-white">{t.features.nutrition.calculatePlanBtn}</span>
                  <ArrowUpRightIcon size={14} className="text-white !text-white" />
                </Link>
              </div>
            </div>

            {/* Right Visual Image Showcase (No white border) */}
            <div className="lg:col-span-6 relative">
              <DepthCard
                image="https://res.cloudinary.com/chk0va7a/image/upload/v1795763643/plant.jpg"
                alt="Crop Plant Nutrition"
                className="shadow-2xl aspect-[4/3]"
                spotlightColor="rgba(16, 185, 129, 0.28)"
                maxRotation={1}
                maxTranslation={12}
              >
                {/* Floating Telemetry Glass Card Overlay (keep-white ensures pure white text in both themes) */}
                <div className="keep-white w-full p-4 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 text-white shadow-2xl">
                  <div className="flex items-center justify-between pb-2 border-b border-white/15">
                    <span className="keep-white text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      {t.features.nutrition.scheduleBadge}
                    </span>
                    <span className="keep-white text-[10px] font-mono text-white/80">
                      {t.features.nutrition.verifiedProtocol}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div>
                      <span className="keep-white text-white/70 text-[10px] block">
                        {t.features.nutrition.basalMixLabel}
                      </span>
                      <span className="keep-white font-bold text-white">
                        {t.features.nutrition.basalMixVal}
                      </span>
                    </div>
                    <div>
                      <span className="keep-white text-white/70 text-[10px] block">
                        {t.features.nutrition.boostLabel}
                      </span>
                      <span className="keep-white font-bold text-white">
                        {t.features.nutrition.boostVal}
                      </span>
                    </div>
                  </div>
                </div>
              </DepthCard>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* 5. SPLIT FEATURE SHOWCASE 2: Real-time Basin Hydrology & Dam Telemetry (No border-y, no image border) */}
      <section className="relative z-10 w-full py-16 sm:py-24 bg-surface/30">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedContent
            distance={100}
            direction="vertical"
            duration={0.8}
            ease="back.out(1.6)"
            blur={0}
            stagger={0.08}
            threshold={0.1}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center"
          >
            {/* Left Visual Column (No white border) */}
            <div className="lg:col-span-6 order-2 lg:order-1 relative">
              <DepthCard
                image="https://res.cloudinary.com/chk0va7a/image/upload/v1795763642/water_dam.jpg"
                alt="Dam Hydrology and Water Storage"
                className="shadow-2xl aspect-[4/3]"
                spotlightColor="rgba(6, 182, 212, 0.28)"
                maxRotation={1}
                maxTranslation={12}
              >
                {/* Floating Dam Meters (keep-white ensures pure white text in both themes) */}
                <div className="keep-white w-full p-4 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 text-white shadow-2xl space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-white/15 text-xs">
                    <span className="keep-white font-bold text-cyan-400 uppercase tracking-wider">
                      {t.features.hydrology.telemetryBadge}
                    </span>
                    <span className="keep-white text-[10px] font-mono text-cyan-200">
                      {t.features.hydrology.stateDamsFill}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="keep-white text-white/90">
                        {t.features.hydrology.metturLabel}
                      </span>
                      <span className="keep-white font-mono font-bold text-cyan-300">59,450 Mcft (63.6%)</span>
                    </div>
                    <div className="w-full bg-white/15 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-cyan-400 h-full rounded-full" style={{ width: '63.6%' }} />
                    </div>
                  </div>
                </div>
              </DepthCard>
            </div>

            {/* Right Content Column */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                <span>{t.features.hydrology.badge}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-text-main leading-tight">
                {t.features.hydrology.title}
              </h2>

              <p className="text-base sm:text-lg text-text-secondary leading-relaxed font-normal">
                {t.features.hydrology.desc}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-2xl glass-surface border border-border-light">
                  <div className="text-xs text-text-muted font-bold uppercase tracking-wider">
                    {t.features.hydrology.inflowLabel}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-cyan-700 dark:text-cyan-400 mt-1 font-mono">
                    8,420 <span className="text-xs font-normal">cusecs</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl glass-surface border border-border-light">
                  <div className="text-xs text-text-muted font-bold uppercase tracking-wider">
                    {t.features.hydrology.outflowLabel}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-text-main mt-1 font-mono">
                    6,500 <span className="text-xs font-normal">cusecs</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/reservoirs"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white !text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
                >
                  <span className="text-white !text-white">{t.features.hydrology.viewReservoirsBtn}</span>
                  <ChevronRightIcon size={15} className="text-white !text-white" />
                </Link>
              </div>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* 6. SPLIT FEATURE SHOWCASE 3: Certified Seeds & Market Discovery (No image border) */}
      <section className="relative z-10 w-full py-16 sm:py-24">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedContent
            distance={100}
            direction="vertical"
            duration={0.8}
            ease="back.out(1.6)"
            blur={0}
            stagger={0.08}
            threshold={0.1}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center"
          >
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30">
                <span>{t.features.cultivars.badge}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-text-main leading-tight">
                {t.features.cultivars.title}
              </h2>

              <p className="text-base sm:text-lg text-text-secondary leading-relaxed font-normal">
                {t.features.cultivars.desc}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl glass-surface border border-purple-500/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400 block">
                    {t.features.cultivars.seed1Name}
                  </span>
                  <div className="text-xl font-black text-text-main mt-1">{t.features.cultivars.seed1Price}</div>
                </div>
                <div className="p-3.5 rounded-2xl glass-surface border border-purple-500/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400 block">
                    {t.features.cultivars.seed2Name}
                  </span>
                  <div className="text-xl font-black text-text-main mt-1">{t.features.cultivars.seed2Price}</div>
                </div>
                <div className="p-3.5 rounded-2xl glass-surface border border-purple-500/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400 block">
                    {t.features.cultivars.seed3Name}
                  </span>
                  <div className="text-xl font-black text-text-main mt-1">{t.features.cultivars.seed3Price}</div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/seeds"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
                >
                  <span>{t.features.cultivars.exploreCatalogBtn}</span>
                  <ChevronRightIcon size={15} />
                </Link>
              </div>
            </div>

            {/* Right Visual Column (No white border) */}
            <div className="lg:col-span-6 relative">
              <DepthCard
                image="https://res.cloudinary.com/chk0va7a/image/upload/v1795763646/seed.jpg"
                alt="Certified Seeds Agriculture"
                className="shadow-2xl aspect-[4/3]"
                spotlightColor="rgba(168, 85, 247, 0.28)"
                maxRotation={1}
                maxTranslation={12}
              >
                {/* Floating Seed Badge (keep-white ensures pure white text in both themes) */}
                <div className="keep-white w-full p-4 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 text-white shadow-2xl flex items-center justify-between">
                  <div>
                    <span className="keep-white text-xs font-bold text-purple-300 uppercase tracking-wider block">
                      {t.features.cultivars.breederBadge}
                    </span>
                    <span className="keep-white text-sm font-semibold text-white">
                      {t.features.cultivars.varietiesSubtitle}
                    </span>
                  </div>
                  <span className="keep-white px-3 py-1 rounded-full bg-purple-500/30 border border-purple-400/40 text-xs font-bold text-white">
                    {t.features.cultivars.officialRates}
                  </span>
                </div>
              </DepthCard>
            </div>
          </AnimatedContent>
        </div>
      </section>

      {/* 24-HOUR PRECISION WEATHER HORIZON (Village / City or Tenkasi District) */}
      <HourlyWeatherSection isTamil={isTamil} />

      {/* 7. 5-PHASE CULTIVATION WORKFLOW ARCHITECTURE: React Bits Scroll Stack */}
      <section id="lifecycle-scroll-stack" className="relative z-10 w-full py-16 sm:py-24 bg-surface/40 overflow-visible">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12 overflow-visible">
          <AnimatedContent
            distance={120}
            direction="vertical"
            duration={1.1}
            ease="expo.out"
            blur={0}
            stagger={0.08}
            threshold={0.1}
            className="text-center max-w-3xl mx-auto space-y-3"
          >
            <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">
              {t.scrollStack.eyebrow}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-text-main">
              {t.scrollStack.title}
            </h2>
            <p className="text-sm sm:text-base text-text-secondary font-normal">
              {t.scrollStack.subtitle}
            </p>
          </AnimatedContent>

          <ScrollStack
            items={cultivationPhases}
            itemDistance={160}
            itemScale={0.04}
            itemStackDistance={0}
            baseScale={0.93}
            blurAmount={3.5}
            fadeAmount={0.92}
            stackPosition={96}
            useWindowScroll={true}
            isTamil={isTamil}
          />
        </div>
      </section>

      {/* 7.5. CINEMATIC SCROLL-EXPAND SHOWCASE: What We Offer - 6 Key Capabilities in a Single Row */}
      <section className="relative z-10 w-full overflow-visible">
        <ScrollExpand
          src="https://res.cloudinary.com/chk0va7a/video/upload/f_auto,q_auto/v1795760517/young_plant.mp4"
          poster="https://res.cloudinary.com/chk0va7a/video/upload/so_0,f_auto,q_auto/v1795760517/young_plant.jpg"
          mediaType="video"
          title={t.whatWeOffer.title}
          tractor={
            <img
              src="/icons/animated/tractor.gif"
              alt="Tractor animated icons created by Magnific - Flaticon"
              title="Tractor animated icons created by Magnific - Flaticon"
              className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 object-contain drop-shadow-[0_8px_30px_rgba(0,0,0,0.7)] pointer-events-none select-none"
            />
          }
          explosion={
            <img
              src="/icons/animated/explosion.gif"
              alt="Explosion animated icons created by Magnific - Flaticon"
              title="Explosion animated icons created by Magnific - Flaticon"
              className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 object-contain drop-shadow-[0_0_40px_rgba(253,143,1,0.9)] pointer-events-none select-none"
            />
          }
          scrollHint={t.whatWeOffer.scrollHint}
          startWidth={42}
          startHeight={58}
          startRadius={24}
          endRadius={0}
          mediaZoom={1.35}
          scrollDistance={1.2}
          holdDistance={0.4}
          smoothing={0.1}
          overlayScrim={0.55}
          useWindowScroll={true}
          enabled={true}
        >
          <div className="w-full max-w-[1880px] mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-7">
            {/* Screenshot Header: WHAT WE OFFER + Subtitle with AnimatedContent */}
            <AnimatedContent
              distance={100}
              direction="vertical"
              duration={1.2}
              ease="elastic.out(1, 0.55)"
              blur={0}
              stagger={0.08}
              threshold={0.1}
              className="text-center mb-4 sm:mb-5 lg:mb-6 space-y-1.5 sm:space-y-2 select-none"
            >
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black uppercase tracking-wider text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)]">
                {t.whatWeOffer.title}
              </h2>
              <p className="text-xs sm:text-sm lg:text-base text-white/90 font-medium drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] max-w-2xl mx-auto">
                {t.whatWeOffer.subtitle}
              </p>
            </AnimatedContent>

            {/* 6 Cards Single Row with AnimatedContent */}
            <AnimatedContent
              distance={100}
              direction="vertical"
              duration={1.2}
              ease="elastic.out(1, 0.55)"
              blur={0}
              stagger={0.08}
              threshold={0.1}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-4 items-stretch justify-center w-full"
            >
              {platformShowcaseCards.map((card) => (
                <Link
                  key={card.id}
                  href={card.href}
                  className="group relative h-[215px] sm:h-[245px] lg:h-[270px] xl:h-[290px] rounded-3xl overflow-hidden border border-white/20 bg-slate-900/60 shadow-2xl transition-all duration-300 hover:scale-[1.03] hover:border-emerald-400/80 hover:shadow-[0_0_35px_rgba(16,185,129,0.35)] block"
                >
                  {/* Card Background Image */}
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  />

                  {/* Gradient Scrim - Always visible so title is clearly legible against any image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent transition-opacity duration-300 pointer-events-none" />

                  {/* Card Content: Title is always visible initially; Explore button expands on hover */}
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-3.5 sm:p-4 text-center pointer-events-none">
                    {/* Title: ALWAYS visible initially */}
                    <span className="text-xs sm:text-sm lg:text-[14px] xl:text-[15px] font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] leading-snug transition-transform duration-300">
                      {card.title}
                    </span>

                    {/* Explore Action Badge: Hidden initially, smoothly expands and appears on hover */}
                    <div className="overflow-hidden transition-all duration-300 max-h-0 opacity-0 group-hover:max-h-12 group-hover:opacity-100 group-hover:mt-2.5">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/90 hover:bg-emerald-500 text-white font-bold text-[10px] sm:text-[11px] tracking-wider uppercase shadow-lg shadow-emerald-500/25 transition-all pointer-events-auto">
                        <span>{t.whatWeOffer.explore}</span>
                        <span className="text-xs font-bold">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </AnimatedContent>
          </div>
        </ScrollExpand>
      </section>

      {/* 8. INTERACTIVE LIVE OPERATIONS CONSOLE (Luxex / Evntly Interactive Tabbed Preview) */}
      <section className="relative z-10 w-full py-16 sm:py-24">
        <AnimatedContent
          distance={100}
          direction="vertical"
          duration={0.8}
          ease="back.out(1.6)"
          blur={0}
          threshold={0.1}
          className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8"
        >
          <AnimatedContent
            distance={50}
            direction="vertical"
            duration={1.2}
            ease="back.out(1.6)"
            blur={0}
            stagger={0.08}
            threshold={0.1}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
          >
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                {t.operationsConsole.badge}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-text-main mt-1">
                {t.operationsConsole.title}
              </h2>
            </div>

            {/* Interactive Tab Selector Buttons */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl glass-surface border border-border-light self-start sm:self-auto overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveConsoleTab('plans')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeConsoleTab === 'plans'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-text-secondary hover:text-text-main'
                  }`}
              >
                {t.operationsConsole.activePlans}
              </button>
              <button
                type="button"
                onClick={() => setActiveConsoleTab('reservoirs')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeConsoleTab === 'reservoirs'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-text-secondary hover:text-text-main'
                  }`}
              >
                {t.operationsConsole.damsHydrology}
              </button>
              <button
                type="button"
                onClick={() => setActiveConsoleTab('seeds')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeConsoleTab === 'seeds'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-text-secondary hover:text-text-main'
                  }`}
              >
                {t.operationsConsole.seedIndex}
              </button>
              <button
                type="button"
                onClick={() => setActiveConsoleTab('advisory')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${activeConsoleTab === 'advisory'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-text-secondary hover:text-text-main'
                  }`}
              >
                {t.operationsConsole.agronomicAdvisory}
              </button>
            </div>
          </AnimatedContent>

          {/* Tab Content 1: Active Plans */}
          {activeConsoleTab === 'plans' && (
            <AnimatedContent
              key={`tab-plans-${savedPlans.length}`}
              distance={120}
              direction="vertical"
              duration={1.4}
              ease="elastic.out(1, 0.55)"
              blur={0}
              stagger={0.08}
              threshold={0.1}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"
            >
              {savedPlans.slice(0, 2).map((plan, idx) => (
                <div
                  key={plan.id}
                  className="h-full p-6 rounded-3xl glass-panel shadow-xl flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-colors duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          #{idx + 1}
                        </span>
                        <h4 className="text-base font-black text-text-main">{plan.farmerName}</h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/30">
                        {plan.landSize} {messages.common.cents}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-text-secondary font-medium">
                      <p className="truncate">📍 {plan.location}</p>
                      <p className="text-text-muted">🕒 {plan.updated_at}</p>
                    </div>

                    <div className="p-3 rounded-2xl glass-surface border border-border-subtle grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-text-muted block font-semibold">
                          {t.operationsConsole.outlayCost}
                        </span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">₹{plan.grandTotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted block font-semibold">
                          {t.operationsConsole.netProfit}
                        </span>
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-400">₹{plan.netProfit.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/fertilizer"
                    className="w-full py-2.5 rounded-xl bg-surface hover:bg-surface/80 border border-border-light text-xs font-bold text-center text-text-secondary hover:text-text-main transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>{t.operationsConsole.viewDossier}</span>
                    <ArrowUpRightIcon size={14} />
                  </Link>
                </div>
              ))}

              {/* Add New Plan CTA Card (Styled cleanly for both light and dark themes) */}
              <div className="h-full rounded-3xl border-2 border-dashed border-emerald-500/35 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] flex flex-col justify-between items-center text-center space-y-4 p-6 shadow-sm hover:border-emerald-500/60 transition-colors">
                <div className="flex flex-col items-center space-y-3 pt-2">
                  <span className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xl font-bold">
                    ➕
                  </span>
                  <div>
                    <h4 className="text-base font-black text-text-main">
                      {t.operationsConsole.createNewPlan}
                    </h4>
                    <p className="text-xs text-text-secondary mt-1.5 max-w-xs font-medium leading-relaxed">
                      {t.operationsConsole.createNewPlanDesc}
                    </p>
                  </div>
                </div>
                <Link
                  href="/fertilizer"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white !text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="text-white !text-white">{t.operationsConsole.launchCalculator}</span>
                  <ArrowUpRightIcon size={14} className="text-white !text-white" />
                </Link>
              </div>
            </AnimatedContent>
          )}

          {/* Tab Content 2: Dam Hydrology */}
          {activeConsoleTab === 'reservoirs' && (
            <AnimatedContent
              key="tab-reservoirs"
              distance={120}
              direction="vertical"
              duration={1.4}
              ease="elastic.out(1, 0.55)"
              blur={0}
              stagger={0.08}
              threshold={0.1}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {majorDams.map((dam) => (
                <div
                  key={dam.name}
                  className="p-6 rounded-3xl glass-panel shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-text-main">
                      {locale === 'ta' ? dam.tamilName : dam.name}
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 text-xs font-black border border-cyan-500/30">
                      {dam.percent}%
                    </span>
                  </div>

                  <div className="w-full bg-black/15 dark:bg-black/30 rounded-full h-2.5 overflow-hidden border border-border-subtle">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-700"
                      style={{ width: `${dam.percent}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl glass-surface border border-border-subtle">
                      <span className="text-[10px] text-text-muted block font-semibold">{t.operationsConsole.inflow}</span>
                      <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">{dam.inflow.toLocaleString('en-IN')} cusecs</span>
                    </div>
                    <div className="p-2.5 rounded-xl glass-surface border border-border-subtle">
                      <span className="text-[10px] text-text-muted block font-semibold">{t.operationsConsole.outflow}</span>
                      <span className="font-mono font-bold text-text-main">{dam.outflow.toLocaleString('en-IN')} cusecs</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-text-muted font-mono pt-1 text-center font-semibold">
                    {t.operationsConsole.storage} {dam.storageMcft.toLocaleString('en-IN')} / {dam.capacityMcft.toLocaleString('en-IN')} Mcft
                  </div>
                </div>
              ))}
            </AnimatedContent>
          )}

          {/* Tab Content 3: Seed Market Index */}
          {activeConsoleTab === 'seeds' && (
            <AnimatedContent
              key="tab-seeds"
              distance={120}
              direction="vertical"
              duration={1.4}
              ease="elastic.out(1, 0.55)"
              blur={0}
              stagger={0.08}
              threshold={0.1}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {[
                { name: t.operationsConsole.seedADT43Name, type: t.operationsConsole.seedADT43Type, price: t.operationsConsole.seedADT43Price, season: t.operationsConsole.seedADT43Season },
                { name: t.operationsConsole.seedCR1009Name, type: t.operationsConsole.seedCR1009Type, price: t.operationsConsole.seedCR1009Price, season: t.operationsConsole.seedCR1009Season },
                { name: t.operationsConsole.seedCO51Name, type: t.operationsConsole.seedCO51Type, price: t.operationsConsole.seedCO51Price, season: t.operationsConsole.seedCO51Season },
                { name: t.operationsConsole.seedVBN8Name, type: t.operationsConsole.seedVBN8Type, price: t.operationsConsole.seedVBN8Price, season: t.operationsConsole.seedVBN8Season },
              ].map((seed, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-3xl glass-panel shadow-xl space-y-3"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 block">
                    {seed.type}
                  </span>
                  <h4 className="text-sm font-black text-text-main">{seed.name}</h4>
                  <div className="text-xl font-black text-purple-700 dark:text-purple-400 font-mono">
                    {seed.price}
                  </div>
                  <span className="inline-block px-2.5 py-0.5 rounded-md glass-surface text-[10px] font-semibold text-text-secondary border border-border-subtle">
                    {seed.season}
                  </span>
                </div>
              ))}
            </AnimatedContent>
          )}

          {/* Tab Content 4: Agronomic Advisory */}
          {activeConsoleTab === 'advisory' && (
            <AnimatedContent
              key="tab-advisory"
              distance={120}
              direction="vertical"
              duration={1.4}
              ease="elastic.out(1, 0.55)"
              blur={0}
              stagger={0.08}
              threshold={0.1}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="p-6 rounded-3xl glass-panel border border-emerald-500/30 bg-emerald-500/[0.04] space-y-3">
                <span className="text-2xl">🌾</span>
                <h4 className="text-base font-black text-text-main">{t.advisory.item1Title}</h4>
                <p className="text-xs text-text-secondary leading-relaxed font-normal">{t.advisory.item1Desc}</p>
              </div>
              <div className="p-6 rounded-3xl glass-panel border border-cyan-500/30 bg-cyan-500/[0.04] space-y-3">
                <span className="text-2xl">💧</span>
                <h4 className="text-base font-black text-text-main">{t.advisory.item2Title}</h4>
                <p className="text-xs text-text-secondary leading-relaxed font-normal">{t.advisory.item2Desc}</p>
              </div>
            </AnimatedContent>
          )}
        </AnimatedContent>
      </section>

      {/* 9. PANORAMIC LUXURY CTA BANNER (keep-white ensures pure white text & no white border) */}
      <section className="relative z-10 w-full py-16 sm:py-24">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden p-8 sm:p-14 lg:p-20 shadow-2xl">
            {/* Background Image */}
            <Image
              src="https://res.cloudinary.com/chk0va7a/image/upload/v1795763633/pexels-mazhar-arslanoglu-706220627-38389252.jpg"
              alt="Agricultural Horizon"
              fill
              className="object-cover object-center"
              sizes="100vw"
            />
            {/* Dark gradient overlay for high contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-950/50" />

            {/* Content: keep-white guarantees high-contrast white typography in both light & dark themes */}
            <AnimatedContent
              distance={120}
              direction="vertical"
              duration={1.4}
              ease="elastic.out(1, 0.55)"
              blur={0}
              stagger={0.08}
              threshold={0.1}
              delay={0.4}
              className="keep-white relative z-10 max-w-2xl space-y-6 text-white"
            >
              <span className="keep-white inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
                {t.ctaBanner.badge}
              </span>
              <h2 className="keep-white text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.85)]">
                {t.ctaBanner.title}
              </h2>
              <p className="keep-white text-base sm:text-lg text-white/90 font-light leading-relaxed">
                {t.ctaBanner.subtitle}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/fertilizer"
                  className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white !text-white font-bold text-sm shadow-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <span className="text-white !text-white">{t.ctaBanner.button}</span>
                  <ArrowUpRightIcon size={16} className="text-white !text-white" />
                </Link>
                <Link
                  href="/weather-mcp"
                  className="keep-white px-6 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm backdrop-blur-md border border-white/30 shadow-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <span className="keep-white">{t.ctaBanner.weather}</span>
                  <CloudSunIcon size={16} className="keep-white text-white" />
                </Link>
              </div>
            </AnimatedContent>
          </div>
        </div>
      </section>
    </div>
  );
}
