'use client';

import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { fetchUserData, invalidateUserDataCache } from '@/lib/clientUser';
import { PADDY_PHASES } from './data';
import {
  buildEmptyExpenses,
  buildInitialExpenses,
  computeDailyLabourCost,
  computePlanTotals,
  computeRecommendedFertilizerBagRange,
  computeRecommendedPesticideLitres,
  formatToNestedExpenseMap,
  getCropDurationDays,
  nestedToFlatExpenseMap,
} from './calc';
import type {
  CultivationType,
  DailyLabourEntry,
  ExpenseEntry,
  ExpenseTask,
  PhaseGroup,
  SavedPlanRecord,
  StepId,
  UserDetails,
} from './types';

const DEFAULT_USER_DETAILS: UserDetails = {
  name: '',
  phone: '',
  landSize: 0,
  location: '',
  address: '',
};

const toSafeNum = (val: unknown, fallback = 0): number => {
  const n = Number(val);
  return isNaN(n) ? fallback : Math.max(0, n);
};

export function sanitizeUserDetails(userDetails?: Partial<UserDetails> | null): UserDetails {
  return {
    name: userDetails?.name || '',
    phone: userDetails?.phone || '',
    landSize: toSafeNum(userDetails?.landSize),
    state: userDetails?.state || '',
    district: userDetails?.district || '',
    city: userDetails?.city || '',
    village: userDetails?.village || '',
    address: userDetails?.address || '',
  };
}

/** Checks whether a single task entry has been filled (optional tasks do not block phase progression). */
export function isTaskEntryFilled(task: ExpenseTask, entry?: ExpenseEntry): boolean {
  if (task.isOptional) return true;
  if (!entry) return false;

  const days = Array.isArray(entry.dayEntries) ? entry.dayEntries : [];
  const anyDay = (pred: (d: DailyLabourEntry) => boolean) => days.some(pred);

  if (task.id === 'p4_harvest') {
    return (entry.ratePerCent ?? 0) > 0 || anyDay((d) => (d.ratePerCent ?? 0) > 0);
  }
  if (task.isGunnyBags) {
    const isBagFilled = (c?: number, p?: number) => (c ?? 0) > 0 && (p ?? 0) > 0;
    return isBagFilled(entry.bagCount, entry.bagPrice) || anyDay((d) => isBagFilled(d.bagCount, d.bagPrice));
  }
  if (task.isTransportLoading) {
    const isTransFilled = (b?: number) => (b ?? 0) > 0;
    return (
      isTransFilled(entry.bagCount ?? entry.transportRent) ||
      anyDay((d) => isTransFilled(d.bagCount ?? d.transportRent))
    );
  }
  if (task.isFertilizerWithLabour) {
    return (
      ((entry.fertQty ?? 0) > 0 && (entry.fertPrice ?? 0) > 0) ||
      ((entry.labourCount ?? 0) > 0 && (entry.labourWage ?? 0) > 0)
    );
  }
  if (task.isMultiDayLabour && !entry.isMachineMode) {
    const hasLabour = (c?: number, w?: number) => (c ?? 0) > 0 && (w ?? 0) > 0;
    return hasLabour(entry.labourCount, entry.labourWage) || anyDay((d) => hasLabour(d.labourCount, d.labourWage));
  }
  if (task.isLabour && !entry.isMachineMode) {
    return (entry.labourCount ?? 0) > 0 && (entry.labourWage ?? 0) > 0;
  }
  if (task.isGrainYield) {
    return (
      ((entry.yieldKg ?? 0) > 0 || (entry.yieldTons ?? 0) > 0 || (entry.grainBagCount ?? 0) > 0) &&
      ((entry.grainBagPrice ?? 0) > 0 || (entry.bagWeightKg ?? 0) > 0)
    );
  }
  if (task.isStrawYield) {
    return (entry.strawSackCount ?? 0) > 0 && (entry.strawPrice ?? 0) > 0;
  }
  if (task.isMandiTrip) {
    return (entry.mandiCount ?? 0) > 0 && (entry.mandiRate ?? 0) > 0;
  }
  return (entry.ratePerCent ?? 0) > 0 || anyDay((d) => (d.ratePerCent ?? 0) > 0);
}

/** Checks whether all required tasks inside a phase have filled values. */
export function isPhaseComplete(
  phase: PhaseGroup,
  expenseMap: Record<string, ExpenseEntry>
): boolean {
  return phase.tasks.every((task) => isTaskEntryFilled(task, expenseMap[task.id]));
}

/** Checks whether Step 1 farmer details are completely filled & valid without mutating UI errors. */
export function areStep1DetailsValid(details: UserDetails): boolean {
  const hasName = Boolean(details.name?.trim());
  const hasPhone =
    Boolean(details.phone?.trim()) && /^\d{10}$/.test(details.phone.replace(/\D/g, ''));
  const hasLandSize = Boolean(details.landSize && details.landSize > 0);
  const hasLocation = Boolean(
    details.location?.trim() ||
      (details.state?.trim() &&
        details.district?.trim() &&
        (details.village?.trim() || details.city?.trim()))
  );
  const hasAddress = Boolean(details.address?.trim());
  return hasName && hasPhone && hasLandSize && hasLocation && hasAddress;
}

