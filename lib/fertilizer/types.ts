// ─────────────────────────────────────────────────────────────
// Fertilizer Planner Domain Types
// ─────────────────────────────────────────────────────────────

export interface UserDetails {
  name: string;
  phone: string;
  landSize: number;
  location?: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  village?: string;
  address: string;
  pathway?: 'rural' | 'urban';
  taluk?: string;
  panchayat?: string;
  ward?: string;
  ulbCategory?: 'corporation' | 'municipality' | 'town_panchayat';
  ulbName?: string;
  pincode?: string;
}

export interface DailyLabourEntry {
  day: number;
  labourCount: number;
  labourWage: number;
  snackCost: number;
  travelCost: number;
}

export interface ExpenseTask {
  id: string;
  name: string;
  phaseId: string;
  dayRange: string;
  description: string;
  costEstimateHint: string;
  defaultRate: number;
  defaultDays: number;
  isLabour?: boolean;
  isMultiDayLabour?: boolean;
  maxDays?: number;
  defaultLabourCount?: number;
  defaultLabourWage?: number;
  hasSnacks?: boolean;
  defaultSnackCost?: number;
  hasTravel?: boolean;
  defaultTravelCost?: number;
  allowMachineToggle?: boolean;
  defaultMachineRate?: number;
  isMandiTrip?: boolean;
  defaultMandiCount?: number;
  defaultMandiRate?: number;
  isOptional?: boolean;
  isFertilizerWithLabour?: boolean;
  defaultFertQty?: number;
  defaultFertPrice?: number;
  isGunnyBags?: boolean;
  defaultBagCount?: number;
  defaultPlasticPrice?: number;
  defaultTraditionalPrice?: number;
  isTransportLoading?: boolean;
  defaultTransportRent?: number;
  defaultLoadingWorkers?: number;
  defaultLoadingWage?: number;
  defaultLoadingSnacks?: number;
  isGrainYield?: boolean;
  defaultYieldMode?: 'tons' | 'bags';
  defaultYieldTons?: number;
  defaultBagWeightKg?: number;
  defaultBagPrice?: number;
  defaultGrainBags?: number;
  isStrawYield?: boolean;
  defaultStrawSacks?: number;
  defaultStrawPrice?: number;
}

export interface PhaseGroup {
  id: string;
  month: string;
  name: string;
  daySpan: string;
  color: string;
  bgSoft: string;
  borderSoft: string;
  tasks: ExpenseTask[];
  isProfitPhase?: boolean;
}

export interface ExpenseEntry {
  ratePerCent: number;
  days: number;
  totalCost: number;
  costPerDay: number;
  labourCount?: number;
  labourWage?: number;
  snackCost?: number;
  travelCost?: number;
  activeDay?: number;
  dayEntries?: DailyLabourEntry[];
  hasTravelCost?: boolean;
  isMachineMode?: boolean;
  mandiCount?: number;
  mandiRate?: number;
  isEnabled?: boolean;
  fertQty?: number;
  fertPrice?: number;
  isPlasticBag?: boolean;
  bagCount?: number;
  bagPrice?: number;
  transportRent?: number;
  loadingWorkers?: number;
  loadingWage?: number;
  loadingSnacks?: number;
  yieldMode?: 'tons' | 'bags';
  yieldKg?: number;
  total_yieldKg?: number;
  yieldTons?: number;
  bagWeightKg?: number;
  pricePerBag?: number;
  grainBagPrice?: number;
  grainBagCount?: number;
  SackCount?: number;
  SackPrice?: number;
  strawSackCount?: number;
  strawPrice?: number;
  herbicideNotify?: boolean;
  pesticideNotify?: boolean;
  fertilizerNotify?: boolean;
}

export type CultivationType = 'paddy';
export type StepId = 1 | 2 | 3 | 4;

export interface SavedPlanRecord {
  id: string;
  created_at: string;
  updated_at: string;
  isCompleted: boolean;
  cultivation: CultivationType;
  userDetails: {
    name: string;
    phone: string;
    landSize: number;
    state?: string;
    district?: string;
    city?: string;
    village?: string;
    address?: string;
  };
  expenseMap: any;
  totals: {
    grandTotal: number;
    revenueTotal: number;
    netProfit: number;
  };
}
