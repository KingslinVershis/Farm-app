// ─────────────────────────────────────────────────────────────
// Fertilizer Planner Calculations & Schema Transformations
// Single source of truth for calculations and data normalization
// ─────────────────────────────────────────────────────────────

import type { CultivationType, DailyLabourEntry, ExpenseEntry, PhaseGroup } from './types';

export function computeDailyLabourCost(d: Partial<DailyLabourEntry>): number {
  const count = Number(d.labourCount) || 0;
  const wage = Number(d.labourWage) || 0;
  const snacks = Number(d.snackCost) || 0;
  const travel = Number(d.travelCost) || 0;
  return Math.round(count * wage + snacks + travel);
}

/** Pesticide dosage: (landSize / 2) * (mlPerCan) converted to litres */
export function computeRecommendedPesticideLitres(landSizeInCents: number, mlPerCan: number = 80): number {
  const cents = Number(landSizeInCents) > 0 ? Number(landSizeInCents) : 0;
  if (cents <= 0) return 0;
  const ml = (cents / 2) * mlPerCan;
  return Number((ml / 1000).toFixed(2));
}

/** Panicle Initiation fertilizer bag count (50kg bags): min = (cents * 3) / 50, max = (cents * 6) / 50 */
export function computeRecommendedFertilizerBagRange(landSizeInCents: number): {
  minKg: number;
  maxKg: number;
  minBags: number;
  maxBags: number;
} {
  const cents = Number(landSizeInCents) > 0 ? Number(landSizeInCents) : 0;
  if (cents <= 0) return { minKg: 0, maxKg: 0, minBags: 0, maxBags: 0 };
  const minKg = Number((cents * 3).toFixed(2));
  const maxKg = Number((cents * 6).toFixed(2));
  const minBags = Number((minKg / 50).toFixed(2));
  const maxBags = Number((maxKg / 50).toFixed(2));
  return { minKg, maxKg, minBags, maxBags };
}

const formatRatioKg = (value: number): number => {
  if (value <= 0) return 0;
  return value < 0.1 ? Number(value.toFixed(3)) : Number(value.toFixed(2));
};

/** Suggested top-dress mixture scaled dynamically from 1 cent using 62-cent baseline (2kg Urea, 1kg Complex, 1kg Potash, 1kg DAP, 1kg Vembu powder) */
export function computeRecommendedFertilizerMix(landSizeInCents: number): {
  ureaKg: number;
  complexKg: number;
  potashKg: number;
  dapKg: number;
  vembuPowderKg: number;
} {
  const cents = Number(landSizeInCents) > 0 ? Number(landSizeInCents) : 0;
  if (cents <= 0) {
    return { ureaKg: 0, complexKg: 0, potashKg: 0, dapKg: 0, vembuPowderKg: 0 };
  }
  const perCentUnit = 1 / 62;
  const unitKg = formatRatioKg(cents * perCentUnit);
  return {
    ureaKg: formatRatioKg(cents * (2 / 62)),
    complexKg: unitKg,
    potashKg: unitKg,
    dapKg: unitKg,
    vembuPowderKg: unitKg,
  };
}

export function normalizeDailyLabourEntries(raw: any, maxDays: number = 60): DailyLabourEntry[] {
  if (!raw || typeof raw !== 'object') {
    return [{ day: 1, labourCount: 0, labourWage: 0, snackCost: 0, travelCost: 0 }];
  }

  const byDay = new Map<number, DailyLabourEntry>();

  if (Array.isArray(raw.dayEntries) && raw.dayEntries.length > 0) {
    for (const item of raw.dayEntries) {
      const dayNum = Math.min(maxDays, Math.max(1, Math.round(Number(item?.day) || 1)));
      byDay.set(dayNum, {
        day: dayNum,
        labourCount: Math.max(0, Number(item?.labourCount) || 0),
        labourWage: Math.max(0, Number(item?.labourWage) || 0),
        snackCost: Math.max(0, Number(item?.snackCost) || 0),
        travelCost: Math.max(0, Number(item?.travelCost) || 0),
      });
    }
  }

  for (let dayNum = 1; dayNum <= maxDays; dayNum++) {
    const dayObj = raw[`day_${dayNum}`];
    if (dayObj && typeof dayObj === 'object') {
      byDay.set(dayNum, {
        day: dayNum,
        labourCount: Math.max(0, Number(dayObj.labourCount) || 0),
        labourWage: Math.max(0, Number(dayObj.labourWage) || 0),
        snackCost: Math.max(0, Number(dayObj.snackCost) || 0),
        travelCost: Math.max(0, Number(dayObj.travelCost) || 0),
      });
    }
  }

  Object.keys(raw).forEach((k) => {
    const match = k.match(/^day_(\d+)$/);
    if (match) {
      const dayNum = Math.min(maxDays, Math.max(1, parseInt(match[1], 10)));
      const dayObj = raw[k];
      if (dayObj && typeof dayObj === 'object') {
        byDay.set(dayNum, {
          day: dayNum,
          labourCount: Math.max(0, Number(dayObj.labourCount) || 0),
          labourWage: Math.max(0, Number(dayObj.labourWage) || 0),
          snackCost: Math.max(0, Number(dayObj.snackCost) || 0),
          travelCost: Math.max(0, Number(dayObj.travelCost) || 0),
        });
      }
    }
  });

  if (byDay.size > 0) {
    const sorted = Array.from(byDay.values()).sort((a, b) => a.day - b.day);
    const nonEmpty = sorted.filter(
      (d) => d.labourCount > 0 || d.labourWage > 0 || d.snackCost > 0 || d.travelCost > 0
    );
    if (nonEmpty.length > 0) return nonEmpty;
    return [sorted[0] || { day: 1, labourCount: 0, labourWage: 0, snackCost: 0, travelCost: 0 }];
  }

  const hasFlatValues =
    raw.labourCount !== undefined ||
    raw.labourWage !== undefined ||
    raw.snackCost !== undefined ||
    raw.travelCost !== undefined;

  if (hasFlatValues) {
    return [
      {
        day: 1,
        labourCount: Math.max(0, Number(raw.labourCount) || 0),
        labourWage: Math.max(0, Number(raw.labourWage) || 0),
        snackCost: Math.max(0, Number(raw.snackCost) || 0),
        travelCost: Math.max(0, Number(raw.travelCost) || 0),
      },
    ];
  }

  return [{ day: 1, labourCount: 0, labourWage: 0, snackCost: 0, travelCost: 0 }];
}

export function buildDayWiseLabourObject(entries: DailyLabourEntry[], maxDays: number = 60): Record<string, any> {
  const result: Record<string, any> = {
    totalDays: entries.length || 1,
  };
  for (const entry of entries) {
    const dayNum = Math.min(maxDays, Math.max(1, Math.round(Number(entry.day) || 1)));
    result[`day_${dayNum}`] = {
      labourCount: Math.max(0, Number(entry.labourCount) || 0),
      labourWage: Math.max(0, Number(entry.labourWage) || 0),
      snackCost: Math.max(0, Number(entry.snackCost) || 0),
      travelCost: Math.max(0, Number(entry.travelCost) || 0),
    };
  }
  return result;
}

export function normalizeDailyHarvestEntries(raw: any, maxDays: number = 60): DailyLabourEntry[] {
  if (!raw || typeof raw !== 'object') {
    return [{ day: 1, labourCount: 0, labourWage: 0, snackCost: 0, travelCost: 0, ratePerCent: 0 }];
  }
  const byDay = new Map<number, DailyLabourEntry>();
  if (Array.isArray(raw.dayEntries) && raw.dayEntries.length > 0) {
    for (const item of raw.dayEntries) {
      const dayNum = Math.min(maxDays, Math.max(1, Math.round(Number(item?.day) || 1)));
      byDay.set(dayNum, {
        day: dayNum,
        labourCount: 0,
        labourWage: 0,
        snackCost: 0,
        travelCost: 0,
        ratePerCent: Math.max(0, Number(item?.ratePerCent ?? item?.harvest_cost) || 0),
      });
    }
  }
  for (let dayNum = 1; dayNum <= maxDays; dayNum++) {
    const dayObj = raw[`day_${dayNum}`];
    if (dayObj && typeof dayObj === 'object') {
      byDay.set(dayNum, {
        day: dayNum,
        labourCount: 0,
        labourWage: 0,
        snackCost: 0,
        travelCost: 0,
        ratePerCent: Math.max(0, Number(dayObj.ratePerCent ?? dayObj.harvest_cost) || 0),
      });
    }
  }
  if (byDay.size === 0) {
    byDay.set(1, {
      day: 1,
      labourCount: 0,
      labourWage: 0,
      snackCost: 0,
      travelCost: 0,
      ratePerCent: Math.max(0, Number(raw.ratePerCent ?? raw.harvest_cost) || 0),
    });
  }
  return Array.from(byDay.values()).sort((a, b) => a.day - b.day);
}

export function buildDayWiseHarvestObject(entries: DailyLabourEntry[], maxDays: number = 60): Record<string, any> {
  const result: Record<string, any> = {
    totalDays: entries.length || 1,
  };
  for (const entry of entries) {
    const dayNum = Math.min(maxDays, Math.max(1, Math.round(Number(entry.day) || 1)));
    result[`day_${dayNum}`] = {
      harvest_cost: Math.max(0, Number(entry.ratePerCent) || 0),
      ratePerCent: Math.max(0, Number(entry.ratePerCent) || 0),
    };
  }
  return result;
}

export function normalizeDailyGunnyEntries(raw: any, maxDays: number = 60): DailyLabourEntry[] {
  if (!raw || typeof raw !== 'object') {
    return [{ day: 1, labourCount: 0, labourWage: 0, snackCost: 0, travelCost: 0, bagCount: 0, bagPrice: 0 }];
  }
  const byDay = new Map<number, DailyLabourEntry>();
  if (Array.isArray(raw.dayEntries) && raw.dayEntries.length > 0) {
    for (const item of raw.dayEntries) {
      const dayNum = Math.min(maxDays, Math.max(1, Math.round(Number(item?.day) || 1)));
      byDay.set(dayNum, {
        day: dayNum,
        labourCount: 0,
        labourWage: 0,
        snackCost: 0,
        travelCost: 0,
        bagCount: Math.max(0, Number(item?.bagCount) || 0),
        bagPrice: Math.max(0, Number(item?.bagPrice) || 0),
      });
    }
  }
  for (let dayNum = 1; dayNum <= maxDays; dayNum++) {
    const dayObj = raw[`day_${dayNum}`];
    if (dayObj && typeof dayObj === 'object') {
      byDay.set(dayNum, {
        day: dayNum,
        labourCount: 0,
        labourWage: 0,
        snackCost: 0,
        travelCost: 0,
        bagCount: Math.max(0, Number(dayObj.bagCount) || 0),
        bagPrice: Math.max(0, Number(dayObj.bagPrice) || 0),
      });
    }
  }
  if (byDay.size === 0) {
    byDay.set(1, {
      day: 1,
      labourCount: 0,
      labourWage: 0,
      snackCost: 0,
      travelCost: 0,
      bagCount: Math.max(0, Number(raw.bagCount) || 0),
      bagPrice: Math.max(0, Number(raw.bagPrice) || 0),
    });
  }
  return Array.from(byDay.values()).sort((a, b) => a.day - b.day);
}