const getStorageKey = (userId?: string | null): string => {
  let resolvedId = userId;
  if (!resolvedId && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('farmhub_user') || localStorage.getItem('agripulse_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.id) resolvedId = String(u.id);
      }
    } catch (_) {}
  }
  return resolvedId ? `farm_app_saved_plans_${resolvedId}` : 'farm_app_saved_plans';
};

const sanitizePlanRecord = (p: any): SavedPlanRecord => {
  const userDetails = sanitizeUserDetails(p.userDetails);
  const landSize = userDetails.landSize || 100;
  const createdAt = p.created_at || p.Created_at || p.savedAt || '';
  const updatedAt = p.updated_at || p.savedAt || createdAt;

  const nestedExpenseMap = p.expenseMap?.phase_1
    ? p.expenseMap
    : formatToNestedExpenseMap('paddy', p.expenseMap || {}, landSize);

  return {
    id: String(p.id),
    created_at: createdAt,
    updated_at: updatedAt,
    isCompleted: Boolean(p.isCompleted),
    cultivation: 'paddy',
    userDetails,
    expenseMap: nestedExpenseMap,
    totals: {
      grandTotal: p.totals?.grandTotal || 0,
      revenueTotal: p.totals?.revenueTotal || 0,
      netProfit: p.totals?.netProfit || 0,
    },
  };
};

/**
 * Owns all fertilizer-planner state, cost handlers, validation and derived
 * totals. Keeps the page component focused on presentation.
 */
