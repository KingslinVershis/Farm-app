// ─────────────────────────────────────────────────────────────
// Fertilizer Planner Calculations & Schema Transformations
// Single source of truth for calculations and data normalization
// ─────────────────────────────────────────────────────────────

import type { CultivationType, ExpenseEntry, PhaseGroup } from './types';

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

/** Builds an empty expense entry for every task with 0 values */
export function buildEmptyExpenses(phases: PhaseGroup[]): Record<string, ExpenseEntry> {
  const result: Record<string, ExpenseEntry> = {};

  phases.forEach((ph) => {
    ph.tasks.forEach((t) => {
      result[t.id] = {
        ratePerCent: 0,
        days: t.defaultDays,
        totalCost: 0,
        costPerDay: 0,
        labourCount: 0,
        labourWage: 0,
        snackCost: 0,
        travelCost: 0,
        hasTravelCost: t.id === 'p1_nursery' ? true : undefined,
        mandiCount: 0,
        mandiRate: 0,
        fertQty: 0,
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
        totalCost = Math.round(t.defaultRate * cents + seedTravel);
      } else if (t.isFertilizerWithLabour) {
        fertQty = t.defaultFertQty ?? 50;
        fertPrice = t.defaultFertPrice ?? 30;
        labourCount = t.defaultLabourCount ?? 2;
        labourWage = t.defaultLabourWage ?? 500;
        const snackCost = t.hasSnacks ? (t.defaultSnackCost ?? 200) : 0;
        const travelCost = t.hasTravel ? (t.defaultTravelCost ?? 150) : 0;
        totalCost = Math.round(fertQty * fertPrice + labourCount * labourWage + snackCost + travelCost);
        ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
      } else if (t.isLabour) {
        labourCount = t.defaultLabourCount ?? 4;
        labourWage = t.defaultLabourWage ?? 500;
        const snackCost = t.hasSnacks ? (t.defaultSnackCost ?? 200) : 0;
        const travelCost = t.hasTravel ? (t.defaultTravelCost ?? 150) : 0;
        totalCost = Math.round(labourCount * labourWage + snackCost + travelCost);
        ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
      } else if (t.isGunnyBags) {
        isPlasticBag = true;
        bagCount = t.defaultBagCount ?? 120;
        bagPrice = t.defaultPlasticPrice ?? 20;
        totalCost = Math.round(bagCount * bagPrice);
        ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
      } else if (t.isTransportLoading) {
        transportRent = t.defaultTransportRent ?? 1500;
        loadingWorkers = t.defaultLoadingWorkers ?? 4;
        loadingWage = t.defaultLoadingWage ?? 350;
        loadingSnacks = t.defaultLoadingSnacks ?? 150;
        totalCost = Math.round(transportRent + loadingWorkers * loadingWage + loadingSnacks);
        ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
      } else if (t.isGrainYield) {
        const totalKg = 10500;
        const bagWeight = 75;
        const bagPriceP5 = 1650;
        const bags = bagWeight > 0 ? totalKg / bagWeight : 0;
        totalCost = Math.round(bags * bagPriceP5);
        ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
        yieldKg = totalKg;
        yieldTons = 10.5;
        bagWeightKg = bagWeight;
        grainBagPrice = bagPriceP5;
        grainBagCount = bags;
      } else if (t.isStrawYield) {
        const sacks = 100;
        const pricePerSack = 150;
        totalCost = Math.round(sacks * pricePerSack);
        ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
        strawSackCount = sacks;
        strawPrice = pricePerSack;
      } else {
        totalCost = Math.round(t.defaultRate * cents);
      }

      const costPerDay = t.defaultDays > 0 ? Math.round(totalCost / t.defaultDays) : 0;

      result[t.id] = {
        ratePerCent,
        days: t.defaultDays,
        totalCost,
        costPerDay,
        labourCount,
        labourWage,
        snackCost: t.defaultSnackCost,
        travelCost: t.defaultTravelCost,
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
      },
      bund_labour: {
        days: bund1.days ?? 10,
        labourCount: bund1.labourCount ?? 4,
        labourWage: bund1.labourWage ?? 500,
        snackCost: bund1.snackCost ?? 200,
        travelCost: bund1.travelCost ?? 150,
        isEnabled: bund1.isEnabled !== false,
      },
      plotting_labour: {
        days: plot1.days ?? 10,
        labourCount: plot1.labourCount ?? 4,
        labourWage: plot1.labourWage ?? 500,
        snackCost: plot1.snackCost ?? 200,
        travelCost: plot1.travelCost ?? 150,
        isEnabled: plot1.isEnabled !== false,
      },
    },
    phase_2: {
      tractor: {
        ratePerCent: tractor2.ratePerCent ?? 50,
        days: tractor2.days ?? 5,
        isEnabled: tractor2.isEnabled !== false,
      },
      bund_labour: {
        days: bund2.days ?? 10,
        labourCount: bund2.labourCount ?? 4,
        labourWage: bund2.labourWage ?? 500,
        snackCost: bund2.snackCost ?? 200,
        travelCost: bund2.travelCost ?? 150,
        isEnabled: bund2.isEnabled !== false,
      },
      fert_labour: {
        days: fert2.days ?? 3,
        labourCount: fert2.labourCount ?? 4,
        labourWage: fert2.labourWage ?? 500,
        snackCost: fert2.snackCost ?? 200,
        travelCost: fert2.travelCost ?? 150,
        isEnabled: fert2.isEnabled !== false,
      },
      translanting: {
        isManual: transplant2.isManual !== undefined ? transplant2.isManual : (transplant2.isMachineMode !== undefined ? !transplant2.isMachineMode : false),
        days: transplant2.days ?? 10,
        machineCost: transplant2.machineCost ?? (transplant2.ratePerCent ?? 290),
        labourCount: transplant2.labourCount ?? 5,
        labourWage: transplant2.labourWage ?? 500,
        snackCost: transplant2.snackCost ?? 200,
        travelCost: transplant2.travelCost ?? 200,
        isEnabled: transplant2.isEnabled !== false,
      },
      water: {
        waterCost: water2.waterCost ?? (water2.ratePerCent ?? 14),
        days: water2.days ?? 30,
        isEnabled: water2.isEnabled !== false,
      },
    },
    phase_3: {
      herbicide: {
        days: herbicide3.days ?? 3,
        labourCount: herbicide3.labourCount ?? 3,
        labourWage: herbicide3.labourWage ?? 500,
        snackCost: herbicide3.snackCost ?? 150,
        travelCost: herbicide3.travelCost ?? 150,
        Herbicide_notify: herbicide3.Herbicide_notify ?? (herbicide3.herbicideNotify ?? true),
        isEnabled: herbicide3.isEnabled !== false,
      },
      replanting_labour: {
        days: replant3.days ?? 5,
        labourCount: replant3.labourCount ?? 4,
        labourWage: replant3.labourWage ?? 450,
        snackCost: replant3.snackCost ?? 200,
        travelCost: replant3.travelCost ?? 150,
        isEnabled: replant3.isEnabled !== false,
      },
      deweeding: {
        days: deweed3.days ?? 5,
        labourCount: deweed3.labourCount ?? 4,
        labourWage: deweed3.labourWage ?? 450,
        snackCost: deweed3.snackCost ?? 200,
        travelCost: deweed3.travelCost ?? 150,
        isEnabled: deweed3.isEnabled !== false,
      },
      pesticide_Dose_1: {
        days: pest1_3.days ?? 3,
        labourCount: pest1_3.labourCount ?? 2,
        labourWage: pest1_3.labourWage ?? 500,
        fertQty: pest1_3.fertQty ?? 50,
        fertPrice: pest1_3.fertPrice ?? 30,
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
      harvest: {
        days: harvest4.days ?? 5,
        harvest_cost: harvest4.harvest_cost ?? (harvest4.ratePerCent ?? 760),
        isEnabled: harvest4.isEnabled !== false,
      },
      gunny_bags: {
        days: gunny4.days ?? 5,
        isPlasticBag: gunny4.isPlasticBag !== undefined ? gunny4.isPlasticBag : (gunny4.isPlastic !== false),
        bagCount: gunny4.bagCount ?? 120,
        bagPrice: gunny4.bagPrice ?? 20,
        isEnabled: gunny4.isEnabled !== false,
      },
      bagging_labour: {
        days: labour4.days ?? 6,
        labourCount: labour4.labourCount ?? 6,
        labourWage: labour4.labourWage ?? 550,
        snackCost: labour4.snackCost ?? 200,
        isEnabled: labour4.isEnabled !== false,
      },
      sack_stitcher: {
        days: sack4.days ?? 5,
        labourCount: sack4.labourCount ?? 2,
        labourWage: sack4.labourWage ?? 500,
        snackCost: sack4.snackCost ?? 150,
        travelCost: sack4.travelCost ?? 150,
        isEnabled: sack4.isEnabled !== false,
      },
      transport: {
        days: transport4.days ?? 5,
        transportRent: transport4.transportRent ?? 1500,
        loadingLabourCount: transport4.loadingLabourCount ?? (transport4.loadingWorkers ?? 4),
        loadingLabourWage: transport4.loadingLabourWage ?? (transport4.loadingWage ?? 350),
        snackCost: transport4.snackCost ?? (transport4.loadingSnacks ?? 150),
        isEnabled: transport4.isEnabled !== false,
      },
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
  const tCost = Math.round(p1.tractor.ratePerCent);
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

  const fCost = Math.round(p1.fuel.ratePerCent);
  result['p1_fuel'] = {
    ratePerCent: p1.fuel.ratePerCent,
    days: p1.fuel.days,
    totalCost: fCost,
    costPerDay: p1.fuel.days > 0 ? Math.round(fCost / p1.fuel.days) : 0,
    isEnabled: p1.fuel.isEnabled !== false,
  };

  const b1Cost = p1.bund_labour.labourCount * p1.bund_labour.labourWage + p1.bund_labour.snackCost + p1.bund_labour.travelCost;
  result['p1_bund_labour'] = {
    ratePerCent: cents > 0 ? Math.round(b1Cost / cents) : 0,
    days: p1.bund_labour.days,
    labourCount: p1.bund_labour.labourCount,
    labourWage: p1.bund_labour.labourWage,
    snackCost: p1.bund_labour.snackCost,
    travelCost: p1.bund_labour.travelCost,
    totalCost: b1Cost,
    costPerDay: p1.bund_labour.days > 0 ? Math.round(b1Cost / p1.bund_labour.days) : 0,
    isEnabled: p1.bund_labour.isEnabled !== false,
  };

  const pl1Cost = p1.plotting_labour.labourCount * p1.plotting_labour.labourWage + p1.plotting_labour.snackCost + p1.plotting_labour.travelCost;
  result['p1_plotting_labour'] = {
    ratePerCent: cents > 0 ? Math.round(pl1Cost / cents) : 0,
    days: p1.plotting_labour.days,
    labourCount: p1.plotting_labour.labourCount,
    labourWage: p1.plotting_labour.labourWage,
    snackCost: p1.plotting_labour.snackCost,
    travelCost: p1.plotting_labour.travelCost,
    totalCost: pl1Cost,
    costPerDay: p1.plotting_labour.days > 0 ? Math.round(pl1Cost / p1.plotting_labour.days) : 0,
    isEnabled: p1.plotting_labour.isEnabled !== false,
  };

  // Phase 2
  const t2Cost = Math.round(p2.tractor.ratePerCent);
  result['p2_tractor'] = {
    ratePerCent: p2.tractor.ratePerCent,
    days: p2.tractor.days,
    totalCost: t2Cost,
    costPerDay: p2.tractor.days > 0 ? Math.round(t2Cost / p2.tractor.days) : 0,
    isEnabled: p2.tractor.isEnabled !== false,
  };

  const b2Cost = p2.bund_labour.labourCount * p2.bund_labour.labourWage + p2.bund_labour.snackCost + p2.bund_labour.travelCost;
  result['p2_bund_labour'] = {
    ratePerCent: cents > 0 ? Math.round(b2Cost / cents) : 0,
    days: p2.bund_labour.days,
    labourCount: p2.bund_labour.labourCount,
    labourWage: p2.bund_labour.labourWage,
    snackCost: p2.bund_labour.snackCost,
    travelCost: p2.bund_labour.travelCost,
    totalCost: b2Cost,
    costPerDay: p2.bund_labour.days > 0 ? Math.round(b2Cost / p2.bund_labour.days) : 0,
    isEnabled: p2.bund_labour.isEnabled !== false,
  };

  const f2Cost = p2.fert_labour.labourCount * p2.fert_labour.labourWage + p2.fert_labour.snackCost + p2.fert_labour.travelCost;
  result['p2_fert_labour'] = {
    ratePerCent: cents > 0 ? Math.round(f2Cost / cents) : 0,
    days: p2.fert_labour.days,
    labourCount: p2.fert_labour.labourCount,
    labourWage: p2.fert_labour.labourWage,
    snackCost: p2.fert_labour.snackCost,
    travelCost: p2.fert_labour.travelCost,
    totalCost: f2Cost,
    costPerDay: p2.fert_labour.days > 0 ? Math.round(f2Cost / p2.fert_labour.days) : 0,
    isEnabled: p2.fert_labour.isEnabled !== false,
  };

  const isManual = p2.translanting.isManual;
  const trCost = isManual
    ? p2.translanting.labourCount * p2.translanting.labourWage + p2.translanting.snackCost + p2.translanting.travelCost
    : Math.round(p2.translanting.machineCost);
  result['p2_labour'] = {
    ratePerCent: isManual ? (cents > 0 ? Math.round(trCost / cents) : 0) : p2.translanting.machineCost,
    days: p2.translanting.days,
    isMachineMode: !isManual,
    labourCount: p2.translanting.labourCount,
    labourWage: p2.translanting.labourWage,
    snackCost: p2.translanting.snackCost,
    travelCost: p2.translanting.travelCost,
    totalCost: trCost,
    costPerDay: p2.translanting.days > 0 ? Math.round(trCost / p2.translanting.days) : 0,
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
  const hCost = p3.herbicide.labourCount * p3.herbicide.labourWage + p3.herbicide.snackCost + p3.herbicide.travelCost;
  result['p3_herbicide'] = {
    ratePerCent: cents > 0 ? Math.round(hCost / cents) : 0,
    days: p3.herbicide.days,
    labourCount: p3.herbicide.labourCount,
    labourWage: p3.herbicide.labourWage,
    snackCost: p3.herbicide.snackCost,
    travelCost: p3.herbicide.travelCost,
    herbicideNotify: p3.herbicide.Herbicide_notify ?? true,
    totalCost: hCost,
    costPerDay: p3.herbicide.days > 0 ? Math.round(hCost / p3.herbicide.days) : 0,
    isEnabled: p3.herbicide.isEnabled !== false,
  };

  const w3Cost = p3.replanting_labour.labourCount * p3.replanting_labour.labourWage + p3.replanting_labour.snackCost + p3.replanting_labour.travelCost;
  result['p1_weed'] = {
    ratePerCent: cents > 0 ? Math.round(w3Cost / cents) : 0,
    days: p3.replanting_labour.days,
    labourCount: p3.replanting_labour.labourCount,
    labourWage: p3.replanting_labour.labourWage,
    snackCost: p3.replanting_labour.snackCost,
    travelCost: p3.replanting_labour.travelCost,
    totalCost: w3Cost,
    costPerDay: p3.replanting_labour.days > 0 ? Math.round(w3Cost / p3.replanting_labour.days) : 0,
    isEnabled: p3.replanting_labour.isEnabled !== false,
  };

  const dwCost = p3.deweeding.labourCount * p3.deweeding.labourWage + p3.deweeding.snackCost + p3.deweeding.travelCost;
  result['p3_deweeding'] = {
    ratePerCent: cents > 0 ? Math.round(dwCost / cents) : 0,
    days: p3.deweeding.days,
    labourCount: p3.deweeding.labourCount,
    labourWage: p3.deweeding.labourWage,
    snackCost: p3.deweeding.snackCost,
    travelCost: p3.deweeding.travelCost,
    totalCost: dwCost,
    costPerDay: p3.deweeding.days > 0 ? Math.round(dwCost / p3.deweeding.days) : 0,
    isEnabled: p3.deweeding.isEnabled !== false,
  };

  const p1Cost = Math.round(p3.pesticide_Dose_1.fertQty * p3.pesticide_Dose_1.fertPrice + p3.pesticide_Dose_1.labourCount * p3.pesticide_Dose_1.labourWage + p3.pesticide_Dose_1.snackCost + p3.pesticide_Dose_1.travelCost);
  result['p1_fert'] = {
    ratePerCent: cents > 0 ? Math.round(p1Cost / cents) : 0,
    days: p3.pesticide_Dose_1.days,
    labourCount: p3.pesticide_Dose_1.labourCount,
    labourWage: p3.pesticide_Dose_1.labourWage,
    snackCost: p3.pesticide_Dose_1.snackCost,
    travelCost: p3.pesticide_Dose_1.travelCost,
    fertQty: p3.pesticide_Dose_1.fertQty,
    fertPrice: p3.pesticide_Dose_1.fertPrice,
    pesticideNotify: p3.pesticide_Dose_1.pesticide_notify ?? true,
    totalCost: p1Cost,
    costPerDay: p3.pesticide_Dose_1.days > 0 ? Math.round(p1Cost / p3.pesticide_Dose_1.days) : 0,
    isEnabled: p3.pesticide_Dose_1.isEnabled !== false,
  };

  const p2Cost = Math.round(p3.pesticide_Dose_2.fertQty * p3.pesticide_Dose_2.fertPrice + p3.pesticide_Dose_2.labourCount * p3.pesticide_Dose_2.labourWage + p3.pesticide_Dose_2.snackCost + p3.pesticide_Dose_2.travelCost);
  result['p2_tillering'] = {
    ratePerCent: cents > 0 ? Math.round(p2Cost / cents) : 0,
    days: p3.pesticide_Dose_2.days,
    labourCount: p3.pesticide_Dose_2.labourCount,
    labourWage: p3.pesticide_Dose_2.labourWage,
    snackCost: p3.pesticide_Dose_2.snackCost,
    travelCost: p3.pesticide_Dose_2.travelCost,
    fertQty: p3.pesticide_Dose_2.fertQty,
    fertPrice: p3.pesticide_Dose_2.fertPrice,
    pesticideNotify: p3.pesticide_Dose_2.pesticide_notify ?? true,
    totalCost: p2Cost,
    costPerDay: p3.pesticide_Dose_2.days > 0 ? Math.round(p2Cost / p3.pesticide_Dose_2.days) : 0,
    isEnabled: p3.pesticide_Dose_2.isEnabled !== false,
  };

  const f3Cost = Math.round(p3.fertilizer.fertQty * p3.fertilizer.fertPrice + p3.fertilizer.labourCount * p3.fertilizer.labourWage + p3.fertilizer.snackCost + p3.fertilizer.travelCost);
  result['p3_fert_dose3'] = {
    ratePerCent: cents > 0 ? Math.round(f3Cost / cents) : 0,
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
    ratePerCent: cents > 0 ? Math.round(potCost / cents) : 0,
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
  const h4Cost = Math.round(p4.harvest.harvest_cost);
  result['p4_harvest'] = {
    ratePerCent: p4.harvest.harvest_cost,
    days: p4.harvest.days,
    totalCost: h4Cost,
    costPerDay: p4.harvest.days > 0 ? Math.round(h4Cost / p4.harvest.days) : 0,
    isEnabled: p4.harvest.isEnabled !== false,
  };

  const gCost = Math.round(p4.gunny_bags.bagCount * p4.gunny_bags.bagPrice);
  result['p4_gunny_bags'] = {
    ratePerCent: cents > 0 ? Math.round(gCost / cents) : 0,
    days: p4.gunny_bags.days,
    isPlasticBag: p4.gunny_bags.isPlasticBag,
    bagCount: p4.gunny_bags.bagCount,
    bagPrice: p4.gunny_bags.bagPrice,
    totalCost: gCost,
    costPerDay: Math.round(gCost / p4.gunny_bags.days),
    isEnabled: p4.gunny_bags.isEnabled !== false,
  };

  const b4Cost = p4.bagging_labour.labourCount * p4.bagging_labour.labourWage + p4.bagging_labour.snackCost;
  result['p4_labour'] = {
    ratePerCent: cents > 0 ? Math.round(b4Cost / cents) : 0,
    days: p4.bagging_labour.days,
    labourCount: p4.bagging_labour.labourCount,
    labourWage: p4.bagging_labour.labourWage,
    snackCost: p4.bagging_labour.snackCost,
    totalCost: b4Cost,
    costPerDay: p4.bagging_labour.days > 0 ? Math.round(b4Cost / p4.bagging_labour.days) : 0,
    isEnabled: p4.bagging_labour.isEnabled !== false,
  };

  const skCost = p4.sack_stitcher.labourCount * p4.sack_stitcher.labourWage + p4.sack_stitcher.snackCost + p4.sack_stitcher.travelCost;
  result['p4_sack_stitcher'] = {
    ratePerCent: cents > 0 ? Math.round(skCost / cents) : 0,
    days: p4.sack_stitcher.days,
    labourCount: p4.sack_stitcher.labourCount,
    labourWage: p4.sack_stitcher.labourWage,
    snackCost: p4.sack_stitcher.snackCost,
    travelCost: p4.sack_stitcher.travelCost,
    totalCost: skCost,
    costPerDay: p4.sack_stitcher.days > 0 ? Math.round(skCost / p4.sack_stitcher.days) : 0,
    isEnabled: p4.sack_stitcher.isEnabled !== false,
  };

  const trTotal = p4.transport.transportRent + (p4.transport.loadingLabourCount * p4.transport.loadingLabourWage) + p4.transport.snackCost;
  result['p4_transport'] = {
    ratePerCent: cents > 0 ? Math.round(trTotal / cents) : 0,
    days: p4.transport.days,
    transportRent: p4.transport.transportRent,
    loadingWorkers: p4.transport.loadingLabourCount,
    loadingWage: p4.transport.loadingLabourWage,
    loadingSnacks: p4.transport.snackCost,
    totalCost: trTotal,
    costPerDay: Math.round(trTotal / p4.transport.days),
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
    ratePerCent: cents > 0 ? Math.round(gTotal / cents) : 0,
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
    ratePerCent: cents > 0 ? Math.round(strTotal / cents) : 0,
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
  if (p1.tractor.isEnabled !== false) grandTotal += p1.tractor.ratePerCent;
  if (p1.seed.isEnabled !== false) {
    grandTotal += p1.seed.seedCost + (p1.seed.isTravelCost ? p1.seed.TravelcostPer : 0);
  }
  if (p1.fuel.isEnabled !== false) grandTotal += p1.fuel.ratePerCent;
  if (p1.bund_labour.isEnabled !== false) {
    grandTotal += p1.bund_labour.labourCount * p1.bund_labour.labourWage + p1.bund_labour.snackCost + p1.bund_labour.travelCost;
  }
  if (p1.plotting_labour.isEnabled !== false) {
    grandTotal += p1.plotting_labour.labourCount * p1.plotting_labour.labourWage + p1.plotting_labour.snackCost + p1.plotting_labour.travelCost;
  }

  // Phase 2
  const p2 = norm.phase_2;
  if (p2.tractor.isEnabled !== false) grandTotal += p2.tractor.ratePerCent;
  if (p2.bund_labour.isEnabled !== false) {
    grandTotal += p2.bund_labour.labourCount * p2.bund_labour.labourWage + p2.bund_labour.snackCost + p2.bund_labour.travelCost;
  }
  if (p2.fert_labour.isEnabled !== false) {
    grandTotal += p2.fert_labour.labourCount * p2.fert_labour.labourWage + p2.fert_labour.snackCost + p2.fert_labour.travelCost;
  }
  if (p2.translanting.isEnabled !== false) {
    if (p2.translanting.isManual) {
      grandTotal += p2.translanting.labourCount * p2.translanting.labourWage + p2.translanting.snackCost + p2.translanting.travelCost;
    } else {
      grandTotal += p2.translanting.machineCost;
    }
  }
  if (p2.water.isEnabled !== false) grandTotal += p2.water.waterCost;

  // Phase 3
  const p3 = norm.phase_3;
  if (p3.herbicide.isEnabled !== false) {
    grandTotal += p3.herbicide.labourCount * p3.herbicide.labourWage + p3.herbicide.snackCost + p3.herbicide.travelCost;
  }
  if (p3.replanting_labour.isEnabled !== false) {
    grandTotal += p3.replanting_labour.labourCount * p3.replanting_labour.labourWage + p3.replanting_labour.snackCost + p3.replanting_labour.travelCost;
  }
  if (p3.deweeding.isEnabled !== false) {
    grandTotal += p3.deweeding.labourCount * p3.deweeding.labourWage + p3.deweeding.snackCost + p3.deweeding.travelCost;
  }
  const doses = [p3.pesticide_Dose_1, p3.pesticide_Dose_2, p3.fertilizer, p3.potash_sulphide_fertilizer];
  doses.forEach((d) => {
    if (d && d.isEnabled !== false) {
      grandTotal += d.labourCount * d.labourWage + d.fertQty * d.fertPrice + d.snackCost + d.travelCost;
    }
  });

  // Phase 4
  const p4 = norm.phase_4;
  if (p4.harvest.isEnabled !== false) grandTotal += p4.harvest.harvest_cost;
  if (p4.gunny_bags.isEnabled !== false) grandTotal += p4.gunny_bags.bagCount * p4.gunny_bags.bagPrice;
  if (p4.bagging_labour.isEnabled !== false) {
    grandTotal += p4.bagging_labour.labourCount * p4.bagging_labour.labourWage + p4.bagging_labour.snackCost;
  }
  if (p4.sack_stitcher.isEnabled !== false) {
    grandTotal += p4.sack_stitcher.labourCount * p4.sack_stitcher.labourWage + p4.sack_stitcher.snackCost + p4.sack_stitcher.travelCost;
  }
  if (p4.transport.isEnabled !== false) {
    grandTotal += p4.transport.transportRent + p4.transport.loadingLabourCount * p4.transport.loadingLabourWage + p4.transport.snackCost;
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