export function buildDayWiseGunnyObject(entries: DailyLabourEntry[], maxDays: number = 60): Record<string, any> {
  const result: Record<string, any> = {
    totalDays: entries.length || 1,
  };
  for (const entry of entries) {
    const dayNum = Math.min(maxDays, Math.max(1, Math.round(Number(entry.day) || 1)));
    result[`day_${dayNum}`] = {
      bagCount: Math.max(0, Number(entry.bagCount) || 0),
      bagPrice: Math.max(0, Number(entry.bagPrice) || 0),
    };
  }
  return result;
}

export function normalizeDailyTransportEntries(raw: any, maxDays: number = 60): DailyLabourEntry[] {
  if (!raw || typeof raw !== 'object') {
    return [{ day: 1, labourCount: 0, labourWage: 0, snackCost: 0, travelCost: 0, bagCount: 0, transportRent: 0, loadingWorkers: 0, perBagLiftingCost: 0, loadingWage: 0, loadingSnacks: 0 }];
  }
  const byDay = new Map<number, DailyLabourEntry>();
  if (Array.isArray(raw.dayEntries) && raw.dayEntries.length > 0) {
    for (const item of raw.dayEntries) {
      const dayNum = Math.min(maxDays, Math.max(1, Math.round(Number(item?.day) || 1)));
      const count = Math.max(0, Number(item?.bagCount ?? item?.transportBagCount ?? item?.transportRent) || 0);
      const liftingCost = Math.max(0, Number(item?.perBagLiftingCost ?? item?.loadingWorkers ?? item?.loadingLabourCount) || 0);
      const snacks = Math.max(0, Number(item?.loadingSnacks ?? item?.snackCost) || 0);
      byDay.set(dayNum, {
        day: dayNum,
        labourCount: 0,
        labourWage: 0,
        snackCost: 0,
        travelCost: 0,
        bagCount: count,
        transportRent: count,
        loadingWorkers: liftingCost,
        perBagLiftingCost: liftingCost,
        loadingWage: 0,
        loadingSnacks: snacks,
      });
    }
  }
  for (let dayNum = 1; dayNum <= maxDays; dayNum++) {
    const dayObj = raw[`day_${dayNum}`];
    if (dayObj && typeof dayObj === 'object') {
      const count = Math.max(0, Number(dayObj.bagCount ?? dayObj.transportBagCount ?? dayObj.transportRent) || 0);
      const liftingCost = Math.max(0, Number(dayObj.perBagLiftingCost ?? dayObj.loadingWorkers ?? dayObj.loadingLabourCount) || 0);
      const snacks = Math.max(0, Number(dayObj.loadingSnacks ?? dayObj.snackCost) || 0);
      byDay.set(dayNum, {
        day: dayNum,
        labourCount: 0,
        labourWage: 0,
        snackCost: 0,
        travelCost: 0,
        bagCount: count,
        transportRent: count,
        loadingWorkers: liftingCost,
        perBagLiftingCost: liftingCost,
        loadingWage: 0,
        loadingSnacks: snacks,
      });
    }
  }
  if (byDay.size === 0) {
    const count = Math.max(0, Number(raw.bagCount ?? raw.transportBagCount ?? raw.transportRent) || 0);
    const liftingCost = Math.max(0, Number(raw.perBagLiftingCost ?? raw.loadingWorkers ?? raw.loadingLabourCount) || 0);
    const snacks = Math.max(0, Number(raw.loadingSnacks ?? raw.snackCost) || 0);
    byDay.set(1, {
      day: 1,
      labourCount: 0,
      labourWage: 0,
      snackCost: 0,
      travelCost: 0,
      bagCount: count,
      transportRent: count,
      loadingWorkers: liftingCost,
      perBagLiftingCost: liftingCost,
      loadingWage: 0,
      loadingSnacks: snacks,
    });
  }
  return Array.from(byDay.values()).sort((a, b) => a.day - b.day);
}

export function buildDayWiseTransportObject(entries: DailyLabourEntry[], maxDays: number = 60): Record<string, any> {
  const result: Record<string, any> = {
    totalDays: entries.length || 1,
  };
  for (const entry of entries) {
    const dayNum = Math.min(maxDays, Math.max(1, Math.round(Number(entry.day) || 1)));
    const count = Math.max(0, Number(entry.bagCount ?? entry.transportRent) || 0);
    const cost = Math.max(0, Number(entry.perBagLiftingCost ?? entry.loadingWorkers) || 0);
    result[`day_${dayNum}`] = {
      bagCount: count,
      transportRent: count,
      loadingLabourCount: cost,
      loadingWorkers: cost,
      perBagLiftingCost: cost,
      snackCost: Math.max(0, Number(entry.loadingSnacks) || 0),
    };
  }
  return result;
}

export interface PhaseTotals {
  total: number;
  daily: number;
}

export interface PlanTotals {
  grandTotal: number;
  totalDailyCost: number;
  phaseTotals: Record<string, PhaseTotals>;
  revenueTotal: number;
  netProfit: number;
}

export interface FormattedUserDetails {
  name: string;
  phone: string;
  landSize: number;
  state: string;
  district: string;
  city: string;
  village: string;
  address: string;
  [key: string]: any;
}

export interface FormattedPlanRecord {
  id: string;
  created_at: string;
  updated_at: string;
  isCompleted: boolean;
  cultivation: 'paddy';
  userDetails: FormattedUserDetails;
  expenseMap: Record<string, Record<string, any>>;
  totals: {
    grandTotal: number;
    revenueTotal: number;
    netProfit: number;
  };
}