export function useFertilizerPlanner() {
  const { messages } = useLanguage();
  const t = messages.fertilizer;

  const [step, setStep] = useState<StepId>(1);
  const [cultivation, setCultivation] = useState<CultivationType>('paddy');
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'individual' | 'all'>('individual');
  const [userDetails, setUserDetails] = useState<UserDetails>(DEFAULT_USER_DETAILS);
  const [errors, setErrors] = useState<Partial<Record<keyof UserDetails, string>>>({});
  const [expenseMap, setExpenseMap] = useState<Record<string, ExpenseEntry>>(() =>
    buildEmptyExpenses(PADDY_PHASES)
  );

  const [savedPlans, setSavedPlans] = useState<SavedPlanRecord[]>([]);
  const [pageView, setPageView] = useState<'records' | 'wizard'>('records');
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [step2Completed, setStep2Completed] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const dirtyQtyTasksRef = useRef<Set<string>>(new Set());

  // ─── Reusable Common Task Updaters ──────────────────────────────────────────
  /** Standard single-task updater that computes costPerDay and merges immutably */
  const updateTask = (
    taskId: string,
    updater: (current: ExpenseEntry) => Partial<ExpenseEntry> & { totalCost?: number }
  ) => {
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      const updates = updater(current);
      const totalCost = updates.totalCost !== undefined ? updates.totalCost : current.totalCost;
      const costPerDay = current.days > 0 ? Math.round(totalCost / current.days) : 0;
      return {
        ...prev,
        [taskId]: {
          ...current,
          ...updates,
          totalCost,
          costPerDay,
        },
      };
    });
  };

  /** Generic multi-day array updater that coordinates day entries, totalCost, and day-1 sync */
  const updateMultiDayTask = (
    taskId: string,
    day: number,
    maxDays: number,
    buildDayEntry: (existing?: DailyLabourEntry) => DailyLabourEntry,
    computeTotalCost: (entries: DailyLabourEntry[]) => number,
    isDayFilled: (d: DailyLabourEntry) => boolean,
    syncTopLevel: (day1: DailyLabourEntry) => Partial<ExpenseEntry>
  ) => {
    const safeDay = Math.min(maxDays, Math.max(1, Math.round(day || 1)));
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      const existingEntries: DailyLabourEntry[] = Array.isArray(current.dayEntries) ? current.dayEntries : [];
      const existingForDay = existingEntries.find((d) => d.day === safeDay);
      const updatedDayEntry = buildDayEntry(existingForDay);
      const nextEntries = [...existingEntries.filter((d) => d.day !== safeDay), updatedDayEntry].sort(
        (a, b) => a.day - b.day
      );
      const totalCost = computeTotalCost(nextEntries);
      const filledCount = nextEntries.filter(isDayFilled).length;
      const activeTotalDays = filledCount > 0 ? filledCount : 1;
      const costPerDay = activeTotalDays > 0 ? Math.round(totalCost / activeTotalDays) : 0;
      const day1Entry = nextEntries.find((d) => d.day === 1) || updatedDayEntry;

      return {
        ...prev,
        [taskId]: {
          ...current,
          activeDay: safeDay,
          days: activeTotalDays,
          dayEntries: nextEntries,
          totalCost,
          costPerDay,
          ...syncTopLevel(day1Entry),
        },
      };
    });
  };

  const updateSavedPlansStateAndStorage = (plans: SavedPlanRecord[]) => {
    setSavedPlans(plans);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(plans));
      } catch (e) {
        console.error('Failed to save plans to localStorage', e);
      }
    }
  };

  // ─── API Sync Helpers ───────────────────────────────────────────────────────
  const syncPlanToApi = async (planPayload: any): Promise<SavedPlanRecord | null> => {
    if (typeof window === 'undefined') return null;
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planPayload),
      });
      const json = await res.json();
      if (json.success && json.data) {
        invalidateUserDataCache();
        return sanitizePlanRecord(json.data);
      }
    } catch (e) {
      console.warn('[FertilizerAPI] Could not sync plan to API:', e);
    }
    return null;
  };

  const deletePlanFromApi = async (planId: string) => {
    if (typeof window === 'undefined') return;
    try {
      await fetch(`/api/user?id=${encodeURIComponent(planId)}`, { method: 'DELETE' });
      invalidateUserDataCache();
    } catch (e) {
      console.warn('[FertilizerAPI] Could not delete plan from API:', e);
    }
  };

  // Hydrate user-specific saved plans from /api/user (deduplicated) and user-scoped storage
  useEffect(() => {
    let active = true;

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('farm_app_saved_plans');
      } catch (_) {}

      try {
        const key = getStorageKey();
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedPlans(parsed.map(sanitizePlanRecord));
          }
        }
      } catch (_) {}
    }

    fetchUserData()
      .then((json) => {
        if (!active || !json || !json.success) return;
        const plansList = json.plans || [];
        const sanitized: SavedPlanRecord[] = Array.isArray(plansList) ? plansList.map(sanitizePlanRecord) : [];
        setSavedPlans(sanitized);

        if (json.user?.id && typeof window !== 'undefined') {
          try {
            localStorage.setItem(getStorageKey(json.user.id), JSON.stringify(sanitized));
          } catch (_) {}
        }
      })
      .catch((e) => {
        console.warn('[FertilizerAPI] Error fetching from /api/user:', e);
        if (typeof window !== 'undefined') {
          try {
            const key = getStorageKey();
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                setSavedPlans(parsed.map(sanitizePlanRecord));
              }
            }
          } catch (_) {}
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const currentPhases = useMemo(() => PADDY_PHASES, []);

  // Auto-populate recommended initial quantities whenever landSize changes
  useEffect(() => {
    const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
    const pesticideLitres = computeRecommendedPesticideLitres(cents);
    const fertMinBags = computeRecommendedFertilizerBagRange(cents).minBags;

    const autoTargets: Array<{ id: string; qty: number }> = [
      { id: 'p1_fert', qty: pesticideLitres },
      { id: 'p2_tillering', qty: pesticideLitres },
      { id: 'p2_fert_labour', qty: fertMinBags },
      { id: 'p3_fert_dose3', qty: fertMinBags },
    ];

    setExpenseMap((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const target of autoTargets) {
        if (dirtyQtyTasksRef.current.has(target.id)) continue;
        const entry = next[target.id];
        if (!entry || entry.fertQty === target.qty) continue;
        const isBagTask = target.id === 'p2_fert_labour' || target.id === 'p3_fert_dose3';
        const isPesticideTask = target.id === 'p1_fert' || target.id === 'p2_tillering';
        const materialCost = isBagTask || isPesticideTask ? (entry.fertPrice ?? 0) : Math.round(target.qty * (entry.fertPrice ?? 0));
        const workerCost = Math.round((entry.labourCount ?? 0) * (entry.labourWage ?? 0));
        const totalCost = materialCost + workerCost + (entry.snackCost ?? 0) + (entry.travelCost ?? 0);
        const costPerDay = entry.days > 0 ? Math.round(totalCost / entry.days) : 0;
        next[target.id] = { ...entry, fertQty: target.qty, totalCost, costPerDay };
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [userDetails.landSize]);

  // ─── Step & Cultivation Handlers ───────────────────────────────────────────
  const handleCropSelect = (_crop: CultivationType = 'paddy') => {
    setCultivation('paddy');
    setStep2Completed(true);
  };

  const handleConfigureCrop = (_crop: CultivationType = 'paddy') => {
    setCultivation('paddy');
    setStep2Completed(true);
    setActivePhaseIndex(0);
    if (!activePlanId) {
      setExpenseMap((prev) => {
        const hasExisting = PADDY_PHASES[0]?.tasks.some((t) => prev[t.id] !== undefined);
        return hasExisting ? prev : buildEmptyExpenses(PADDY_PHASES, userDetails.landSize);
      });
    }
    setStep(3);
  };

  const handleCultivationSelect = handleCropSelect;

  // ─── Field Change Handlers ─────────────────────────────────────────────────
  const handleRateChange = (
    taskId: string,
    rate: number,
    travelCost?: number,
    hasTravelCost?: boolean
  ) => {
    const safeRate = toSafeNum(rate);
    updateTask(taskId, (current) => {
      const isTravelActive = hasTravelCost !== undefined ? hasTravelCost : (current.hasTravelCost ?? false);
      const safeTravel = travelCost !== undefined ? toSafeNum(travelCost) : (current.travelCost ?? 0);
      const totalCost = Math.round(safeRate + (isTravelActive ? safeTravel : 0));
      return {
        ratePerCent: safeRate,
        travelCost: safeTravel,
        hasTravelCost: isTravelActive,
        totalCost,
      };
    });
  };

  const handleRepairCostChange = (
    taskId: string,
    params: {
      hasRepairCost: boolean;
      mechanicName?: string;
      mechanicNumber?: string;
      repairCost?: number;
    }
  ) => {
    const safeRepair = toSafeNum(params.repairCost);
    updateTask(taskId, (current) => {
      const addedRepair = params.hasRepairCost ? safeRepair : 0;
      return {
        hasRepairCost: params.hasRepairCost,
        mechanicName: params.mechanicName ?? '',
        mechanicNumber: params.mechanicNumber ?? '',
        repairCost: safeRepair,
        totalCost: Math.round((current.ratePerCent || 0) + addedRepair),
      };
    });
  };

  const handleLabourChange = (
    taskId: string,
    count: number,
    wage: number,
    snacks?: number,
    travel?: number
  ) => {
    const safeCount = toSafeNum(count);
    const safeWage = toSafeNum(wage);
    updateTask(taskId, (current) => {
      const safeSnacks = snacks !== undefined ? toSafeNum(snacks) : (current.snackCost ?? 0);
      const safeTravel = travel !== undefined ? toSafeNum(travel) : (current.travelCost ?? 0);
      return {
        labourCount: safeCount,
        labourWage: safeWage,
        snackCost: safeSnacks,
        travelCost: safeTravel,
        totalCost: Math.round(safeCount * safeWage + safeSnacks + safeTravel),
        ratePerCent: 0,
      };
    });
  };

  const handleMultiDayChangeActiveDay = (taskId: string, nextDay: number, maxDays = 7) => {
    updateTask(taskId, () => ({
      activeDay: Math.min(maxDays, Math.max(1, Math.round(nextDay || 1))),
    }));
  };

  const handleMultiDayLabourChange = (
    taskId: string,
    day: number,
    count: number,
    wage: number,
    snacks?: number,
    travel?: number,
    maxDays = 7
  ) => {
    const safeCount = toSafeNum(count);
    const safeWage = toSafeNum(wage);
    updateMultiDayTask(
      taskId,
      day,
      maxDays,
      (existing) => ({
        day: Math.max(1, Math.round(day || 1)),
        labourCount: safeCount,
        labourWage: safeWage,
        snackCost: snacks !== undefined ? toSafeNum(snacks) : (existing?.snackCost ?? 0),
        travelCost: travel !== undefined ? toSafeNum(travel) : (existing?.travelCost ?? 0),
      }),
      (entries) => entries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0),
      (d) => d.labourCount > 0 || d.labourWage > 0 || (d.snackCost ?? 0) > 0 || (d.travelCost ?? 0) > 0,
      (day1) => ({
        labourCount: day1.labourCount,
        labourWage: day1.labourWage,
        snackCost: day1.snackCost,
        travelCost: day1.travelCost,
        ratePerCent: 0,
      })
    );
  };

  const handleFertilizerWithLabourChange = (
    taskId: string,
    fertQty: number,
    fertPrice: number,
    labourCount: number,
    labourWage: number,
    snackCost?: number,
    travelCost?: number,
    pesticideMl?: number
  ) => {
    const safeQty = toSafeNum(fertQty);
    const safePrice = toSafeNum(fertPrice);
    const safeWorkers = toSafeNum(labourCount);
    const safeWage = toSafeNum(labourWage);
    updateTask(taskId, (current) => {
      if (safeQty !== (current.fertQty ?? 0)) {
        dirtyQtyTasksRef.current.add(taskId);
      }
      const safeSnacks = snackCost !== undefined ? toSafeNum(snackCost) : (current.snackCost ?? 0);
      const safeTravel = travelCost !== undefined ? toSafeNum(travelCost) : (current.travelCost ?? 0);
      const isBagTask = taskId === 'p2_fert_labour' || taskId === 'p3_fert_dose3';
      const isPesticideTask = taskId === 'p1_fert' || taskId === 'p2_tillering';
      const materialCost = isBagTask || isPesticideTask ? safePrice : Math.round(safeQty * safePrice);
      const dayEntries = current.dayEntries;
      const workerCost =
        dayEntries && dayEntries.length > 0
          ? dayEntries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0)
          : Math.round(safeWorkers * safeWage) + safeSnacks + safeTravel;
      return {
        fertQty: safeQty,
        fertPrice: safePrice,
        labourCount: safeWorkers,
        labourWage: safeWage,
        snackCost: safeSnacks,
        travelCost: safeTravel,
        pesticideMl: pesticideMl !== undefined ? pesticideMl : current.pesticideMl,
        totalCost: materialCost + workerCost,
        ratePerCent: 0,
      };
    });
  };

  const handleMultiDayHarvestChange = (taskId: string, day: number, rate: number) => {
    const safeRate = toSafeNum(rate);
    updateMultiDayTask(
      taskId,
      day,
      7,
      (existing) => ({
        ...(existing || { day, labourCount: 0, labourWage: 0, snackCost: 0, travelCost: 0 }),
        day: Math.max(1, Math.round(day || 1)),
        ratePerCent: safeRate,
      }),
      (entries) => entries.reduce((sum, d) => sum + (d.ratePerCent || 0), 0),
      (d) => (d.ratePerCent || 0) > 0,
      (day1) => ({ ratePerCent: day1.ratePerCent ?? safeRate })
    );
  };

  const handleMultiDayGunnyBagsChange = (
    taskId: string,
    day: number,
    bagCount: number,
    bagPrice: number
  ) => {
    const safeCount = toSafeNum(bagCount);
    const safePrice = toSafeNum(bagPrice);
    updateMultiDayTask(
      taskId,
      day,
      7,
      (existing) => ({
        ...(existing || { day, labourCount: 0, labourWage: 0, snackCost: 0, travelCost: 0 }),
        day: Math.max(1, Math.round(day || 1)),
        bagCount: safeCount,
        bagPrice: safePrice,
      }),
      (entries) => entries.reduce((sum, d) => sum + (d.bagCount || 0) * (d.bagPrice || 0), 0),
      (d) => (d.bagCount || 0) > 0 || (d.bagPrice || 0) > 0,
      (day1) => ({ bagCount: day1.bagCount, bagPrice: day1.bagPrice })
    );
  };

  const handleMultiDayTransportChange = (
    taskId: string,
    day: number,
    params: {
      bagCount?: number;
      transportRent?: number;
      perBagLiftingCost?: number;
      loadingWorkers?: number;
      loadingWage?: number;
      loadingSnacks?: number;
    }
  ) => {
    updateMultiDayTask(
      taskId,
      day,
      7,
      (existing) => {
        const safeCount =
          params.bagCount !== undefined
            ? toSafeNum(params.bagCount)
            : params.transportRent !== undefined
            ? toSafeNum(params.transportRent)
            : existing?.bagCount ?? existing?.transportRent ?? 0;
        const safeLifting =
          params.perBagLiftingCost !== undefined
            ? toSafeNum(params.perBagLiftingCost)
            : params.loadingWorkers !== undefined
            ? toSafeNum(params.loadingWorkers)
            : existing?.perBagLiftingCost ?? existing?.loadingWorkers ?? 0;
        const safeSnacks =
          params.loadingSnacks !== undefined ? toSafeNum(params.loadingSnacks) : existing?.loadingSnacks ?? 0;
        return {
          ...(existing || { day, labourCount: 0, labourWage: 0, snackCost: 0, travelCost: 0 }),
          day: Math.max(1, Math.round(day || 1)),
          bagCount: safeCount,
          transportRent: safeCount,
          loadingWorkers: safeLifting,
          perBagLiftingCost: safeLifting,
          loadingWage: 0,
          loadingSnacks: safeSnacks,
        };
      },
      (entries) =>
        entries.reduce(
          (sum, d) =>
            sum +
            (d.bagCount ?? d.transportRent ?? 0) * (d.perBagLiftingCost ?? d.loadingWorkers ?? 0) +
            (d.loadingSnacks || 0),
          0
        ),
      (d) => (d.bagCount ?? d.transportRent ?? 0) > 0 && (d.perBagLiftingCost ?? d.loadingWorkers ?? 0) > 0,
      (day1) => ({
        bagCount: day1.bagCount,
        transportRent: day1.bagCount,
        loadingWorkers: day1.perBagLiftingCost,
        perBagLiftingCost: day1.perBagLiftingCost,
        loadingWage: 0,
        loadingSnacks: day1.loadingSnacks,
      })
    );
  };

  const handleMandiChange = (taskId: string, count: number, rate: number) => {
    const safeCount = toSafeNum(count);
    const safeRate = toSafeNum(rate);
    updateTask(taskId, () => ({
      mandiCount: safeCount,
      mandiRate: safeRate,
      totalCost: Math.round(safeCount * safeRate),
      ratePerCent: 0,
    }));
  };

  const handleToggleOptional = (taskId: string) => {
    updateTask(taskId, (current) => ({ isEnabled: current.isEnabled === false }));
  };

  const handleToggleMachineMode = (taskId: string, _defaultMachineRate = 25) => {
    updateTask(taskId, (current) => {
      const nextIsMachine = !current.isMachineMode;
      let totalCost = 0;
      let ratePerCent = current.ratePerCent || 0;

      if (nextIsMachine) {
        totalCost = Math.round(ratePerCent);
      } else {
        if (Array.isArray(current.dayEntries) && current.dayEntries.length > 0) {
          totalCost = current.dayEntries.reduce((sum, d) => sum + computeDailyLabourCost(d), 0);
        } else {
          const count = current.labourCount ?? 0;
          const wage = current.labourWage ?? 0;
          const snacks = current.snackCost ?? 0;
          const travel = current.travelCost ?? 0;
          totalCost = Math.round(count * wage + snacks + travel);
        }
        ratePerCent = 0;
      }

      return { isMachineMode: nextIsMachine, ratePerCent, totalCost };
    });
  };

  const handleToggleBagType = (
    taskId: string,
    plasticPrice = 20,
    traditionalPrice = 45
  ) => {
    updateTask(taskId, (current) => {
      const nextIsPlastic = current.isPlasticBag === false;
      const bagPrice = nextIsPlastic ? plasticPrice : traditionalPrice;
      const bagCount = current.bagCount ?? 0;
      return {
        isPlasticBag: nextIsPlastic,
        bagPrice,
        totalCost: Math.round(bagCount * bagPrice),
        ratePerCent: 0,
      };
    });
  };

  const handleGunnyBagsChange = (taskId: string, count: number, price: number) => {
    const safeCount = toSafeNum(count);
    const safePrice = toSafeNum(price);
    updateTask(taskId, () => ({
      bagCount: safeCount,
      bagPrice: safePrice,
      totalCost: Math.round(safeCount * safePrice),
      ratePerCent: 0,
    }));
  };

  const handleTransportLoadingChange = (
    taskId: string,
    transportRentOrBags: number,
    workersOrLiftingCost: number,
    wageOrSnacks?: number,
    snacksMaybe?: number
  ) => {
    const isLegacy4Args = snacksMaybe !== undefined;
    const safeBags = toSafeNum(transportRentOrBags);
    const safeLiftingCost = toSafeNum(workersOrLiftingCost);
    const safeSnacks = isLegacy4Args ? toSafeNum(snacksMaybe) : toSafeNum(wageOrSnacks);
    updateTask(taskId, () => ({
      bagCount: safeBags,
      transportRent: safeBags,
      perBagLiftingCost: safeLiftingCost,
      loadingWorkers: safeLiftingCost,
      loadingWage: 0,
      loadingSnacks: safeSnacks,
      totalCost: Math.round(safeBags * safeLiftingCost + safeSnacks),
      ratePerCent: 0,
    }));
  };

  const handleToggleYieldMode = (taskId: string) => {
    updateTask(taskId, (current) => {
      const nextMode: 'tons' | 'bags' = current.yieldMode === 'bags' ? 'tons' : 'bags';
      const yieldTons = current.yieldTons ?? 0;
      const bagWeightKg = current.bagWeightKg ?? 0;
      const grainBagPrice = current.grainBagPrice ?? 0;
      let grainBagCount = current.grainBagCount ?? 0;
      let totalCost = 0;

      if (nextMode === 'tons') {
        const totalKg = yieldTons * 1000;
        grainBagCount = bagWeightKg > 0 ? Number((totalKg / bagWeightKg).toFixed(2)) : 0;
        totalCost = bagWeightKg > 0 ? Math.round((totalKg / bagWeightKg) * grainBagPrice) : 0;
      } else {
        totalCost = Math.round(grainBagCount * grainBagPrice);
      }

      return {
        yieldMode: nextMode,
        grainBagCount,
        totalCost,
        ratePerCent: 0,
      };
    });
  };

  const handleGrainYieldChange = (
    taskId: string,
    params: {
      mode?: 'tons' | 'bags';
      yieldKg?: number;
      yieldTons?: number;
      bagWeightKg?: number;
      bagCount?: number;
      bagPrice: number;
    }
  ) => {
    const safePrice = toSafeNum(params.bagPrice);
    updateTask(taskId, (current) => {
      const safeYieldKg =
        params.yieldKg !== undefined && !isNaN(params.yieldKg)
          ? Math.max(0, params.yieldKg)
          : current.yieldKg ?? (current.yieldTons ?? 0) * 1000;
      const safeYieldTons = Number((safeYieldKg / 1000).toFixed(2));
      const safeBagWeight =
        params.bagWeightKg !== undefined && !isNaN(params.bagWeightKg)
          ? Math.max(0, params.bagWeightKg)
          : current.bagWeightKg ?? 0;
      const grainBagCount = safeBagWeight > 0 ? Number((safeYieldKg / safeBagWeight).toFixed(2)) : 0;
      return {
        yieldMode: 'tons',
        yieldKg: safeYieldKg,
        yieldTons: safeYieldTons,
        bagWeightKg: safeBagWeight,
        grainBagCount,
        grainBagPrice: safePrice,
        totalCost: Math.round(grainBagCount * safePrice),
        ratePerCent: 0,
      };
    });
  };

  const handleStrawYieldChange = (taskId: string, sackCount: number, price: number) => {
    const safeCount = toSafeNum(sackCount);
    const safePrice = toSafeNum(price);
    updateTask(taskId, () => ({
      strawSackCount: safeCount,
      strawPrice: safePrice,
      totalCost: Math.round(safeCount * safePrice),
      ratePerCent: 0,
    }));
  };

  const resetToRecommendedDefaults = () => {
    dirtyQtyTasksRef.current.clear();
    setExpenseMap(buildInitialExpenses(currentPhases, userDetails.landSize));
  };

  const handleToggleNotify = (
    taskId: string,
    notifyType: 'Herbicide_notify' | 'pesticide_notify' | 'fertilizer_notify',
    checked: boolean
  ) => {
    const keyMap = {
      Herbicide_notify: 'herbicideNotify',
      pesticide_notify: 'pesticideNotify',
      fertilizer_notify: 'fertilizerNotify',
    } as const;
    updateTask(taskId, () => ({ [keyMap[notifyType]]: checked }));
  };

  // ─── Validation & Calculations ─────────────────────────────────────────────
  const totals = useMemo(
    () => computePlanTotals(currentPhases, expenseMap),
    [currentPhases, expenseMap]
  );

  const validateStep1 = () => {
    const newErrors: Partial<Record<keyof UserDetails, string>> = {};
    if (!userDetails.name?.trim()) newErrors.name = t.step1?.errors?.name || 'Farmer name is required';
    if (!userDetails.phone?.trim() || !/^\d{10}$/.test(userDetails.phone.replace(/\D/g, ''))) {
      newErrors.phone = t.step1?.errors?.phone || 'Valid 10-digit mobile number is required';
    }
    if (!userDetails.landSize || userDetails.landSize <= 0) {
      newErrors.landSize = t.step1?.errors?.landSize || 'Land size must be greater than 0 cents';
    }
    if (!userDetails.location?.trim()) {
      newErrors.location = t.step1?.errors?.location || 'Location/District is required';
    }
    if (!userDetails.address?.trim()) {
      newErrors.address = t.step1?.errors?.address || 'Farm address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Submit = (e?: SyntheticEvent): boolean => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!validateStep1()) return false;
    setStep(2);
    return true;
  };

  const handleJumpToStep3 = (phaseIdx = 0) => {
    validateStep1();
    setActivePhaseIndex(phaseIdx);
    setStep(3);
  };

  const totalCropDays = getCropDurationDays(cultivation);
  const costPerCent = userDetails.landSize > 0 ? Math.round(totals.grandTotal / userDetails.landSize) : 0;
  const revenuePerCent = userDetails.landSize > 0 ? Math.round(totals.revenueTotal / userDetails.landSize) : 0;
  const netProfitPerCent = userDetails.landSize > 0 ? Math.round(totals.netProfit / userDetails.landSize) : 0;
  const roiPercentage = totals.grandTotal > 0 ? Math.round((totals.netProfit / totals.grandTotal) * 100) : 0;

  const getPhaseMeta = (phase: PhaseGroup) => {
    const localized = t.phases[phase.id as keyof typeof t.phases];
    return {
      month: localized?.month || phase.month,
      name: localized?.name || phase.name,
      daySpan: localized?.daySpan || phase.daySpan,
    };
  };

  const getTaskMeta = (task: ExpenseTask) => {
    const localized = t.tasks[task.id as keyof typeof t.tasks];
    return {
      name: localized?.name || task.name,
      dayRange: localized?.dayRange || task.dayRange,
      description: localized?.description || task.description,
      costEstimateHint: localized?.costEstimateHint || task.costEstimateHint,
    };
  };

  const activePhase = currentPhases[activePhaseIndex] || currentPhases[0];
  const activePhaseMeta = getPhaseMeta(activePhase);

  const stepsList = [
    { num: 1 as StepId, title: t.stepLabels.step1Title, subtitle: t.stepLabels.step1Subtitle },
    { num: 2 as StepId, title: t.stepLabels.step2Title, subtitle: t.stepLabels.step2Subtitle },
    { num: 3 as StepId, title: t.stepLabels.step3Title, subtitle: t.stepLabels.step3Subtitle },
  ];

  const clearError = (field: keyof UserDetails) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const clearErrors = () => setErrors({});

  // ─── Persistence ────────────────────────────────────────────────────────────
  const persistPlanToServer = async ({
    isDraft = false,
    isCompleted = false,
    redirectToRecords = true,
  }: {
    isDraft?: boolean;
    isCompleted?: boolean;
    redirectToRecords?: boolean;
  }) => {
    const nestedExpenses = formatToNestedExpenseMap(cultivation, expenseMap, userDetails.landSize);
    const cleanUserDetails = sanitizeUserDetails(userDetails);

    const payload = {
      id: activePlanId || undefined,
      isCompleted: Boolean(isCompleted),
      cultivation: 'paddy',
      userDetails: cleanUserDetails,
      expenseMap: nestedExpenses,
      totals: {
        grandTotal: totals.grandTotal,
        revenueTotal: totals.revenueTotal,
        netProfit: totals.netProfit,
      },
    };

    const savedRecord = await syncPlanToApi(payload);
    let planId = activePlanId;

    if (savedRecord) {
      planId = savedRecord.id;
      const updatedPlans = [
        savedRecord,
        ...savedPlans.filter((p) => p.id !== activePlanId && p.id !== savedRecord.id).map(sanitizePlanRecord),
      ];
      updateSavedPlansStateAndStorage(updatedPlans);
      setActivePlanId(savedRecord.id);
    } else if (redirectToRecords) {
      const maxNumericId = savedPlans.reduce((max, p) => {
        const num = parseInt(p.id, 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const fallbackId = activePlanId || String(maxNumericId + 1);
      planId = fallbackId;
      const nowFormatted = new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const existing = savedPlans.find((p) => p.id === activePlanId);
      const fallbackRecord: SavedPlanRecord = {
        id: fallbackId,
        created_at: existing?.created_at || nowFormatted,
        updated_at: nowFormatted,
        isCompleted: Boolean(isCompleted),
        cultivation: 'paddy',
        userDetails: cleanUserDetails,
        expenseMap: nestedExpenses,
        totals: {
          grandTotal: totals.grandTotal,
          revenueTotal: totals.revenueTotal,
          netProfit: totals.netProfit,
        },
      };
      const updatedPlans = [
        fallbackRecord,
        ...savedPlans.filter((p) => p.id !== activePlanId).map(sanitizePlanRecord),
      ];
      updateSavedPlansStateAndStorage(updatedPlans);
      setActivePlanId(fallbackId);
    }

    if (redirectToRecords) {
      const msg = isCompleted
        ? 'Cultivation plan marked as Completed and finalized!'
        : isDraft
        ? 'Cultivation draft saved successfully!'
        : t.step3?.savedSuccessToast || 'Cultivation record saved successfully!';
      setSaveSuccessMessage(msg);
      setPageView('records');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    }

    return planId;
  };

  const saveCurrentPlan = async (isDraft = false, isCompleted = false) =>
    persistPlanToServer({ isDraft, isCompleted, redirectToRecords: true });

  const savePhaseProgress = async () =>
    persistPlanToServer({ isDraft: true, isCompleted: false, redirectToRecords: false });

  const syncDirtyQtyFlagsFromPlan = (flat: Record<string, ExpenseEntry>) => {
    dirtyQtyTasksRef.current.clear();
    for (const id of ['p1_fert', 'p2_tillering', 'p3_fert_dose3']) {
      if ((flat?.[id]?.fertQty ?? 0) > 0) {
        dirtyQtyTasksRef.current.add(id);
      }
    }
  };

  /** Common plan-to-state loader */
  const applyPlanToState = (planId: string): SavedPlanRecord | null => {
    const plan = savedPlans.find((p) => p.id === planId);
    if (!plan) return null;
    const flatExpenses = plan.expenseMap?.phase_1
      ? nestedToFlatExpenseMap(plan.expenseMap, plan.cultivation, plan.userDetails?.landSize || 100)
      : plan.expenseMap;
    syncDirtyQtyFlagsFromPlan(flatExpenses || {});
    setCultivation(plan.cultivation);
    setUserDetails({
      ...DEFAULT_USER_DETAILS,
      ...plan.userDetails,
      location:
        [plan.userDetails?.village, plan.userDetails?.district, plan.userDetails?.state]
          .filter(Boolean)
          .join(', ') ||
        plan.userDetails?.address ||
        '',
    });
    setExpenseMap(flatExpenses || {});
    setActivePlanId(plan.id);
    setStep2Completed(true);
    return plan;
  };

  const loadPlanAndShowSummary = (planId: string) => {
    if (!applyPlanToState(planId)) return;
    setStep(4);
    setPageView('wizard');
  };

  const loadPlanForEditing = (planId: string) => {
    const plan = applyPlanToState(planId);
    if (!plan || plan.isCompleted) return;
    setActivePhaseIndex(0);
    setStep(1);
    setPageView('wizard');
  };

  const loadPlan = (planId: string) => {
    applyPlanToState(planId);
  };

  const deletePlan = (planId: string, e?: SyntheticEvent) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const updatedPlans = savedPlans.filter((p) => p.id !== planId);
    updateSavedPlansStateAndStorage(updatedPlans);
    if (activePlanId === planId) {
      setActivePlanId(null);
    }
    deletePlanFromApi(planId);
  };

  const createNewPlan = () => {
    dirtyQtyTasksRef.current.clear();
    setActivePlanId(null);
    setStep2Completed(false);
    setViewMode('individual');
    setUserDetails({
      ...DEFAULT_USER_DETAILS,
      state: '',
      district: '',
      city: '',
      village: '',
    });
    setErrors({});
    setCultivation('paddy');
    setExpenseMap(buildEmptyExpenses(PADDY_PHASES));
    setActivePhaseIndex(0);
    setStep(1);
    setPageView('wizard');
  };

  const openSavedRecords = () => setPageView('records');

  const isStep1Valid = useMemo(() => areStep1DetailsValid(userDetails), [userDetails]);

  const maxUnlockedStep: 1 | 2 | 3 = useMemo(() => {
    if (!isStep1Valid) return 1;
    if (!step2Completed && step < 3 && !activePlanId) return 2;
    return 3;
  }, [isStep1Valid, step2Completed, step, activePlanId]);

  const phaseCompletionMap = useMemo(
    () => currentPhases.map((ph) => isPhaseComplete(ph, expenseMap)),
    [currentPhases, expenseMap]
  );

  const highestUnlockedPhaseIndex = useMemo(() => {
    let unlocked = 0;
    for (let i = 0; i < currentPhases.length - 1; i++) {
      if (phaseCompletionMap[i]) {
        unlocked = i + 1;
      } else {
        break;
      }
    }
    return unlocked;
  }, [currentPhases.length, phaseCompletionMap]);

  const allPhasesComplete = useMemo(
    () => phaseCompletionMap.every(Boolean),
    [phaseCompletionMap]
  );

  return {
    step,
    setStep,
    pageView,
    setPageView,
    openSavedRecords,
    cultivation,
    activePhaseIndex,
    setActivePhaseIndex,
    viewMode,
    setViewMode,
    userDetails,
    setUserDetails,
    errors,
    validateStep1,
    clearError,
    clearErrors,
    expenseMap,
    currentPhases,
    isStep1Valid,
    step2Completed,
    maxUnlockedStep,
    phaseCompletionMap,
    highestUnlockedPhaseIndex,
    allPhasesComplete,
    handleCultivationSelect,
    handleCropSelect,
    handleConfigureCrop,
    handleRateChange,
    handleRepairCostChange,
    handleLabourChange,
    handleMultiDayChangeActiveDay,
    handleMultiDayLabourChange,
    handleMultiDayHarvestChange,
    handleMultiDayGunnyBagsChange,
    handleMultiDayTransportChange,
    handleFertilizerWithLabourChange,
    handleMandiChange,
    handleToggleOptional,
    handleToggleMachineMode,
    handleToggleBagType,
    handleGunnyBagsChange,
    handleTransportLoadingChange,
    handleToggleYieldMode,
    handleGrainYieldChange,
    handleStrawYieldChange,
    handleToggleNotify,
    resetToRecommendedDefaults,
    grandTotal: totals.grandTotal,
    phaseTotals: totals.phaseTotals,
    revenueTotal: totals.revenueTotal,
    netProfit: totals.netProfit,
    handleStep1Submit,
    handleJumpToStep3,
    totalCropDays,
    costPerCent,
    revenuePerCent,
    netProfitPerCent,
    roiPercentage,
    getPhaseMeta,
    getTaskMeta,
    activePhase,
    activePhaseMeta,
    stepsList,
    savedPlans,
    activePlanId,
    setActivePlanId,
    saveSuccessMessage,
    saveCurrentPlan,
    savePhaseProgress,
    loadPlanAndShowSummary,
    loadPlanForEditing,
    loadPlan,
    deletePlan,
    createNewPlan,
  };
}
