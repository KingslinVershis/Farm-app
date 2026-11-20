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
import MotionAutoplayCarousel from '@/components/reactbits/MotionAutoplayCarousel';
import ScrollStack, { ScrollStackItemData } from '@/components/reactbits/ScrollStack';

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
        eyebrow: isTamil ? 'நிலை 01 // நாட்கள் 1 – 20' : 'PHASE 01 // DAYS 1 – 20',
        title: isTamil ? 'உழவு & மண்வள தயாரிப்பு' : 'Land Tillage & Soil Baseline Preparation',
        body: isTamil
          ? 'டிராக்டர் ஆரம்ப உழவு, சேற்றுழவு, வரப்பு செப்பனிடுதல் மற்றும் மண்ணின் தன்மைக்கேற்ற இயற்கை எரு இடுதல் மூலம் ஊட்டச்சத்து சமநிலையை உருவாக்குதல்.'
          : 'Tractor primary plowing, secondary puddling, bund trimming, and baseline organic manure allocation tailored to soil texture and moisture.',
        image: '/images/phase_1.jpg',
        accent: '#10b981',
        link: '/fertilizer',
        linkText: isTamil ? 'அடி உர திட்டம் காண்க →' : 'Explore Basal Protocols →',
      },
      {
        id: 'phase-2',
        eyebrow: isTamil ? 'நிலை 02 // நாட்கள் 21 – 40' : 'PHASE 02 // DAYS 21 – 40',
        title: isTamil ? 'சான்றளிக்கப்பட்ட விதை தேர்வு & நாற்றங்கால்' : 'Certified Seed Sowing & Nursery Care',
        body: isTamil
          ? 'பருவத்திற்கேற்ற உயர் விளைச்சல் சான்றளிக்கப்பட்ட விதை தேர்வு, பூஞ்சாண விதை நேர்த்தி மற்றும் முறையான இடைவெளியுடன் நாற்றங்கால் பாசன பராமரிப்பு.'
          : 'Sowing high-germination certified TNAU cultivars with bio-fertilizer seed priming, calibrated nursery spacing, and seedling vitality monitoring.',
        image: '/images/phase_2.png',
        accent: '#8b5cf6',
        link: '/seeds',
        linkText: isTamil ? 'விதை அட்டவணையை காண்க →' : 'Explore Seed Varieties →',
      },
      {
        id: 'phase-3',
        eyebrow: isTamil ? 'நிலை 03 // நாட்கள் 41 – 65' : 'PHASE 03 // DAYS 41 – 65',
        title: isTamil ? 'தூர் கட்டும் பருவம் & துல்லிய ஊட்டச்சத்து மேலாண்மை' : 'Vegetative Tiller Boost & Nutrient Fertigation',
        body: isTamil
          ? 'அதிக மகசூல் தரும் தூர்கள் உருவாக தழை, மணி, சாம்பல் சத்துக்கள் மற்றும் நுண்ணூட்டக் கலவைகளை அணை நீர் பாசனத்துடன் திட்டமிட்டு செலுத்துதல்.'
          : 'Scheduled N-P-K micro-nutrient delivery and primary top-dressing synchronized with canal releases, rainfall patterns, and crop growth stage.',
        image: '/images/phase_3.png',
        accent: '#06b6d4',
        link: '/fertilizer',
        linkText: isTamil ? 'ஊட்டச்சத்து அட்டவணை →' : 'View Nutrition Schedule →',
      },
      {
        id: 'phase-4',
        eyebrow: isTamil ? 'நிலை 04 // நாட்கள் 66 – 90' : 'PHASE 04 // DAYS 66 – 90',
        title: isTamil ? 'கதிர் உருவாவதும் & துல்லிய பயிர் பாதுகாப்பும்' : 'Panicle Initiation & Precision Crop Health',
        body: isTamil
          ? 'குருத்துப்பூச்சி, இலைக்கருகல் தடுப்பு தெளிப்புகள், பொட்டாஷ் மேலுரம் மற்றும் மணி பால் பிடிக்கும் பருவத்தில் நின்ற நீர் பராமரிப்பு மேலாண்மை.'
          : 'Targeted bio-pest mitigation for stem borer and blast, balanced potash nourishment, and standing water calibration for optimal grain setting.',
        image: '/images/phase_4.jpg',
        accent: '#f59e0b',
        link: '/crop-health',
        linkText: isTamil ? 'பயிர் நலம் காண்க →' : 'Inspect Crop Health →',
      },
      {
        id: 'phase-5',
        eyebrow: isTamil ? 'நிலை 05 // நாட்கள் 91 – 120' : 'PHASE 05 // DAYS 91 – 120',
        title: isTamil ? 'இயந்திர அறுவடை & மண்டி நேரடி கொள்முதல்' : 'Predictive Combine Harvest & Mandi Sale',
        body: isTamil
          ? 'சரியான மணி ஈரப்பதத்தில் ஒருங்கிணைந்த அறுவடை இயந்திரம் மூலம் அறுவடை செய்து அரசு கொள்முதல் நிலையங்கள் மற்றும் மண்டிகளில் அதிக விலைக்கு விற்பனை.'
          : 'Combine harvester mobilization at optimal grain moisture to minimize shattering loss and secure peak Mandi MSP market realization.',
        image: '/images/phase_5.jpg',
        accent: '#3b82f6',
        link: '/fertilizer',
        linkText: isTamil ? 'சாகுபடி திட்டத்தை தொடங்கு →' : 'Calculate Your Plan →',
      },
    ],
    [isTamil]
  );

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
      .catch(() => {});

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
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-background text-text-main">
      {/* 1. HERO SHOWCASE: Full-Page Edge-to-Edge Autoplay Carousel with Scroll-Zoom Hero */}
      <section className="relative w-full">
        <MotionAutoplayCarousel />
      </section>

      {/* 2. SPLIT FEATURE SHOWCASE 1: Precision Fertilizer & Nutrient Scheduling (No image border) */}
      <section id="feature-sections" className="relative z-10 w-full py-16 sm:py-24">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Content Column */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                <span>01 // NUTRITION INTELLIGENCE</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-text-main leading-tight">
                {isTamil
                  ? 'விஞ்ஞானபூர்வ உர அட்டவணை மற்றும் சாகுபடி செலவு பகுப்பாய்வு'
                  : 'Scientifically Engineered Nutrient Schedules for Peak Mandi Realization'}
              </h2>

              <p className="text-base sm:text-lg text-text-secondary leading-relaxed font-normal">
                {isTamil
                  ? 'பயிர் வளர்ச்சிக்கு ஏற்ப 4 நிலைகளில் (அடி உரம், தூர் கட்டும் பருவம், கதிர் உருவாகும் நிலை, பூக்கும் பருவம்) உரங்களை துல்லியமாக திட்டமிட்டு, உரச் செலவை குறைத்து லாபத்தை பன்மடங்காக்குங்கள்.'
                  : 'Eliminate chemical waste and supercharge crop margins. Our precision agronomy engine calculates balanced N-P-K dosages across 4 distinct vegetative phases alongside tractor tillage, seed, and harvester machine costs.'}
              </p>

              {/* Feature Points */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-main">
                      {isTamil ? '4 நிலைகளில் ஊட்டச்சத்து மேலாண்மை' : '4-Stage Nutrient Breakdown'}
                    </h4>
                    <p className="text-xs text-text-secondary mt-0.5 font-medium">
                      {isTamil
                        ? 'அடி உரம், முதல் மேலுரம், இரண்டாம் மேலுரம், மற்றும் கதிர் பருவ ஊட்டச்சத்துக்கள்'
                        : 'Basal application, primary vegetative boost, panicle initiation, and flowering nourishment'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-main">
                      {isTamil ? 'உற்பத்தி செலவு vs மண்டி வருவாய்' : 'Rigorous Economic ROI Benchmarks'}
                    </h4>
                    <p className="text-xs text-text-secondary mt-0.5 font-medium">
                      {isTamil
                        ? 'உழவு, களைக்கொல்லி, தெளிப்பு மற்றும் அறுவடை இயந்திர செலவுகளின் துல்லிய கணக்கீடு'
                        : 'Comprehensive tally of plowing, puddling, weed control, and combine harvester operations'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Economic Pill Callout */}
              <div className="p-4 rounded-2xl glass-panel border border-emerald-500/30 bg-emerald-500/[0.04] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                    {isTamil ? 'மாதிரி சாகுபடி வருமானம் (100 சென்ட்)' : 'Sample Cultivation Return (100 Cents)'}
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                    ₹1,86,550
                  </div>
                </div>
                <Link
                  href="/fertilizer"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{isTamil ? 'புதிய திட்டம் உருவாக்க' : 'Calculate Custom Plan'}</span>
                  <ArrowUpRightIcon size={14} />
                </Link>
              </div>
            </motion.div>

            {/* Right Visual Image Showcase (No white border) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6 relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] group">
                <Image
                  src="/images/plant.jpg"
                  alt="Crop Plant Nutrition"
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Floating Telemetry Glass Card Overlay (keep-white ensures pure white text in both themes) */}
                <div className="keep-white absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/15 text-white shadow-2xl">
                  <div className="flex items-center justify-between pb-2 border-b border-white/15">
                    <span className="keep-white text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Fertilizer Phase Schedule
                    </span>
                    <span className="keep-white text-[10px] font-mono text-white/80">Verified Protocol</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div>
                      <span className="keep-white text-white/70 text-[10px] block">Basal Mix:</span>
                      <span className="keep-white font-bold text-white">DAP 50kg + MOP 25kg</span>
                    </div>
                    <div>
                      <span className="keep-white text-white/70 text-[10px] block">Vegetative Boost:</span>
                      <span className="keep-white font-bold text-white">Urea 35kg + Micronutrients</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. SPLIT FEATURE SHOWCASE 2: Real-time Basin Hydrology & Dam Telemetry (No border-y, no image border) */}
      <section className="relative z-10 w-full py-16 sm:py-24 bg-surface/30">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Visual Column (No white border) */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6 order-2 lg:order-1 relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] group">
                <Image
                  src="/images/water_dam.jpeg"
                  alt="Dam Hydrology and Water Storage"
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                {/* Floating Dam Meters (keep-white ensures pure white text in both themes) */}
                <div className="keep-white absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/15 text-white shadow-2xl space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-white/15 text-xs">
                    <span className="keep-white font-bold text-cyan-400 uppercase tracking-wider">
                      Live Catchment Basin Telemetry
                    </span>
                    <span className="keep-white text-[10px] font-mono text-cyan-200">State Dams: 55.4%</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="keep-white text-white/90">Mettur (Stanley)</span>
                      <span className="keep-white font-mono font-bold text-cyan-300">59,450 Mcft (63.6%)</span>
                    </div>
                    <div className="w-full bg-white/15 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-cyan-400 h-full rounded-full" style={{ width: '63.6%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Content Column */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6 order-1 lg:order-2 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">
                <span>02 // BASIN HYDROLOGY</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-text-main leading-tight">
                {isTamil
                  ? 'தமிழ்நாட்டின் முக்கிய அணைகளின் நேரடி நீர் இருப்பு மற்றும் வரத்து'
                  : 'State-Wide Reservoir Catchment Intelligence & Canal Outflow'}
              </h2>

              <p className="text-base sm:text-lg text-text-secondary leading-relaxed font-normal">
                {isTamil
                  ? 'மேட்டூர், பவானிசாகர், வைகை உள்ளிட்ட தமிழ்நாட்டின் முக்கிய அணைகளின் நீர்மட்டம், தினசரி நீர்வரத்து மற்றும் பாசன வெளியேற்றங்களை நேரலையாக கண்காணித்து பாசன திட்டங்களை வகுக்கலாம்.'
                  : 'Water security is crop security. Gain real-time visibility into major reservoirs across the Cauvery, Bhavani, and Vaigai river basins with live cusecs flow tracking to schedule optimal irrigation cycles.'}
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-2xl glass-surface border border-border-light">
                  <div className="text-xs text-text-muted font-bold uppercase tracking-wider">
                    {isTamil ? 'மேட்டூர் அணை நீர்வரத்து' : 'Mettur Basin Inflow'}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-cyan-700 dark:text-cyan-400 mt-1 font-mono">
                    8,420 <span className="text-xs font-normal">cusecs</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl glass-surface border border-border-light">
                  <div className="text-xs text-text-muted font-bold uppercase tracking-wider">
                    {isTamil ? 'பாசன வெளியேற்றம்' : 'Irrigation Outflow'}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-text-main mt-1 font-mono">
                    6,500 <span className="text-xs font-normal">cusecs</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/reservoirs"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
                >
                  <span>{isTamil ? 'அனைத்து அணைகளையும் காண்க' : 'Open Reservoirs Telemetry Console'}</span>
                  <ChevronRightIcon size={15} />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 6. SPLIT FEATURE SHOWCASE 3: Certified Seeds & Market Discovery (No image border) */}
      <section className="relative z-10 w-full py-16 sm:py-24">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Content Column */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6 space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30">
                <span>03 // CERTIFIED CULTIVARS</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-text-main leading-tight">
                {isTamil
                  ? 'TNAU சான்றளிக்கப்பட்ட விதை வகைகள் மற்றும் சந்தை விலைகள்'
                  : 'Official TNAU Certified Seed Varieties & Government Benchmark Rates'}
              </h2>

              <p className="text-base sm:text-lg text-text-secondary leading-relaxed font-normal">
                {isTamil
                  ? 'தமிழ்நாடு வேளாண்மைப் பல்கலைக்கழகத்தால் வெளியிடப்பட்ட ADT 43, CR 1009 Sub 1, CO 51 உள்ளிட்ட நெல், பயறு, எண்ணெய்வித்து மற்றும் காய்கறி விதைகளின் அதிகாரப்பூர்வ விலைகளை அறிந்து கொள்ளலாம்.'
                  : 'Direct access to official Tamil Nadu Agricultural University seed inventory. Discover certified breeder rates across short, medium, and long-duration paddy, pulses, and vegetables with seasonal suitability tags.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl glass-surface border border-purple-500/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400 block">
                    ADT 43 (Medium)
                  </span>
                  <div className="text-xl font-black text-text-main mt-1">₹42.50<span className="text-xs font-normal">/kg</span></div>
                </div>
                <div className="p-3.5 rounded-2xl glass-surface border border-purple-500/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400 block">
                    CR 1009 Sub 1
                  </span>
                  <div className="text-xl font-black text-text-main mt-1">₹44.00<span className="text-xs font-normal">/kg</span></div>
                </div>
                <div className="p-3.5 rounded-2xl glass-surface border border-purple-500/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400 block">
                    CO 51 (Short 105d)
                  </span>
                  <div className="text-xl font-black text-text-main mt-1">₹46.50<span className="text-xs font-normal">/kg</span></div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/seeds"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
                >
                  <span>{isTamil ? 'விதை அட்டவணையை ஆராய்க' : 'Explore TNAU Seed Catalog'}</span>
                  <ChevronRightIcon size={15} />
                </Link>
              </div>
            </motion.div>

            {/* Right Visual Column (No white border) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6 relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] group">
                <Image
                  src="/images/seed.jpg"
                  alt="Certified Seeds Agriculture"
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Floating Seed Badge (keep-white ensures pure white text in both themes) */}
                <div className="keep-white absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/65 backdrop-blur-xl border border-white/15 text-white shadow-2xl flex items-center justify-between">
                  <div>
                    <span className="keep-white text-xs font-bold text-purple-300 uppercase tracking-wider block">
                      Breeder & Certified Seeds
                    </span>
                    <span className="keep-white text-sm font-semibold text-white">78+ Cultivar Varieties Registered</span>
                  </div>
                  <span className="keep-white px-3 py-1 rounded-full bg-purple-500/30 border border-purple-400/40 text-xs font-bold text-white">
                    Official Rates
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 7. 5-PHASE CULTIVATION WORKFLOW ARCHITECTURE: React Bits Scroll Stack */}
      <section id="lifecycle-scroll-stack" className="relative z-10 w-full py-16 sm:py-24 bg-surface/40 overflow-visible">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12 overflow-visible">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              {isTamil ? 'முழுமையான சாகுபடி சுழற்சி' : 'END-TO-END AGRO LIFECYCLE'}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-text-main">
              {isTamil ? 'விதைப்பு முதல் அறுவடை வரை: 5-நிலை சாகுபடி நெறிமுறை' : 'From Tillage to Mandi: The 5-Phase Protocol'}
            </h2>
            <p className="text-sm sm:text-base text-text-secondary font-normal">
              {isTamil
                ? 'அதிக மகசூல் மற்றும் குறைந்த செலவுக்கான ஒருங்கிணைந்த 5-நிலை விவசாய மேலாண்மை. கீழே உருட்டி ஒவ்வொரு நிலையின் விவரங்களையும் காண்க.'
                : 'Cards that stack and fade away as you scroll through each calibrated vegetative phase for maximum ROI.'}
            </p>
          </div>

          <ScrollStack
            items={cultivationPhases}
            peek={28}
            scaleStep={0.05}
            blur={4}
            dim={0.25}
            topOffset={96}
            isTamil={isTamil}
          />
        </div>
      </section>

      {/* 8. INTERACTIVE LIVE OPERATIONS CONSOLE (Luxex / Evntly Interactive Tabbed Preview) */}
      <section className="relative z-10 w-full py-16 sm:py-24">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                LIVE OPERATIONS SNAPSHOT
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-text-main mt-1">
                {isTamil ? 'நேரடி மேலாண்மை கட்டுப்பாட்டு அறை' : 'Interactive Farm Operations Console'}
              </h2>
            </div>

            {/* Interactive Tab Selector Buttons */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl glass-surface border border-border-light self-start sm:self-auto overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveConsoleTab('plans')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeConsoleTab === 'plans'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-text-secondary hover:text-text-main'
                }`}
              >
                {isTamil ? 'சாகுபடி ஆவணங்கள்' : 'Active Plans'}
              </button>
              <button
                type="button"
                onClick={() => setActiveConsoleTab('reservoirs')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeConsoleTab === 'reservoirs'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-text-secondary hover:text-text-main'
                }`}
              >
                {isTamil ? 'அணைகள் நீர் இருப்பு' : 'Dams Hydrology'}
              </button>
              <button
                type="button"
                onClick={() => setActiveConsoleTab('seeds')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeConsoleTab === 'seeds'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-text-secondary hover:text-text-main'
                }`}
              >
                {isTamil ? 'விதை அட்டவணை' : 'Seed Index'}
              </button>
              <button
                type="button"
                onClick={() => setActiveConsoleTab('advisory')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeConsoleTab === 'advisory'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-text-secondary hover:text-text-main'
                }`}
              >
                {isTamil ? 'வேளாண் ஆலோசனை' : 'Agronomic Advisory'}
              </button>
            </div>
          </div>

          {/* Tab Content 1: Active Plans */}
          {activeConsoleTab === 'plans' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {savedPlans.map((plan, idx) => (
                <div
                  key={plan.id}
                  className="p-6 rounded-3xl glass-panel shadow-xl flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all"
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
                        {plan.landSize} Cents
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-text-secondary font-medium">
                      <p className="truncate">📍 {plan.location}</p>
                      <p className="text-text-muted">🕒 {plan.updated_at}</p>
                    </div>

                    <div className="p-3 rounded-2xl glass-surface border border-border-subtle grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-text-muted block font-semibold">Outlay Cost:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">₹{plan.grandTotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted block font-semibold">Net Profit:</span>
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-400">₹{plan.netProfit.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/fertilizer"
                    className="w-full py-2.5 rounded-xl bg-surface hover:bg-surface/80 border border-border-light text-xs font-bold text-center text-text-secondary hover:text-text-main transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>View Dossier</span>
                    <ArrowUpRightIcon size={14} />
                  </Link>
                </div>
              ))}

              {/* Add New Plan CTA Card (Styled cleanly for both light and dark themes) */}
              <div className="rounded-3xl border-2 border-dashed border-emerald-500/35 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.02] flex flex-col items-center justify-center text-center space-y-3 p-8 shadow-sm">
                <span className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xl font-bold">
                  ➕
                </span>
                <div>
                  <h4 className="text-sm font-black text-text-main">
                    {isTamil ? 'புதிய சாகுபடி திட்டம் உருவாக்க' : 'Create New Cultivation Plan'}
                  </h4>
                  <p className="text-xs text-text-secondary mt-1 max-w-xs font-medium">
                    {isTamil
                      ? 'உரச் செலவு, பயிர் நிலைகள் மற்றும் மகசூல் லாபத்தை கணக்கிடுங்கள்.'
                      : 'Calculate fertilizer costs, crop stages, and expected profit for your next harvest.'}
                  </p>
                </div>
                <Link
                  href="/fertilizer"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {isTamil ? 'திட்டம் தொடங்க' : 'Launch Calculator'}
                </Link>
              </div>
            </motion.div>
          )}

          {/* Tab Content 2: Dam Hydrology */}
          {activeConsoleTab === 'reservoirs' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {majorDams.map((dam) => (
                <div
                  key={dam.name}
                  className="p-6 rounded-3xl glass-panel shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-text-main">
                      {isTamil ? dam.tamilName : dam.name}
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
                      <span className="text-[10px] text-text-muted block font-semibold">Inflow</span>
                      <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">{dam.inflow.toLocaleString('en-IN')} cusecs</span>
                    </div>
                    <div className="p-2.5 rounded-xl glass-surface border border-border-subtle">
                      <span className="text-[10px] text-text-muted block font-semibold">Outflow</span>
                      <span className="font-mono font-bold text-text-main">{dam.outflow.toLocaleString('en-IN')} cusecs</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-text-muted font-mono pt-1 text-center font-semibold">
                    Storage: {dam.storageMcft.toLocaleString('en-IN')} / {dam.capacityMcft.toLocaleString('en-IN')} Mcft
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Tab Content 3: Seed Market Index */}
          {activeConsoleTab === 'seeds' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {[
                { name: 'ADT 43 (Medium Duration)', type: 'Paddy / நெல்', price: '₹42.50/kg', season: 'Kuruvai / Navarai' },
                { name: 'CR 1009 Sub 1 (Samba)', type: 'Paddy / நெல்', price: '₹44.00/kg', season: 'Samba / Thaladi' },
                { name: 'CO 51 (Short 105d)', type: 'Paddy / நெல்', price: '₹46.50/kg', season: 'Short Duration' },
                { name: 'VBN 8 Blackgram', type: 'Pulses / பயறு', price: '₹120.00/kg', season: 'Rice Fallow' },
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
            </motion.div>
          )}

          {/* Tab Content 4: Agronomic Advisory */}
          {activeConsoleTab === 'advisory' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
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
            </motion.div>
          )}
        </div>
      </section>

      {/* 9. PANORAMIC LUXURY CTA BANNER (keep-white ensures pure white text & no white border) */}
      <section className="relative z-10 w-full py-16 sm:py-24">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden p-8 sm:p-14 lg:p-20 shadow-2xl">
            {/* Background Image */}
            <Image
              src="/images/pexels-mazhar-arslanoglu-706220627-38389252.jpg"
              alt="Agricultural Horizon"
              fill
              className="object-cover object-center"
              sizes="100vw"
            />
            {/* Dark gradient overlay for high contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-950/50" />

            {/* Content: keep-white guarantees high-contrast white typography in both light & dark themes */}
            <div className="keep-white relative z-10 max-w-2xl space-y-6 text-white">
              <span className="keep-white inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500/25 text-emerald-300 border border-emerald-400/30">
                ELEVATE YOUR CULTIVATION YIELD
              </span>
              <h2 className="keep-white text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.85)]">
                {isTamil
                  ? 'விவசாயத்தை தொழில்நுட்பத்துடன் இணைத்து அதிக லாபம் பெறுங்கள்'
                  : 'Cultivate with Data. Harvest with Maximum Profitability.'}
              </h2>
              <p className="keep-white text-base sm:text-lg text-white/90 font-light leading-relaxed">
                {isTamil
                  ? 'மண்ணின் தரம் முதல் சந்தை விற்பனை வரை - அனைத்து தகவல்களையும் ஒரே இடத்தில் பெற்று சிறந்த விவசாய முடிவுகளை எடுங்கள்.'
                  : 'Start designing your precision fertilizer schedule, explore live dam canal hydrology, and benchmark certified seed varieties today.'}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/fertilizer"
                  className="px-6 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm shadow-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>{isTamil ? 'உர கணக்கீட்டை தொடங்கு' : 'Start Fertilizer Calculation'}</span>
                  <ArrowUpRightIcon size={16} />
                </Link>
                <Link
                  href="/weather-mcp"
                  className="keep-white px-6 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm backdrop-blur-md border border-white/30 shadow-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <span className="keep-white">{isTamil ? 'வானிலை' : 'Weather'}</span>
                  <CloudSunIcon size={16} className="keep-white text-white" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