/** Formats date into standard user display: "29 Oct 2026, 01:59 pm" */
export function formatDisplayDate(dateInput?: string | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  const day = validDate.getDate().toString().padStart(2, '0');
  const month = validDate.toLocaleDateString('en-US', { month: 'short' });
  const year = validDate.getFullYear();
  const time = validDate
    .toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase();

  return `${day} ${month} ${year}, ${time}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(
    Math.round(amount || 0)
  );
}

export function getCropDurationDays(cultivation: CultivationType = 'paddy'): number {
  return 120;
}

/** Builds an empty expense entry for every task with 0 values (plus initial recommended quantities from landSize if > 0) */
export function buildEmptyExpenses(phases: PhaseGroup[], landSizeInCents: number = 0): Record<string, ExpenseEntry> {
  const result: Record<string, ExpenseEntry> = {};
  const recommendedPesticideLitres = computeRecommendedPesticideLitres(landSizeInCents);
  const recommendedFertMinBags = computeRecommendedFertilizerBagRange(landSizeInCents).minBags;

  phases.forEach((ph) => {
    ph.tasks.forEach((t) => {
      const initialFertQty =
        t.id === 'p1_fert' || t.id === 'p2_tillering'
          ? recommendedPesticideLitres
          : t.id === 'p3_fert_dose3' || t.id === 'p2_fert_labour'
            ? recommendedFertMinBags
            : 0;
      result[t.id] = {
        ratePerCent: 0,
        days: t.isMultiDayLabour ? 1 : t.defaultDays,
        totalCost: 0,
        costPerDay: 0,
        labourCount: 0,
        labourWage: 0,
        snackCost: 0,
        travelCost: 0,
        activeDay: t.isMultiDayLabour ? 1 : undefined,
        dayEntries: t.isMultiDayLabour
          ? [{
              day: 1,
              labourCount: 0,
              labourWage: 0,
              snackCost: 0,
              travelCost: 0,
              ratePerCent: 0,
              bagCount: 0,
              bagPrice: 0,
              transportRent: 0,
              loadingWorkers: 0,
              loadingWage: 0,
              loadingSnacks: 0,
            }]
          : undefined,
        hasTravelCost: t.id === 'p1_nursery' ? true : undefined,
        mandiCount: 0,
        mandiRate: 0,
        fertQty: initialFertQty,
        fertPrice: 0,
        isPlasticBag: true,
        bagCount: 0,
        bagPrice: 0,
        transportRent: 0,
        loadingWorkers: 0,
        loadingWage: 0,
        loadingSnacks: 0,
        yieldMode: t.defaultYieldMode ?? 'tons',
        yieldKg: 0,
        yieldTons: 0,
        bagWeightKg: 0,
        grainBagPrice: 0,
        grainBagCount: 0,
        strawSackCount: 0,
        strawPrice: 0,
        herbicideNotify: true,
        pesticideNotify: true,
        fertilizerNotify: true,
        hasRepairCost: false,
        mechanicName: '',
        mechanicNumber: '',
        repairCost: 0,
        pesticideMl: t.id === 'p1_fert' || t.id === 'p2_tillering' ? 80 : undefined,
        isMachineMode: false,
        isEnabled: true,
      };
    });
  });

  return result;
}

/** Seeds an expense entry for every task, using recommended defaults */
export function buildInitialExpenses(
  phases: PhaseGroup[],
  landSizeInCents: number
): Record<string, ExpenseEntry> {
  const result: Record<string, ExpenseEntry> = {};
  const cents = landSizeInCents > 0 ? landSizeInCents : 0;

  phases.forEach((ph) => {
    ph.tasks.forEach((t) => {
      let totalCost = 0;
      let labourCount = t.defaultLabourCount;
      let labourWage = t.defaultLabourWage;
      let mandiCount = t.defaultMandiCount;
      let mandiRate = t.defaultMandiRate;
      let fertQty = t.defaultFertQty;
      let fertPrice = t.defaultFertPrice;
      let isPlasticBag = true;
      let bagCount = t.defaultBagCount;
      let bagPrice = t.defaultPlasticPrice;
      let transportRent = t.defaultTransportRent;
      let loadingWorkers = t.defaultLoadingWorkers;
      let loadingWage = t.defaultLoadingWage;
      let loadingSnacks = t.defaultLoadingSnacks;
      let yieldMode: 'tons' | 'bags' | undefined = t.defaultYieldMode;
      let yieldTons = t.defaultYieldTons;
      let yieldKg = t.defaultYieldTons ? t.defaultYieldTons * 1000 : 10500;
      let bagWeightKg = t.defaultBagWeightKg;
      let grainBagPrice = t.defaultBagPrice;
      let grainBagCount = t.defaultGrainBags;
      let strawSackCount = t.defaultStrawSacks;
      let strawPrice = t.defaultStrawPrice;
      let ratePerCent = t.defaultRate;
      let hasTravelCost: boolean | undefined = undefined;

      if (t.id === 'p1_nursery') {
        hasTravelCost = true;
        const seedTravel = t.defaultTravelCost ?? 100;
        totalCost = Math.round(t.defaultRate + seedTravel);
      } else if (t.isFertilizerWithLabour) {
        if (t.id === 'p1_fert' || t.id === 'p2_tillering') {
          fertQty = computeRecommendedPesticideLitres(cents) || (t.defaultFertQty ?? 4);
        } else if (t.id === 'p3_fert_dose3' || t.id === 'p2_fert_labour') {
          fertQty = computeRecommendedFertilizerBagRange(cents).minBags || (t.defaultFertQty ?? 6);
        } else {
          fertQty = t.defaultFertQty ?? 50;
        }
        fertPrice = t.defaultFertPrice ?? 30;
        labourCount = t.defaultLabourCount ?? 2;
        labourWage = t.defaultLabourWage ?? 500;
        const snackCost = t.hasSnacks ? (t.defaultSnackCost ?? 200) : 0;
        const travelCost = t.hasTravel ? (t.defaultTravelCost ?? 150) : 0;
        const isBagTask = t.id === 'p2_fert_labour' || t.id === 'p3_fert_dose3';
        const isPesticideTask = t.id === 'p1_fert' || t.id === 'p2_tillering';
        const materialCost = (isBagTask || isPesticideTask) ? fertPrice : fertQty * fertPrice;
        totalCost = Math.round(materialCost + labourCount * labourWage + snackCost + travelCost);
        ratePerCent = 0;
      } else if (t.isLabour) {
        labourCount = t.defaultLabourCount ?? 4;
        labourWage = t.defaultLabourWage ?? 500;
        const snackCost = t.hasSnacks ? (t.defaultSnackCost ?? 200) : 0;
        const travelCost = t.hasTravel ? (t.defaultTravelCost ?? 150) : 0;
        totalCost = Math.round(labourCount * labourWage + snackCost + travelCost);
        ratePerCent = 0;
      } else if (t.isGunnyBags) {
        isPlasticBag = true;
        bagCount = t.defaultBagCount ?? 120;
        bagPrice = t.defaultPlasticPrice ?? 20;
        totalCost = Math.round(bagCount * bagPrice);
        ratePerCent = 0;
      } else if (t.isTransportLoading) {
        bagCount = t.defaultBagCount ?? 120;
        transportRent = bagCount;
        loadingWorkers = t.defaultLoadingWorkers ?? 15;
        loadingWage = 0;
        loadingSnacks = t.defaultLoadingSnacks ?? 150;
        totalCost = Math.round(bagCount * loadingWorkers + loadingSnacks);
        ratePerCent = 0;
      } else if (t.isGrainYield) {
        const totalKg = 10500;
        const bagWeight = 75;
        const bagPriceP5 = 1650;
        const bags = bagWeight > 0 ? totalKg / bagWeight : 0;
        totalCost = Math.round(bags * bagPriceP5);
        ratePerCent = 0;
        yieldKg = totalKg;
        yieldTons = 10.5;
        bagWeightKg = bagWeight;
        grainBagPrice = bagPriceP5;
        grainBagCount = bags;
      } else if (t.isStrawYield) {
        const sacks = 100;
        const pricePerSack = 150;
        totalCost = Math.round(sacks * pricePerSack);
        ratePerCent = 0;
        strawSackCount = sacks;
        strawPrice = pricePerSack;
      } else {
        totalCost = Math.round(t.defaultRate);
      }

      const costPerDay = (t.isMultiDayLabour ? 1 : t.defaultDays) > 0 ? Math.round(totalCost / (t.isMultiDayLabour ? 1 : t.defaultDays)) : 0;

      result[t.id] = {
        ratePerCent,
        days: t.isMultiDayLabour ? 1 : t.defaultDays,
        totalCost,
        costPerDay,
        labourCount,
        labourWage,
        snackCost: t.defaultSnackCost,
        travelCost: t.defaultTravelCost,
        activeDay: t.isMultiDayLabour ? 1 : undefined,
        dayEntries: t.isMultiDayLabour
          ? [
              {
                day: 1,
                labourCount: labourCount ?? 0,
                labourWage: labourWage ?? 0,
                snackCost: t.hasSnacks ? (t.defaultSnackCost ?? 200) : 0,
                travelCost: t.hasTravel ? (t.defaultTravelCost ?? 150) : 0,
                ratePerCent: ratePerCent ?? 0,
                bagCount: bagCount ?? 0,
                bagPrice: bagPrice ?? 0,
                transportRent: transportRent ?? 0,
                loadingWorkers: loadingWorkers ?? 0,
                loadingWage: loadingWage ?? 0,
                loadingSnacks: loadingSnacks ?? 0,
              },
            ]
          : undefined,
        hasTravelCost,
        mandiCount,
        mandiRate,
        fertQty,
        fertPrice,
        isPlasticBag,
        bagCount,
        bagPrice,
        transportRent,
        loadingWorkers,
        loadingWage,
        loadingSnacks,
        yieldMode,
        yieldKg,
        total_yieldKg: yieldKg,
        yieldTons,
        bagWeightKg,
        pricePerBag: grainBagPrice,
        grainBagPrice,
        grainBagCount,
        SackCount: strawSackCount,
        SackPrice: strawPrice,
        strawSackCount,
        strawPrice,
        herbicideNotify: true,
        pesticideNotify: true,
        fertilizerNotify: true,
        hasRepairCost: false,
        mechanicName: '',
        mechanicNumber: '',
        repairCost: 0,
        pesticideMl: t.id === 'p1_fert' || t.id === 'p2_tillering' ? 80 : undefined,
        isMachineMode: false,
        isEnabled: true,
      };
    });
  });

  return result;
}

/**
 * Calculates phase breakdown and plan totals (grandTotal, revenueTotal, netProfit)
 * from flat expense entries for client-side live reactive view.
 */
export function computePlanTotals(
  phases: PhaseGroup[],
  expenseMap: Record<string, ExpenseEntry>
): PlanTotals {
  let grandCost = 0;
  let daily = 0;
  let revenueTotal = 0;
  const phaseTotals: Record<string, PhaseTotals> = {};

  phases.forEach((phase) => {
    let phaseSum = 0;
    let phaseDailySum = 0;

    phase.tasks.forEach((task) => {
      const entry = expenseMap[task.id];
      if (entry && entry.isEnabled !== false) {
        phaseSum += entry.totalCost;
        phaseDailySum += entry.costPerDay;
      }
    });

    phaseTotals[phase.id] = { total: phaseSum, daily: phaseDailySum };
    if (phase.isProfitPhase) {
      revenueTotal += phaseSum;
    } else {
      grandCost += phaseSum;
      daily += phaseDailySum;
    }
  });

  return {
    grandTotal: grandCost,
    totalDailyCost: daily,
    phaseTotals,
    revenueTotal,
    netProfit: revenueTotal - grandCost,
  };
}

/**
 * Single Unified Converter / Normalizer for Paddy Nested Expense Map.
 * Handles both:
 * 1. Flat UI tasks map -> Nested Phase Map
 * 2. Already nested Phase Map -> Validated/Sanitized Nested Phase Map
 */
export function normalizeOrFormatNestedExpenseMap(
  input: Record<string, any>,
  landSize: number = 100
): Record<string, Record<string, any>> {
  if (!input || typeof input !== 'object') return {};

  const isAlreadyNested = Boolean(input.phase_1 || input.phase_2);

  // Extract phase buckets whether input is already nested or flat
  const p1 = isAlreadyNested ? (input.phase_1 || {}) : {};
  const p2 = isAlreadyNested ? (input.phase_2 || {}) : {};
  const p3 = isAlreadyNested ? (input.phase_3 || {}) : {};
  const p4 = isAlreadyNested ? (input.phase_4 || {}) : {};
  const p5 = isAlreadyNested ? (input.phase_5 || {}) : {};

  // Phase 1 Tasks
  const tractor1 = isAlreadyNested ? (p1.tractor || {}) : (input.p1_tractor || {});
  const seed1 = isAlreadyNested ? (p1.seed || {}) : (input.p1_nursery || {});
  const fuel1 = isAlreadyNested ? (p1.fuel || {}) : (input.p1_fuel || {});
  const bund1 = isAlreadyNested ? (p1.bund_labour || {}) : (input.p1_bund_labour || {});
  const plot1 = isAlreadyNested ? (p1.plotting_labour || {}) : (input.p1_plotting_labour || {});

  // Phase 2 Tasks
  const tractor2 = isAlreadyNested ? (p2.tractor || {}) : (input.p2_tractor || {});
  const bund2 = isAlreadyNested ? (p2.bund_labour || {}) : (input.p2_bund_labour || {});
  const fert2 = isAlreadyNested ? (p2.fert_labour || {}) : (input.p2_fert_labour || {});
  const transplant2 = isAlreadyNested ? (p2.translanting || {}) : (input.p2_labour || {});
  const water2 = isAlreadyNested ? (p2.water || {}) : (input.p3_water || {});

  // Phase 3 Tasks
  const herbicide3 = isAlreadyNested ? (p3.herbicide || {}) : (input.p3_herbicide || {});
  const replant3 = isAlreadyNested ? (p3.replanting_labour || {}) : (input.p1_weed || {});
  const deweed3 = isAlreadyNested ? (p3.deweeding || {}) : (input.p3_deweeding || {});
  const pest1_3 = isAlreadyNested ? (p3.pesticide_Dose_1 || {}) : (input.p1_fert || {});
  const pest2_3 = isAlreadyNested ? (p3.pesticide_Dose_2 || {}) : (input.p2_tillering || {});
  const fert3_3 = isAlreadyNested ? (p3.fertilizer || {}) : (input.p3_fert_dose3 || {});
  const potash3 = isAlreadyNested ? (p3.potash_sulphide_fertilizer || {}) : (input.p3_potash_sulphide || {});

  // Phase 4 Tasks
  const harvest4 = isAlreadyNested ? (p4.harvest || {}) : (input.p4_harvest || {});
  const gunny4 = isAlreadyNested ? (p4.gunny_bags || {}) : (input.p4_gunny_bags || {});
  const labour4 = isAlreadyNested ? (p4.bagging_labour || {}) : (input.p4_labour || {});
  const sack4 = isAlreadyNested ? (p4.sack_stitcher || {}) : (input.p4_sack_stitcher || {});
  const transport4 = isAlreadyNested ? (p4.transport || {}) : (input.p4_transport || {});

  // Phase 5 Tasks
  const grain5 = isAlreadyNested ? (p5.grain_yield || {}) : (input.p5_grain_yield || {});
  const straw5 = isAlreadyNested ? (p5.straw_yield || {}) : (input.p5_straw_yield || {});

  return {
    phase_1: {
      tractor: {
        ratePerCent: tractor1.ratePerCent ?? 50,
        days: tractor1.days ?? 5,
        isEnabled: tractor1.isEnabled !== false,
      },
      seed: {
        seedCost: seed1.seedCost ?? (seed1.ratePerCent ?? 20),
        days: seed1.days ?? 20,
        TravelcostPer: seed1.TravelcostPer ?? (seed1.travelCost ?? 100),
        isTravelCost: seed1.isTravelCost !== false && seed1.hasTravelCost !== false,
        isEnabled: seed1.isEnabled !== false,
      },
      fuel: {
        ratePerCent: fuel1.ratePerCent ?? 20,
        days: fuel1.days ?? 10,
        isEnabled: fuel1.isEnabled !== false,
        hasRepairCost: Boolean(fuel1.hasRepairCost),
        mechanicName: fuel1.mechanicName || '',
        mechanicNumber: fuel1.mechanicNumber || '',
        repairCost: Number(fuel1.repairCost) || 0,
      },
      bund_labour: (() => {
        const bund1Entries = normalizeDailyLabourEntries(bund1);
        const day1 = bund1Entries.find((d) => d.day === 1) || bund1Entries[0] || {
          labourCount: bund1.labourCount ?? 4,
          labourWage: bund1.labourWage ?? 500,
          snackCost: bund1.snackCost ?? 200,
          travelCost: bund1.travelCost ?? 150,
        };
        return {
          days: bund1Entries.length || bund1.days || 1,
          labourCount: day1.labourCount ?? 4,
          labourWage: day1.labourWage ?? 500,
          snackCost: day1.snackCost ?? 200,
          travelCost: day1.travelCost ?? 150,
          ...buildDayWiseLabourObject(bund1Entries),
          isEnabled: bund1.isEnabled !== false,
        };
      })(),
      plotting_labour: (() => {
        const plot1Entries = normalizeDailyLabourEntries(plot1);
        const day1 = plot1Entries.find((d) => d.day === 1) || plot1Entries[0] || {
          labourCount: plot1.labourCount ?? 4,
          labourWage: plot1.labourWage ?? 500,
          snackCost: plot1.snackCost ?? 200,
          travelCost: plot1.travelCost ?? 150,
        };
        return {
          days: plot1Entries.length || plot1.days || 1,
          labourCount: day1.labourCount ?? 4,
          labourWage: day1.labourWage ?? 500,
          snackCost: day1.snackCost ?? 200,
          travelCost: day1.travelCost ?? 150,
          ...buildDayWiseLabourObject(plot1Entries),
          isEnabled: plot1.isEnabled !== false,
        };
      })(),
    },
    phase_2: {
      tractor: {
        ratePerCent: tractor2.ratePerCent ?? 50,
        days: tractor2.days ?? 5,
        isEnabled: tractor2.isEnabled !== false,
      },
      bund_labour: (() => {
        const bund2Entries = normalizeDailyLabourEntries(bund2);
        const day1 = bund2Entries.find((d) => d.day === 1) || bund2Entries[0] || {
          labourCount: bund2.labourCount ?? 4,
          labourWage: bund2.labourWage ?? 500,
          snackCost: bund2.snackCost ?? 200,
          travelCost: bund2.travelCost ?? 150,
        };
        return {
          days: bund2Entries.length || bund2.days || 1,
          labourCount: day1.labourCount ?? 4,
          labourWage: day1.labourWage ?? 500,
          snackCost: day1.snackCost ?? 200,
          travelCost: day1.travelCost ?? 150,
          ...buildDayWiseLabourObject(bund2Entries),
          isEnabled: bund2.isEnabled !== false,
        };
      })(),
      fert_labour: (() => {
        const fertEntries = normalizeDailyLabourEntries(fert2);
        return {
          fertQty: Number(fert2.fertQty) || 2,
          fertPrice: Number(fert2.fertPrice) || 400,
          ...buildDayWiseLabourObject(fertEntries),
          isEnabled: fert2.isEnabled !== false,
        };
      })(),
      translanting: (() => {
        const transEntries = normalizeDailyLabourEntries(transplant2);
        return {
          isManual:
            transplant2.isManual !== undefined
              ? transplant2.isManual
              : transplant2.isMachineMode !== undefined
                ? !transplant2.isMachineMode
                : false,
          machineCost: transplant2.machineCost ?? (transplant2.ratePerCent ?? 290),
          ...buildDayWiseLabourObject(transEntries),
          isEnabled: transplant2.isEnabled !== false,
        };
      })(),
      water: {
        waterCost: water2.waterCost ?? (water2.ratePerCent ?? 14),
        days: water2.days ?? 30,
        isEnabled: water2.isEnabled !== false,
      },
    },
    phase_3: {
      herbicide: (() => {
        const herbicideEntries = normalizeDailyLabourEntries(herbicide3, 3);
        return {
          ...buildDayWiseLabourObject(herbicideEntries, 3),
          Herbicide_notify: herbicide3.Herbicide_notify ?? (herbicide3.herbicideNotify ?? true),
          isEnabled: herbicide3.isEnabled !== false,
        };
      })(),
      replanting_labour: (() => {
        const replantEntries = normalizeDailyLabourEntries(replant3);
        const day1 = replantEntries.find((d) => d.day === 1) || replantEntries[0] || {
          labourCount: replant3.labourCount ?? 4,
          labourWage: replant3.labourWage ?? 450,
          snackCost: replant3.snackCost ?? 200,
          travelCost: replant3.travelCost ?? 150,
        };
        return {
          days: replantEntries.length || replant3.days || 1,
          labourCount: day1.labourCount ?? 4,
          labourWage: day1.labourWage ?? 450,
          snackCost: day1.snackCost ?? 200,
          travelCost: day1.travelCost ?? 150,
          ...buildDayWiseLabourObject(replantEntries),
          isEnabled: replant3.isEnabled !== false,
        };
      })(),
      deweeding: (() => {
        const deweedEntries = normalizeDailyLabourEntries(deweed3);
        const day1 = deweedEntries.find((d) => d.day === 1) || deweedEntries[0] || {
          labourCount: deweed3.labourCount ?? 4,
          labourWage: deweed3.labourWage ?? 450,
          snackCost: deweed3.snackCost ?? 200,
          travelCost: deweed3.travelCost ?? 150,
        };
        return {
          days: deweedEntries.length || deweed3.days || 1,
          labourCount: day1.labourCount ?? 4,
          labourWage: day1.labourWage ?? 450,
          snackCost: day1.snackCost ?? 200,
          travelCost: day1.travelCost ?? 150,
          ...buildDayWiseLabourObject(deweedEntries),
          isEnabled: deweed3.isEnabled !== false,
        };
      })(),
      pesticide_Dose_1: {
        days: pest1_3.days ?? 3,
        labourCount: pest1_3.labourCount ?? 2,
        labourWage: pest1_3.labourWage ?? 500,
        fertQty: pest1_3.fertQty ?? 50,
        fertPrice: pest1_3.fertPrice ?? 30,
        pesticideMl: pest1_3.pesticideMl,
        isExtraCost: true,
        snackCost: pest1_3.snackCost ?? 200,
        travelCost: pest1_3.travelCost ?? 150,
        pesticide_notify: pest1_3.pesticide_notify ?? (pest1_3.pesticideNotify ?? true),
        isEnabled: pest1_3.isEnabled !== false,
      },
      pesticide_Dose_2: {
        days: pest2_3.days ?? 3,
        labourCount: pest2_3.labourCount ?? 2,
        labourWage: pest2_3.labourWage ?? 500,
        fertQty: pest2_3.fertQty ?? 50,
        fertPrice: pest2_3.fertPrice ?? 30,
        pesticideMl: pest2_3.pesticideMl,
        isExtraCost: true,
        snackCost: pest2_3.snackCost ?? 200,
        travelCost: pest2_3.travelCost ?? 150,
        pesticide_notify: pest2_3.pesticide_notify ?? (pest2_3.pesticideNotify ?? true),
        isEnabled: pest2_3.isEnabled !== false,
      },
      fertilizer: {
        days: fert3_3.days ?? 3,
        labourCount: fert3_3.labourCount ?? 2,
        labourWage: fert3_3.labourWage ?? 500,
        fertQty: fert3_3.fertQty ?? 50,
        fertPrice: fert3_3.fertPrice ?? 30,
        isExtraCost: true,
        snackCost: fert3_3.snackCost ?? 200,
        travelCost: fert3_3.travelCost ?? 150,
        fertilizer_notify: fert3_3.fertilizer_notify ?? (fert3_3.fertilizerNotify ?? true),
        isEnabled: fert3_3.isEnabled !== false,
      },
      potash_sulphide_fertilizer: {
        days: potash3.days ?? 3,
        labourCount: potash3.labourCount ?? 2,
        labourWage: potash3.labourWage ?? 500,
        fertQty: potash3.fertQty ?? 50,
        fertPrice: potash3.fertPrice ?? 30,
        isExtraCost: true,
        snackCost: potash3.snackCost ?? 200,
        travelCost: potash3.travelCost ?? 150,
        fertilizer_notify: potash3.fertilizer_notify ?? (potash3.fertilizerNotify ?? true),
        isEnabled: potash3.isEnabled !== false,
      },
    },
    phase_4: {
      harvest: (() => {
        const harvestEntries = normalizeDailyHarvestEntries(harvest4);
        const day1 = harvestEntries.find((d) => d.day === 1) || harvestEntries[0] || {
          ratePerCent: harvest4.harvest_cost ?? harvest4.ratePerCent ?? 0,
        };
        const totalHarvestCost = harvestEntries.reduce((sum, d) => sum + (d.ratePerCent ?? 0), 0);
        return {
          days: harvest4.days ?? harvestEntries.length ?? 1,
          harvest_cost: totalHarvestCost > 0 ? totalHarvestCost : (harvest4.harvest_cost ?? (harvest4.ratePerCent ?? 760)),
          ratePerCent: day1.ratePerCent ?? harvest4.ratePerCent ?? 0,
          ...buildDayWiseHarvestObject(harvestEntries),
          isEnabled: harvest4.isEnabled !== false,
        };
      })(),
      gunny_bags: (() => {
        const gunnyEntries = normalizeDailyGunnyEntries(gunny4);
        const day1 = gunnyEntries.find((d) => d.day === 1) || gunnyEntries[0] || {
          bagCount: gunny4.bagCount ?? 120,
          bagPrice: gunny4.bagPrice ?? 20,
        };
        const totalBags = gunnyEntries.reduce((sum, d) => sum + (d.bagCount ?? 0), 0);
        return {
          days: gunny4.days ?? gunnyEntries.length ?? 1,
          isPlasticBag: gunny4.isPlasticBag !== undefined ? gunny4.isPlasticBag : (gunny4.isPlastic !== false),
          bagCount: totalBags > 0 ? totalBags : (gunny4.bagCount ?? 120),
          bagPrice: day1.bagPrice ?? gunny4.bagPrice ?? 20,
          ...buildDayWiseGunnyObject(gunnyEntries),
          isEnabled: gunny4.isEnabled !== false,
        };
      })(),
      bagging_labour: (() => {
        const labour4Entries = normalizeDailyLabourEntries(labour4);
        const day1 = labour4Entries.find((d) => d.day === 1) || labour4Entries[0] || {
          labourCount: labour4.labourCount ?? 6,
          labourWage: labour4.labourWage ?? 550,
          snackCost: labour4.snackCost ?? 200,
          travelCost: labour4.travelCost ?? 150,
        };
        return {
          days: labour4.days ?? labour4Entries.length ?? 1,
          labourCount: day1.labourCount ?? 6,
          labourWage: day1.labourWage ?? 550,
          snackCost: day1.snackCost ?? 200,
          travelCost: day1.travelCost ?? 150,
          ...buildDayWiseLabourObject(labour4Entries),
          isEnabled: labour4.isEnabled !== false,
        };
      })(),
      sack_stitcher: (() => {
        const sack4Entries = normalizeDailyLabourEntries(sack4);
        const day1 = sack4Entries.find((d) => d.day === 1) || sack4Entries[0] || {
          labourCount: sack4.labourCount ?? 2,
          labourWage: sack4.labourWage ?? 500,
          snackCost: sack4.snackCost ?? 150,
          travelCost: sack4.travelCost ?? 150,
        };
        return {
          days: sack4.days ?? sack4Entries.length ?? 1,
          labourCount: day1.labourCount ?? 2,
          labourWage: day1.labourWage ?? 500,
          snackCost: day1.snackCost ?? 150,
          travelCost: day1.travelCost ?? 150,
          ...buildDayWiseLabourObject(sack4Entries),
          isEnabled: sack4.isEnabled !== false,
        };
      })(),
      transport: (() => {
        const transportEntries = normalizeDailyTransportEntries(transport4);
        const day1 = transportEntries.find((d) => d.day === 1) || transportEntries[0] || {
          bagCount: transport4.bagCount ?? (transport4.transportRent ?? 120),
          loadingWorkers: transport4.loadingWorkers ?? 15,
          perBagLiftingCost: transport4.perBagLiftingCost ?? (transport4.loadingWorkers ?? 15),
          snackCost: transport4.snackCost ?? (transport4.loadingSnacks ?? 150),
        };
        const count = day1.bagCount ?? day1.transportRent ?? transport4.bagCount ?? 120;
        const liftingCost = day1.perBagLiftingCost ?? day1.loadingWorkers ?? transport4.perBagLiftingCost ?? 15;
        const totalBags = transportEntries.reduce((sum, d) => sum + (d.bagCount ?? d.transportRent ?? 0), 0);
        return {
          days: transport4.days ?? transportEntries.length ?? 1,
          bagCount: totalBags > 0 ? totalBags : count,
          transportRent: totalBags > 0 ? totalBags : count,
          loadingLabourCount: liftingCost,
          loadingWorkers: liftingCost,
          perBagLiftingCost: liftingCost,
          snackCost: day1.loadingSnacks ?? day1.snackCost ?? transport4.loadingSnacks ?? 150,
          ...buildDayWiseTransportObject(transportEntries),
          isEnabled: transport4.isEnabled !== false,
        };
      })(),
    },
    phase_5: {
      grain_yield: {
        days: grain5.days ?? 10,
        total_yieldKg: grain5.total_yieldKg ?? (grain5.yieldKg ?? ((grain5.yieldTons ?? 10.5) * 1000)),
        bagWeightKg: grain5.bagWeightKg ?? 75,
        pricePerBag: grain5.pricePerBag ?? (grain5.grainBagPrice ?? 1650),
        isEnabled: grain5.isEnabled !== false,
      },
      straw_yield: {
        days: straw5.days ?? 8,
        SackCount: straw5.SackCount ?? (straw5.strawSackCount ?? 100),
        SackPrice: straw5.SackPrice ?? (straw5.strawPrice ?? 150),
        isEnabled: straw5.isEnabled !== false,
      },
    },
  };
}

/**
 * Formats flat UI task expenses or validates nested expenses into the canonical 5-phase nested structure.
 * Supports both signatures:
 *   formatToNestedExpenseMap(flat, landSize)
 *   formatToNestedExpenseMap(cultivation, flat, landSize)
 */
export function formatToNestedExpenseMap(
  arg1: any,
  arg2?: any,
  arg3?: any
): Record<string, Record<string, any>> {
  if (typeof arg1 === 'string') {
    return normalizeOrFormatNestedExpenseMap(arg2 || {}, typeof arg3 === 'number' ? arg3 : 100);
  }
  return normalizeOrFormatNestedExpenseMap(arg1 || {}, typeof arg2 === 'number' ? arg2 : 100);
}

/** Converts nested phase-wise expenses back to flat UI tasks */
export function nestedToFlatExpenseMap(
  nested: Record<string, any>,
  cultivation: CultivationType = 'paddy',
  landSize: number = 100
): Record<string, ExpenseEntry> {
  const cents = landSize > 0 ? landSize : 100;
  const result: Record<string, ExpenseEntry> = {};

  if (!nested || !nested.phase_1) return result;

  const norm = normalizeOrFormatNestedExpenseMap(nested, cents);
  const p1 = norm.phase_1;
  const p2 = norm.phase_2;
  const p3 = norm.phase_3;
  const p4 = norm.phase_4;
  const p5 = norm.phase_5;

  // Phase 1
  const tCost = Math.round(p1.tractor.ratePerCent ?? 0);
  result['p1_tractor'] = {
    ratePerCent: p1.tractor.ratePerCent,
    days: p1.tractor.days,
    totalCost: tCost,
    costPerDay: p1.tractor.days > 0 ? Math.round(tCost / p1.tractor.days) : 0,
    isEnabled: p1.tractor.isEnabled !== false,
  };

  const sCost = Math.round(p1.seed.seedCost + (p1.seed.isTravelCost ? p1.seed.TravelcostPer : 0));
  result['p1_nursery'] = {
    ratePerCent: p1.seed.seedCost,
    days: p1.seed.days,
    travelCost: p1.seed.TravelcostPer,
    hasTravelCost: p1.seed.isTravelCost,
    totalCost: sCost,
    costPerDay: p1.seed.days > 0 ? Math.round(sCost / p1.seed.days) : 0,
    isEnabled: p1.seed.isEnabled !== false,
  };

  const fRepair = (p1.fuel as any)?.hasRepairCost ? (Number((p1.fuel as any)?.repairCost) || 0) : 0;
  const fCost = Math.round(p1.fuel.ratePerCent + fRepair);
  result['p1_fuel'] = {
    ratePerCent: p1.fuel.ratePerCent,
    days: p1.fuel.days,
    totalCost: fCost,
    costPerDay: p1.fuel.days > 0 ? Math.round(fCost / p1.fuel.days) : 0,
    isEnabled: p1.fuel.isEnabled !== false,
    hasRepairCost: Boolean((p1.fuel as any)?.hasRepairCost),
    mechanicName: (p1.fuel as any)?.mechanicName || '',
    mechanicNumber: (p1.fuel as any)?.mechanicNumber || '',
    repairCost: Number((p1.fuel as any)?.repairCost) || 0,
  };

  const bund1Entries = normalizeDailyLabourEntries(p1.bund_labour);
  const bund1LabourCost = bund1Entries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
  const bund1Day1 = bund1Entries.find((d) => d.day === 1) || bund1Entries[0] || {
    day: 1,
    labourCount: p1.bund_labour.labourCount ?? 4,
    labourWage: p1.bund_labour.labourWage ?? 500,
    snackCost: p1.bund_labour.snackCost ?? 200,
    travelCost: p1.bund_labour.travelCost ?? 150,
  };
  const b1Cost = bund1LabourCost > 0
    ? bund1LabourCost
    : (p1.bund_labour.labourCount * p1.bund_labour.labourWage + p1.bund_labour.snackCost + p1.bund_labour.travelCost);
  const b1DaysCount = bund1Entries.length || p1.bund_labour.days || 1;
  result['p1_bund_labour'] = {
    ratePerCent: 0,
    days: b1DaysCount,
    activeDay: 1,
    dayEntries: bund1Entries,
    labourCount: bund1Day1.labourCount,
    labourWage: bund1Day1.labourWage,
    snackCost: bund1Day1.snackCost,
    travelCost: bund1Day1.travelCost,
    totalCost: b1Cost,
    costPerDay: b1DaysCount > 0 ? Math.round(b1Cost / b1DaysCount) : 0,
    isEnabled: p1.bund_labour.isEnabled !== false,
  };

  const pl1Entries = normalizeDailyLabourEntries(p1.plotting_labour);
  const pl1LabourCost = pl1Entries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
  const pl1Day1 = pl1Entries.find((d) => d.day === 1) || pl1Entries[0] || {
    day: 1,
    labourCount: p1.plotting_labour.labourCount ?? 4,
    labourWage: p1.plotting_labour.labourWage ?? 500,
    snackCost: p1.plotting_labour.snackCost ?? 200,
    travelCost: p1.plotting_labour.travelCost ?? 150,
  };
  const pl1Cost = pl1LabourCost > 0
    ? pl1LabourCost
    : (p1.plotting_labour.labourCount * p1.plotting_labour.labourWage + p1.plotting_labour.snackCost + p1.plotting_labour.travelCost);
  const pl1DaysCount = pl1Entries.length || p1.plotting_labour.days || 1;
  result['p1_plotting_labour'] = {
    ratePerCent: 0,
    days: pl1DaysCount,
    activeDay: 1,
    dayEntries: pl1Entries,
    labourCount: pl1Day1.labourCount,
    labourWage: pl1Day1.labourWage,
    snackCost: pl1Day1.snackCost,
    travelCost: pl1Day1.travelCost,
    totalCost: pl1Cost,
    costPerDay: pl1DaysCount > 0 ? Math.round(pl1Cost / pl1DaysCount) : 0,
    isEnabled: p1.plotting_labour.isEnabled !== false,
  };

  // Phase 2
  const t2Cost = Math.round(p2.tractor.ratePerCent ?? 0);
  result['p2_tractor'] = {
    ratePerCent: p2.tractor.ratePerCent,
    days: p2.tractor.days,
    totalCost: t2Cost,
    costPerDay: p2.tractor.days > 0 ? Math.round(t2Cost / p2.tractor.days) : 0,
    isEnabled: p2.tractor.isEnabled !== false,
  };

  const b2Entries = normalizeDailyLabourEntries(p2.bund_labour);
  const b2LabourCost = b2Entries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
  const b2Day1 = b2Entries.find((d) => d.day === 1) || b2Entries[0] || {
    day: 1,
    labourCount: p2.bund_labour.labourCount ?? 4,
    labourWage: p2.bund_labour.labourWage ?? 500,
    snackCost: p2.bund_labour.snackCost ?? 200,
    travelCost: p2.bund_labour.travelCost ?? 150,
  };
  const b2Cost = b2LabourCost > 0
    ? b2LabourCost
    : (p2.bund_labour.labourCount * p2.bund_labour.labourWage + p2.bund_labour.snackCost + p2.bund_labour.travelCost);
  const b2DaysCount = b2Entries.length || p2.bund_labour.days || 1;
  result['p2_bund_labour'] = {
    ratePerCent: 0,
    days: b2DaysCount,
    activeDay: 1,
    dayEntries: b2Entries,
    labourCount: b2Day1.labourCount,
    labourWage: b2Day1.labourWage,
    snackCost: b2Day1.snackCost,
    travelCost: b2Day1.travelCost,
    totalCost: b2Cost,
    costPerDay: b2DaysCount > 0 ? Math.round(b2Cost / b2DaysCount) : 0,
    isEnabled: p2.bund_labour.isEnabled !== false,
  };

  const fert2Entries = normalizeDailyLabourEntries(p2.fert_labour);
  const fert2LabourCost = fert2Entries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
  const fert2Day1 = fert2Entries.find((d) => d.day === 1) || fert2Entries[0] || {
    day: 1,
    labourCount: 0,
    labourWage: 0,
    snackCost: 0,
    travelCost: 0,
  };
  const f2FertQty = p2.fert_labour.fertQty !== undefined ? Number(p2.fert_labour.fertQty) : 2;
  const f2FertPrice = p2.fert_labour.fertPrice !== undefined ? Number(p2.fert_labour.fertPrice) : 400;
  const f2DaysCount = fert2Entries.length || p2.fert_labour.totalDays || p2.fert_labour.days || 1;
  const f2Cost = Math.round(f2FertPrice + fert2LabourCost);

  result['p2_fert_labour'] = {
    ratePerCent: 0,
    days: f2DaysCount,
    activeDay: 1,
    dayEntries: fert2Entries,
    fertQty: f2FertQty,
    fertPrice: f2FertPrice,
    labourCount: fert2Day1.labourCount,
    labourWage: fert2Day1.labourWage,
    snackCost: fert2Day1.snackCost,
    travelCost: fert2Day1.travelCost,
    totalCost: f2Cost,
    costPerDay: f2DaysCount > 0 ? Math.round(f2Cost / f2DaysCount) : 0,
    isEnabled: p2.fert_labour.isEnabled !== false,
  };

  const isManual = p2.translanting.isManual;
  const transEntries = normalizeDailyLabourEntries(p2.translanting);
  const manualTransCost = transEntries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
  const trCost = isManual ? manualTransCost : Math.round(p2.translanting.machineCost);
  const transDaysCount = isManual ? (transEntries.length || 1) : (p2.translanting.totalDays || p2.translanting.days || 1);
  const transDay1 = transEntries.find((d) => d.day === 1) || transEntries[0] || {
    day: 1,
    labourCount: 0,
    labourWage: 0,
    snackCost: 0,
    travelCost: 0,
  };
  result['p2_labour'] = {
    ratePerCent: isManual ? 0 : p2.translanting.machineCost,
    days: transDaysCount,
    activeDay: 1,
    dayEntries: transEntries,
    isMachineMode: !isManual,
    labourCount: transDay1.labourCount,
    labourWage: transDay1.labourWage,
    snackCost: transDay1.snackCost,
    travelCost: transDay1.travelCost,
    totalCost: trCost,
    costPerDay: transDaysCount > 0 ? Math.round(trCost / transDaysCount) : 0,
    isEnabled: p2.translanting.isEnabled !== false,
  };

  const wCost = Math.round(p2.water.waterCost);
  result['p3_water'] = {
    ratePerCent: p2.water.waterCost,
    days: p2.water.days,
    totalCost: wCost,
    costPerDay: p2.water.days > 0 ? Math.round(wCost / p2.water.days) : 0,
    isEnabled: p2.water.isEnabled !== false,
  };

  // Phase 3
  const herbicideEntries = normalizeDailyLabourEntries(p3.herbicide, 3);
  const hCost = herbicideEntries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
  const hDaysCount = herbicideEntries.length || 1;
  const hDay1 = herbicideEntries.find((d) => d.day === 1) || herbicideEntries[0] || {
    day: 1,
    labourCount: 0,
    labourWage: 0,
    snackCost: 0,
    travelCost: 0,
  };
  result['p3_herbicide'] = {
    ratePerCent: 0,
    days: hDaysCount,
    activeDay: 1,
    dayEntries: herbicideEntries,
    labourCount: hDay1.labourCount,
    labourWage: hDay1.labourWage,
    snackCost: hDay1.snackCost,
    travelCost: hDay1.travelCost,
    herbicideNotify: p3.herbicide.Herbicide_notify ?? true,
    totalCost: hCost,
    costPerDay: hDaysCount > 0 ? Math.round(hCost / hDaysCount) : 0,
    isEnabled: p3.herbicide.isEnabled !== false,
  };

  const replantEntries = normalizeDailyLabourEntries(p3.replanting_labour);
  const repDay1 = replantEntries.find((d) => d.day === 1) || replantEntries[0] || {
    labourCount: p3.replanting_labour.labourCount ?? 4,
    labourWage: p3.replanting_labour.labourWage ?? 450,
    snackCost: p3.replanting_labour.snackCost ?? 200,
    travelCost: p3.replanting_labour.travelCost ?? 150,
  };
  const repCost = replantEntries.length > 0
    ? replantEntries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0)
    : (p3.replanting_labour.labourCount * p3.replanting_labour.labourWage + p3.replanting_labour.snackCost + p3.replanting_labour.travelCost);
  const repDaysCount = replantEntries.length || p3.replanting_labour.days || 1;
  result['p1_weed'] = {
    ratePerCent: 0,
    days: repDaysCount,
    activeDay: 1,
    dayEntries: replantEntries.length > 0 ? replantEntries : [
      {
        day: 1,
        labourCount: repDay1.labourCount ?? 4,
        labourWage: repDay1.labourWage ?? 450,
        snackCost: repDay1.snackCost ?? 200,
        travelCost: repDay1.travelCost ?? 150,
      },
    ],
    labourCount: repDay1.labourCount,
    labourWage: repDay1.labourWage,
    snackCost: repDay1.snackCost,
    travelCost: repDay1.travelCost,
    totalCost: repCost,
    costPerDay: repDaysCount > 0 ? Math.round(repCost / repDaysCount) : 0,
    isEnabled: p3.replanting_labour.isEnabled !== false,
  };

  const deweedEntries = normalizeDailyLabourEntries(p3.deweeding);
  const dwDay1 = deweedEntries.find((d) => d.day === 1) || deweedEntries[0] || {
    labourCount: p3.deweeding.labourCount ?? 4,
    labourWage: p3.deweeding.labourWage ?? 450,
    snackCost: p3.deweeding.snackCost ?? 200,
    travelCost: p3.deweeding.travelCost ?? 150,
  };
  const dwCost = deweedEntries.length > 0
    ? deweedEntries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0)
    : (p3.deweeding.labourCount * p3.deweeding.labourWage + p3.deweeding.snackCost + p3.deweeding.travelCost);
  const dwDaysCount = deweedEntries.length || p3.deweeding.days || 1;
  result['p3_deweeding'] = {
    ratePerCent: 0,
    days: dwDaysCount,
    activeDay: 1,
    dayEntries: deweedEntries.length > 0 ? deweedEntries : [
      {
        day: 1,
        labourCount: dwDay1.labourCount ?? 4,
        labourWage: dwDay1.labourWage ?? 450,
        snackCost: dwDay1.snackCost ?? 200,
        travelCost: dwDay1.travelCost ?? 150,
      },
    ],
    labourCount: dwDay1.labourCount,
    labourWage: dwDay1.labourWage,
    snackCost: dwDay1.snackCost,
    travelCost: dwDay1.travelCost,
    totalCost: dwCost,
    costPerDay: dwDaysCount > 0 ? Math.round(dwCost / dwDaysCount) : 0,
    isEnabled: p3.deweeding.isEnabled !== false,
  };

  const p1Cost = Math.round(p3.pesticide_Dose_1.fertPrice + p3.pesticide_Dose_1.labourCount * p3.pesticide_Dose_1.labourWage + p3.pesticide_Dose_1.snackCost + p3.pesticide_Dose_1.travelCost);
  result['p1_fert'] = {
    ratePerCent: 0,
    days: p3.pesticide_Dose_1.days,
    labourCount: p3.pesticide_Dose_1.labourCount,
    labourWage: p3.pesticide_Dose_1.labourWage,
    snackCost: p3.pesticide_Dose_1.snackCost,
    travelCost: p3.pesticide_Dose_1.travelCost,
    fertQty: p3.pesticide_Dose_1.fertQty,
    fertPrice: p3.pesticide_Dose_1.fertPrice,
    pesticideMl: p3.pesticide_Dose_1.pesticideMl,
    pesticideNotify: p3.pesticide_Dose_1.pesticide_notify ?? true,
    totalCost: p1Cost,
    costPerDay: p3.pesticide_Dose_1.days > 0 ? Math.round(p1Cost / p3.pesticide_Dose_1.days) : 0,
    isEnabled: p3.pesticide_Dose_1.isEnabled !== false,
  };

  const p2Cost = Math.round(p3.pesticide_Dose_2.fertPrice + p3.pesticide_Dose_2.labourCount * p3.pesticide_Dose_2.labourWage + p3.pesticide_Dose_2.snackCost + p3.pesticide_Dose_2.travelCost);
  result['p2_tillering'] = {
    ratePerCent: 0,
    days: p3.pesticide_Dose_2.days,
    labourCount: p3.pesticide_Dose_2.labourCount,
    labourWage: p3.pesticide_Dose_2.labourWage,
    snackCost: p3.pesticide_Dose_2.snackCost,
    travelCost: p3.pesticide_Dose_2.travelCost,
    fertQty: p3.pesticide_Dose_2.fertQty,
    fertPrice: p3.pesticide_Dose_2.fertPrice,
    pesticideMl: p3.pesticide_Dose_2.pesticideMl,
    pesticideNotify: p3.pesticide_Dose_2.pesticide_notify ?? true,
    totalCost: p2Cost,
    costPerDay: p3.pesticide_Dose_2.days > 0 ? Math.round(p2Cost / p3.pesticide_Dose_2.days) : 0,
    isEnabled: p3.pesticide_Dose_2.isEnabled !== false,
  };

  const f3Cost = Math.round(p3.fertilizer.fertPrice + p3.fertilizer.labourCount * p3.fertilizer.labourWage + p3.fertilizer.snackCost + p3.fertilizer.travelCost);
  result['p3_fert_dose3'] = {
    ratePerCent: 0,
    days: p3.fertilizer.days,
    labourCount: p3.fertilizer.labourCount,
    labourWage: p3.fertilizer.labourWage,
    snackCost: p3.fertilizer.snackCost,
    travelCost: p3.fertilizer.travelCost,
    fertQty: p3.fertilizer.fertQty,
    fertPrice: p3.fertilizer.fertPrice,
    fertilizerNotify: p3.fertilizer.fertilizer_notify ?? true,
    totalCost: f3Cost,
    costPerDay: p3.fertilizer.days > 0 ? Math.round(f3Cost / p3.fertilizer.days) : 0,
    isEnabled: p3.fertilizer.isEnabled !== false,
  };

  const potCost = Math.round(p3.potash_sulphide_fertilizer.fertQty * p3.potash_sulphide_fertilizer.fertPrice + p3.potash_sulphide_fertilizer.labourCount * p3.potash_sulphide_fertilizer.labourWage + p3.potash_sulphide_fertilizer.snackCost + p3.potash_sulphide_fertilizer.travelCost);
  result['p3_potash_sulphide'] = {
    ratePerCent: 0,
    days: p3.potash_sulphide_fertilizer.days,
    labourCount: p3.potash_sulphide_fertilizer.labourCount,
    labourWage: p3.potash_sulphide_fertilizer.labourWage,
    snackCost: p3.potash_sulphide_fertilizer.snackCost,
    travelCost: p3.potash_sulphide_fertilizer.travelCost,
    fertQty: p3.potash_sulphide_fertilizer.fertQty,
    fertPrice: p3.potash_sulphide_fertilizer.fertPrice,
    fertilizerNotify: p3.potash_sulphide_fertilizer.fertilizer_notify ?? true,
    totalCost: potCost,
    costPerDay: p3.potash_sulphide_fertilizer.days > 0 ? Math.round(potCost / p3.potash_sulphide_fertilizer.days) : 0,
    isEnabled: p3.potash_sulphide_fertilizer.isEnabled !== false,
  };

  // Phase 4
  const harvestEntries = normalizeDailyHarvestEntries(p4.harvest);
  const harvestDay1 = harvestEntries.find((d) => d.day === 1) || harvestEntries[0] || { ratePerCent: p4.harvest.harvest_cost ?? 760 };
  const h4Cost = harvestEntries.length > 0
    ? harvestEntries.reduce((sum, d) => sum + (d.ratePerCent ?? 0), 0)
    : Math.round(p4.harvest.harvest_cost ?? 760);
  const harvestDaysCount = harvestEntries.length || p4.harvest.days || 1;
  result['p4_harvest'] = {
    ratePerCent: harvestDay1.ratePerCent ?? p4.harvest.harvest_cost ?? 760,
    days: harvestDaysCount,
    activeDay: 1,
    dayEntries: harvestEntries,
    totalCost: h4Cost,
    costPerDay: harvestDaysCount > 0 ? Math.round(h4Cost / harvestDaysCount) : 0,
    isEnabled: p4.harvest.isEnabled !== false,
  };

  const gunnyEntries = normalizeDailyGunnyEntries(p4.gunny_bags);
  const gDay1 = gunnyEntries.find((d) => d.day === 1) || gunnyEntries[0] || { bagCount: p4.gunny_bags.bagCount ?? 120, bagPrice: p4.gunny_bags.bagPrice ?? 20 };
  const gCost = gunnyEntries.length > 0
    ? gunnyEntries.reduce((sum, d) => sum + ((d.bagCount ?? 0) * (d.bagPrice ?? 0)), 0)
    : Math.round((p4.gunny_bags.bagCount ?? 120) * (p4.gunny_bags.bagPrice ?? 20));
  const gDaysCount = gunnyEntries.length || p4.gunny_bags.days || 1;
  result['p4_gunny_bags'] = {
    ratePerCent: 0,
    days: gDaysCount,
    activeDay: 1,
    dayEntries: gunnyEntries,
    isPlasticBag: p4.gunny_bags.isPlasticBag,
    bagCount: gDay1.bagCount ?? p4.gunny_bags.bagCount ?? 120,
    bagPrice: gDay1.bagPrice ?? p4.gunny_bags.bagPrice ?? 20,
    totalCost: gCost,
    costPerDay: gDaysCount > 0 ? Math.round(gCost / gDaysCount) : 0,
    isEnabled: p4.gunny_bags.isEnabled !== false,
  };

  const labour4Entries = normalizeDailyLabourEntries(p4.bagging_labour);
  const l4Day1 = labour4Entries.find((d) => d.day === 1) || labour4Entries[0] || {
    labourCount: p4.bagging_labour.labourCount ?? 6,
    labourWage: p4.bagging_labour.labourWage ?? 550,
    snackCost: p4.bagging_labour.snackCost ?? 200,
    travelCost: p4.bagging_labour.travelCost ?? 150,
  };
  const b4Cost = labour4Entries.length > 0
    ? labour4Entries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0)
    : (p4.bagging_labour.labourCount * p4.bagging_labour.labourWage + p4.bagging_labour.snackCost + (p4.bagging_labour.travelCost ?? 0));
  const l4DaysCount = labour4Entries.length || p4.bagging_labour.days || 1;
  result['p4_labour'] = {
    ratePerCent: 0,
    days: l4DaysCount,
    activeDay: 1,
    dayEntries: labour4Entries,
    labourCount: l4Day1.labourCount,
    labourWage: l4Day1.labourWage,
    snackCost: l4Day1.snackCost,
    travelCost: l4Day1.travelCost ?? 0,
    totalCost: b4Cost,
    costPerDay: l4DaysCount > 0 ? Math.round(b4Cost / l4DaysCount) : 0,
    isEnabled: p4.bagging_labour.isEnabled !== false,
  };

  const sack4Entries = normalizeDailyLabourEntries(p4.sack_stitcher);
  const s4Day1 = sack4Entries.find((d) => d.day === 1) || sack4Entries[0] || {
    labourCount: p4.sack_stitcher.labourCount ?? 2,
    labourWage: p4.sack_stitcher.labourWage ?? 500,
    snackCost: p4.sack_stitcher.snackCost ?? 150,
    travelCost: p4.sack_stitcher.travelCost ?? 150,
  };
  const skCost = sack4Entries.length > 0
    ? sack4Entries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0)
    : (p4.sack_stitcher.labourCount * p4.sack_stitcher.labourWage + p4.sack_stitcher.snackCost + p4.sack_stitcher.travelCost);
  const s4DaysCount = sack4Entries.length || p4.sack_stitcher.days || 1;
  result['p4_sack_stitcher'] = {
    ratePerCent: 0,
    days: s4DaysCount,
    activeDay: 1,
    dayEntries: sack4Entries,
    labourCount: s4Day1.labourCount,
    labourWage: s4Day1.labourWage,
    snackCost: s4Day1.snackCost,
    travelCost: s4Day1.travelCost,
    totalCost: skCost,
    costPerDay: s4DaysCount > 0 ? Math.round(skCost / s4DaysCount) : 0,
    isEnabled: p4.sack_stitcher.isEnabled !== false,
  };

  const transportEntries = normalizeDailyTransportEntries(p4.transport);
  const t4Day1 = transportEntries.find((d) => d.day === 1) || transportEntries[0] || {
    bagCount: p4.transport.bagCount ?? (p4.transport.transportRent ?? 120),
    loadingWorkers: p4.transport.loadingLabourCount ?? (p4.transport.perBagLiftingCost ?? 15),
    perBagLiftingCost: p4.transport.perBagLiftingCost ?? (p4.transport.loadingLabourCount ?? 15),
    loadingSnacks: p4.transport.snackCost ?? 150,
  };
  const trTotal = transportEntries.length > 0
    ? transportEntries.reduce((sum, d) => sum + ((d.bagCount ?? d.transportRent ?? 0) * (d.perBagLiftingCost ?? d.loadingWorkers ?? 0)) + (d.loadingSnacks || 0), 0)
    : (((p4.transport.bagCount ?? p4.transport.transportRent ?? 120) * (p4.transport.perBagLiftingCost ?? p4.transport.loadingLabourCount ?? 15)) + (p4.transport.snackCost ?? 150));
  const trDaysCount = transportEntries.length || p4.transport.days || 1;
  result['p4_transport'] = {
    ratePerCent: 0,
    days: trDaysCount,
    activeDay: 1,
    dayEntries: transportEntries,
    bagCount: t4Day1.bagCount ?? t4Day1.transportRent ?? 120,
    transportRent: t4Day1.bagCount ?? t4Day1.transportRent ?? 120,
    loadingWorkers: t4Day1.perBagLiftingCost ?? t4Day1.loadingWorkers ?? 15,
    perBagLiftingCost: t4Day1.perBagLiftingCost ?? t4Day1.loadingWorkers ?? 15,
    loadingWage: 0,
    loadingSnacks: t4Day1.loadingSnacks ?? 150,
    totalCost: trTotal,
    costPerDay: trDaysCount > 0 ? Math.round(trTotal / trDaysCount) : 0,
    isEnabled: p4.transport.isEnabled !== false,
  };

  // Phase 5
  const gBagCount = p5.grain_yield.bagWeightKg > 0 ? Number((p5.grain_yield.total_yieldKg / p5.grain_yield.bagWeightKg).toFixed(2)) : 0;
  const gTotal = Math.round(gBagCount * p5.grain_yield.pricePerBag);
  result['p5_grain_yield'] = {
    yieldMode: 'tons',
    yieldTons: Number((p5.grain_yield.total_yieldKg / 1000).toFixed(2)),
    yieldKg: p5.grain_yield.total_yieldKg,
    total_yieldKg: p5.grain_yield.total_yieldKg,
    bagWeightKg: p5.grain_yield.bagWeightKg,
    pricePerBag: p5.grain_yield.pricePerBag,
    grainBagCount: gBagCount,
    grainBagPrice: p5.grain_yield.pricePerBag,
    totalCost: gTotal,
    ratePerCent: 0,
    days: p5.grain_yield.days,
    costPerDay: Math.round(gTotal / p5.grain_yield.days),
    isEnabled: p5.grain_yield.isEnabled !== false,
  };

  const strTotal = Math.round(p5.straw_yield.SackCount * p5.straw_yield.SackPrice);
  result['p5_straw_yield'] = {
    SackCount: p5.straw_yield.SackCount,
    SackPrice: p5.straw_yield.SackPrice,
    strawSackCount: p5.straw_yield.SackCount,
    strawPrice: p5.straw_yield.SackPrice,
    totalCost: strTotal,
    ratePerCent: 0,
    days: p5.straw_yield.days,
    costPerDay: Math.round(strTotal / p5.straw_yield.days),
    isEnabled: p5.straw_yield.isEnabled !== false,
  };

  return result;
}

/**
 * Calculates totals directly from nested expenseMap.
 * Shared canonical calculation engine across API and client.
 */
export function calculateTotalsFromNested(
  expenseMap: Record<string, Record<string, any>>,
  landSize: number = 100
): { grandTotal: number; revenueTotal: number; netProfit: number } {
  const cents = typeof landSize === 'number' && landSize > 0 ? landSize : 100;
  const norm = normalizeOrFormatNestedExpenseMap(expenseMap, cents);
  let grandTotal = 0;
  let revenueTotal = 0;

  // Phase 1
  const p1 = norm.phase_1;
  if (p1.tractor.isEnabled !== false) {
    grandTotal += p1.tractor.ratePerCent;
  }
  if (p1.seed.isEnabled !== false) {
    grandTotal += p1.seed.seedCost + (p1.seed.isTravelCost ? p1.seed.TravelcostPer : 0);
  }
  if (p1.fuel.isEnabled !== false) {
    const fRepair = (p1.fuel as any)?.hasRepairCost ? (Number((p1.fuel as any)?.repairCost) || 0) : 0;
    grandTotal += p1.fuel.ratePerCent + fRepair;
  }
  if (p1.bund_labour.isEnabled !== false) {
    const bund1Entries = normalizeDailyLabourEntries(p1.bund_labour);
    const bund1LabourCost = bund1Entries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
    grandTotal += bund1LabourCost > 0
      ? bund1LabourCost
      : (p1.bund_labour.labourCount * p1.bund_labour.labourWage + p1.bund_labour.snackCost + p1.bund_labour.travelCost);
  }
  if (p1.plotting_labour.isEnabled !== false) {
    const pl1Entries = normalizeDailyLabourEntries(p1.plotting_labour);
    const pl1LabourCost = pl1Entries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
    grandTotal += pl1LabourCost > 0
      ? pl1LabourCost
      : (p1.plotting_labour.labourCount * p1.plotting_labour.labourWage + p1.plotting_labour.snackCost + p1.plotting_labour.travelCost);
  }

  // Phase 2
  const p2 = norm.phase_2;
  if (p2.tractor.isEnabled !== false) {
    grandTotal += p2.tractor.ratePerCent;
  }
  if (p2.bund_labour.isEnabled !== false) {
    const b2Entries = normalizeDailyLabourEntries(p2.bund_labour);
    const b2LabourCost = b2Entries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
    grandTotal += b2LabourCost > 0
      ? b2LabourCost
      : (p2.bund_labour.labourCount * p2.bund_labour.labourWage + p2.bund_labour.snackCost + p2.bund_labour.travelCost);
  }
  if (p2.fert_labour.isEnabled !== false) {
    const fert2Entries = normalizeDailyLabourEntries(p2.fert_labour);
    const fert2LabourCost = fert2Entries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
    const fertPrice = Number(p2.fert_labour.fertPrice) || 0;
    grandTotal += Math.round(fertPrice + fert2LabourCost);
  }
  if (p2.translanting.isEnabled !== false) {
    if (p2.translanting.isManual) {
      const transEntries = normalizeDailyLabourEntries(p2.translanting);
      grandTotal += transEntries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
    } else {
      grandTotal += p2.translanting.machineCost;
    }
  }
  if (p2.water.isEnabled !== false) grandTotal += p2.water.waterCost;

  // Phase 3
  const p3 = norm.phase_3;
  if (p3.herbicide.isEnabled !== false) {
    const herbicideEntries = normalizeDailyLabourEntries(p3.herbicide, 3);
    grandTotal += herbicideEntries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
  }
  if (p3.replanting_labour.isEnabled !== false) {
    const replantEntries = normalizeDailyLabourEntries(p3.replanting_labour);
    const replantCost = replantEntries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
    grandTotal += replantCost > 0
      ? replantCost
      : (p3.replanting_labour.labourCount * p3.replanting_labour.labourWage + p3.replanting_labour.snackCost + p3.replanting_labour.travelCost);
  }
  if (p3.deweeding.isEnabled !== false) {
    const deweedEntries = normalizeDailyLabourEntries(p3.deweeding);
    const deweedCost = deweedEntries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
    grandTotal += deweedCost > 0
      ? deweedCost
      : (p3.deweeding.labourCount * p3.deweeding.labourWage + p3.deweeding.snackCost + p3.deweeding.travelCost);
  }
  const doses = [p3.pesticide_Dose_1, p3.pesticide_Dose_2, p3.fertilizer, p3.potash_sulphide_fertilizer];
  doses.forEach((d) => {
    if (d && d.isEnabled !== false) {
      const isFertilizerBagDose = d === p3.fertilizer;
      const isPesticideDose = d === p3.pesticide_Dose_1 || d === p3.pesticide_Dose_2;
      const materialCost = (isFertilizerBagDose || isPesticideDose) ? d.fertPrice : d.fertQty * d.fertPrice;
      grandTotal += d.labourCount * d.labourWage + materialCost + d.snackCost + d.travelCost;
    }
  });

  // Phase 4
  const p4 = norm.phase_4;
  if (p4.harvest.isEnabled !== false) {
    const hEntries = normalizeDailyHarvestEntries(p4.harvest);
    const hCost = hEntries.reduce((sum, d) => sum + (d.ratePerCent ?? 0), 0);
    grandTotal += hCost > 0 ? hCost : (p4.harvest.harvest_cost ?? 0);
  }
  if (p4.gunny_bags.isEnabled !== false) {
    const gEntries = normalizeDailyGunnyEntries(p4.gunny_bags);
    const gCost = gEntries.reduce((sum, d) => sum + ((d.bagCount ?? 0) * (d.bagPrice ?? 0)), 0);
    grandTotal += gCost > 0 ? gCost : ((p4.gunny_bags.bagCount ?? 0) * (p4.gunny_bags.bagPrice ?? 0));
  }
  if (p4.bagging_labour.isEnabled !== false) {
    const bEntries = normalizeDailyLabourEntries(p4.bagging_labour);
    const bCost = bEntries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
    grandTotal += bCost > 0 ? bCost : (p4.bagging_labour.labourCount * p4.bagging_labour.labourWage + p4.bagging_labour.snackCost + (p4.bagging_labour.travelCost ?? 0));
  }
  if (p4.sack_stitcher.isEnabled !== false) {
    const sEntries = normalizeDailyLabourEntries(p4.sack_stitcher);
    const sCost = sEntries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
    grandTotal += sCost > 0 ? sCost : (p4.sack_stitcher.labourCount * p4.sack_stitcher.labourWage + p4.sack_stitcher.snackCost + p4.sack_stitcher.travelCost);
  }
  if (p4.transport.isEnabled !== false) {
    const tEntries = normalizeDailyTransportEntries(p4.transport);
    const tCost = tEntries.reduce((sum, d) => sum + ((d.bagCount ?? d.transportRent ?? 0) * (d.perBagLiftingCost ?? d.loadingWorkers ?? 0)) + (d.loadingSnacks ?? 0), 0);
    grandTotal += tCost > 0
      ? tCost
      : (((p4.transport.bagCount ?? p4.transport.transportRent ?? 0) * (p4.transport.perBagLiftingCost ?? p4.transport.loadingLabourCount ?? 0)) + (p4.transport.snackCost ?? 0));
  }

  // Phase 5
  const p5 = norm.phase_5;
  if (p5.grain_yield.isEnabled !== false) {
    const bagWeight = p5.grain_yield.bagWeightKg || 75;
    const totalKg = p5.grain_yield.total_yieldKg || 0;
    const bags = bagWeight > 0 ? totalKg / bagWeight : 0;
    revenueTotal += Math.round(bags * p5.grain_yield.pricePerBag);
  }
  if (p5.straw_yield.isEnabled !== false) {
    revenueTotal += Math.round(p5.straw_yield.SackCount * p5.straw_yield.SackPrice);
  }

  return {
    grandTotal: Math.round(grandTotal),
    revenueTotal: Math.round(revenueTotal),
    netProfit: Math.round(revenueTotal - grandTotal),
  };
}

/** Maps a DB row directly to FormattedPlanRecord */
export function mapRowToPlanRecord(row: any): FormattedPlanRecord {
  return {
    id: row.id,
    created_at: formatDisplayDate(row.created_at),
    updated_at: formatDisplayDate(row.updated_at),
    isCompleted: Boolean(row.is_completed),
    cultivation: 'paddy',
    userDetails: typeof row.user_details === 'object' && row.user_details !== null ? row.user_details : {},
    expenseMap: normalizeOrFormatNestedExpenseMap(row.expense_map || {}),
    totals:
      typeof row.totals === 'object' && row.totals !== null
        ? row.totals
        : { grandTotal: 0, revenueTotal: 0, netProfit: 0 },
  };
}
