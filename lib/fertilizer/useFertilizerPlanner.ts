'use client';

import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { PADDY_PHASES } from './data';
import {
  buildEmptyExpenses,
  buildInitialExpenses,
  computePlanTotals,
  formatToNestedExpenseMap,
  getCropDurationDays,
  nestedToFlatExpenseMap,
} from './calc';
import type {
  CultivationType,
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
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // ─── API sync helper ────────────────────────────────────────────────────────
  // Syncs a plan to the server-side API and retrieves DB-assigned id & timestamps.
  const getStorageKey = (userId?: string | null): string => {
    let resolvedId = userId;
    if (!resolvedId && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('agripulse_user');
        if (stored) {
          const u = JSON.parse(stored);
          if (u?.id) resolvedId = String(u.id);
        }
      } catch (_) {}
    }
    return resolvedId ? `farm_app_saved_plans_${resolvedId}` : 'farm_app_saved_plans';
  };

  const syncPlanToApi = async (
    planPayload: any
  ): Promise<SavedPlanRecord | null> => {
    if (typeof window === 'undefined') return null;
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planPayload),
      });
      const json = await res.json();
      if (json.success && json.data) {
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
    } catch (e) {
      console.warn('[FertilizerAPI] Could not delete plan from API:', e);
    }
  };
  // ───────────────────────────────────────────────────────────────────────────

  // Helper to ensure every plan strictly adheres to the Paddy JSON schema
  const sanitizePlanRecord = (p: any): SavedPlanRecord => {
    const userDetails = p.userDetails || {};
    const landSize = Number(userDetails.landSize) || 100;
    const cleanUserDetails = {
      name: userDetails.name || '',
      phone: userDetails.phone || '',
      landSize: Number(userDetails.landSize) || 0,
      state: userDetails.state || 'Tamil Nadu',
      district: userDetails.district || '',
      city: userDetails.city || '',
      village: userDetails.village || '',
      address: userDetails.address || '',
    };

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
      userDetails: cleanUserDetails,
      expenseMap: nestedExpenseMap,
      totals: {
        grandTotal: p.totals?.grandTotal || 0,
        revenueTotal: p.totals?.revenueTotal || 0,
        netProfit: p.totals?.netProfit || 0,
      },
    };
  };

  // Hydrate user-specific saved plans from /api/user and user-scoped storage
  useEffect(() => {
    let active = true;

    // Purge legacy unscoped key to prevent cross-account contamination
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('farm_app_saved_plans');
      } catch (_) {}
    }

    // Authoritative fetch from /api/user which returns { success: true, user, plans }
    fetch('/api/user')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json || !json.success) return;
        const plansList = json.plans || [];
        const sanitized: SavedPlanRecord[] = Array.isArray(plansList)
          ? plansList.map(sanitizePlanRecord)
          : [];
        setSavedPlans(sanitized);

        if (json.user?.id && typeof window !== 'undefined') {
          try {
            localStorage.setItem(getStorageKey(json.user.id), JSON.stringify(sanitized));
          } catch (_) {}
        }
      })
      .catch((e) => {
        console.warn('[FertilizerAPI] Error fetching from /api/user:', e);
        // Offline fallback to current user-scoped storage
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

  const currentPhases = useMemo(
    () => PADDY_PHASES,
    []
  );

  const handleCropSelect = (crop: CultivationType = 'paddy') => {
    setCultivation('paddy');
    // Stay on step 2 - do NOT advance step!
  };

  const handleConfigureCrop = (crop: CultivationType = 'paddy') => {
    setCultivation('paddy');
    setActivePhaseIndex(0);
    const phases = PADDY_PHASES;
    if (!activePlanId) {
      setExpenseMap((prev) => {
        const hasExisting = phases[0]?.tasks.some((t) => prev[t.id] !== undefined);
        return hasExisting ? prev : buildEmptyExpenses(phases);
      });
    }
    setStep(3);
  };

  const handleCultivationSelect = handleCropSelect;

  const handleRateChange = (
    taskId: string,
    rate: number,
    travelCost?: number,
    hasTravelCost?: boolean
  ) => {
    const safeRate = isNaN(rate) ? 0 : Math.max(0, rate);
    const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      const isTravelActive =
        hasTravelCost !== undefined ? hasTravelCost : (current.hasTravelCost ?? false);
      const safeTravel =
        travelCost !== undefined
          ? (isNaN(travelCost) ? 0 : Math.max(0, travelCost))
          : (current.travelCost ?? 0);
      const addedTravel = isTravelActive ? safeTravel : 0;
      const totalCost = Math.round(safeRate * cents + addedTravel);
      const costPerDay = current.days > 0 ? Math.round(totalCost / current.days) : 0;
      return {
        ...prev,
        [taskId]: {
          ...current,
          ratePerCent: safeRate,
          travelCost: safeTravel,
          hasTravelCost: isTravelActive,
          totalCost,
          costPerDay,
        },
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
    const safeCount = isNaN(count) ? 0 : Math.max(0, count);
    const safeWage = isNaN(wage) ? 0 : Math.max(0, wage);
    const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      const safeSnacks =
        snacks !== undefined ? (isNaN(snacks) ? 0 : Math.max(0, snacks)) : (current.snackCost ?? 0);
      const safeTravel =
        travel !== undefined ? (isNaN(travel) ? 0 : Math.max(0, travel)) : (current.travelCost ?? 0);
      const totalCost = Math.round(safeCount * safeWage + safeSnacks + safeTravel);
      const costPerDay = current.days > 0 ? Math.round(totalCost / current.days) : 0;
      const ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
      return {
        ...prev,
        [taskId]: {
          ...current,
          labourCount: safeCount,
          labourWage: safeWage,
          snackCost: safeSnacks,
          travelCost: safeTravel,
          totalCost,
          costPerDay,
          ratePerCent,
        },
      };
    });
  };

  const handleFertilizerWithLabourChange = (
    taskId: string,
    fertQty: number,
    fertPrice: number,
    labourCount: number,
    labourWage: number
  ) => {
    const safeQty = isNaN(fertQty) ? 0 : Math.max(0, fertQty);
    const safePrice = isNaN(fertPrice) ? 0 : Math.max(0, fertPrice);
    const safeWorkers = isNaN(labourCount) ? 0 : Math.max(0, labourCount);
    const safeWage = isNaN(labourWage) ? 0 : Math.max(0, labourWage);
    const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      const materialCost = Math.round(safeQty * safePrice);
      const workerCost = Math.round(safeWorkers * safeWage);
      const totalCost = materialCost + workerCost;
      const costPerDay = current.days > 0 ? Math.round(totalCost / current.days) : 0;
      const ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
      return {
        ...prev,
        [taskId]: {
          ...current,
          fertQty: safeQty,
          fertPrice: safePrice,
          labourCount: safeWorkers,
          labourWage: safeWage,
          totalCost,
          costPerDay,
          ratePerCent,
        },
      };
    });
  };

  const handleMandiChange = (taskId: string, count: number, rate: number) => {
    const safeCount = isNaN(count) ? 0 : Math.max(0, count);
    const safeRate = isNaN(rate) ? 0 : Math.max(0, rate);
    const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      const totalCost = Math.round(safeCount * safeRate);
      const costPerDay = current.days > 0 ? Math.round(totalCost / current.days) : 0;
      const ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
      return {
        ...prev,
        [taskId]: {
          ...current,
          mandiCount: safeCount,
          mandiRate: safeRate,
          totalCost,
          costPerDay,
          ratePerCent,
        },
      };
    });
  };

  const handleToggleOptional = (taskId: string) => {
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      return {
        ...prev,
        [taskId]: {
          ...current,
          isEnabled: current.isEnabled === false ? true : false,
        },
      };
    });
  };

  const handleToggleMachineMode = (taskId: string, defaultMachineRate: number = 25) => {
    const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      const nextIsMachine = !current.isMachineMode;
      let totalCost = 0;
      let ratePerCent = current.ratePerCent;

      if (nextIsMachine) {
        ratePerCent = defaultMachineRate;
        totalCost = Math.round(ratePerCent * cents);
      } else {
        const count = current.labourCount ?? 5;
        const wage = current.labourWage ?? 500;
        const snacks = current.snackCost ?? 200;
        const travel = current.travelCost ?? 200;
        totalCost = Math.round(count * wage + snacks + travel);
        ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
      }

      const costPerDay = current.days > 0 ? Math.round(totalCost / current.days) : 0;

      return {
        ...prev,
        [taskId]: {
          ...current,
          isMachineMode: nextIsMachine,
          ratePerCent,
          totalCost,
          costPerDay,
        },
      };
    });
  };

  const handleToggleBagType = (
    taskId: string,
    plasticPrice: number = 20,
    traditionalPrice: number = 45
  ) => {
    const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      const nextIsPlastic = current.isPlasticBag === false ? true : false;
      const bagPrice = nextIsPlastic ? plasticPrice : traditionalPrice;
      const bagCount = current.bagCount ?? 120;
      const totalCost = Math.round(bagCount * bagPrice);
      const costPerDay = current.days > 0 ? Math.round(totalCost / current.days) : 0;
      const ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
      return {
        ...prev,
        [taskId]: {
          ...current,
          isPlasticBag: nextIsPlastic,
          bagPrice,
          totalCost,
          costPerDay,
          ratePerCent,
        },
      };
    });
  };

  const handleGunnyBagsChange = (taskId: string, count: number, price: number) => {
    const safeCount = isNaN(count) ? 0 : Math.max(0, count);
    const safePrice = isNaN(price) ? 0 : Math.max(0, price);
    const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      const totalCost = Math.round(safeCount * safePrice);
      const costPerDay = current.days > 0 ? Math.round(totalCost / current.days) : 0;
      const ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
      return {
        ...prev,
        [taskId]: {
          ...current,
          bagCount: safeCount,
          bagPrice: safePrice,
          totalCost,
          costPerDay,
          ratePerCent,
        },
      };
    });
  };

  const handleTransportLoadingChange = (
    taskId: string,
    transportRent: number,
    workers: number,
    wage: number,
    snacks: number
  ) => {
    const safeRent = isNaN(transportRent) ? 0 : Math.max(0, transportRent);
    const safeWorkers = isNaN(workers) ? 0 : Math.max(0, workers);
    const safeWage = isNaN(wage) ? 0 : Math.max(0, wage);
    const safeSnacks = isNaN(snacks) ? 0 : Math.max(0, snacks);
    const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      const totalCost = Math.round(safeRent + safeWorkers * safeWage + safeSnacks);
      const costPerDay = current.days > 0 ? Math.round(totalCost / current.days) : 0;
      const ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
      return {
        ...prev,
        [taskId]: {
          ...current,
          transportRent: safeRent,
          loadingWorkers: safeWorkers,
          loadingWage: safeWage,
          loadingSnacks: safeSnacks,
          totalCost,
          costPerDay,
          ratePerCent,
        },
      };
    });
  };

  const handleToggleYieldMode = (taskId: string) => {
    const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      const nextMode: 'tons' | 'bags' = current.yieldMode === 'bags' ? 'tons' : 'bags';
      const yieldTons = current.yieldTons ?? 14;
      const bagWeightKg = current.bagWeightKg ?? 75;
      const grainBagPrice = current.grainBagPrice ?? 1650;
      let grainBagCount = current.grainBagCount ?? 186.67;
      let totalCost = 0;

      if (nextMode === 'tons') {
        const totalKg = yieldTons * 1000;
        const safeWeight = bagWeightKg > 0 ? bagWeightKg : 75;
        grainBagCount = Number((totalKg / safeWeight).toFixed(2));
        totalCost = Math.round((totalKg / safeWeight) * grainBagPrice);
      } else {
        totalCost = Math.round(grainBagCount * grainBagPrice);
      }

      const costPerDay = current.days > 0 ? Math.round(totalCost / current.days) : 0;
      const ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;

      return {
        ...prev,
        [taskId]: {
          ...current,
          yieldMode: nextMode,
          grainBagCount,
          totalCost,
          costPerDay,
          ratePerCent,
        },
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
    const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;

      const safePrice = isNaN(params.bagPrice) ? 0 : Math.max(0, params.bagPrice);
      const safeYieldKg =
        params.yieldKg !== undefined && !isNaN(params.yieldKg)
          ? Math.max(0, params.yieldKg)
          : (current.yieldKg ?? ((current.yieldTons ?? 14) * 1000));
      const safeYieldTons = Number((safeYieldKg / 1000).toFixed(2));
      const safeBagWeight =
        params.bagWeightKg !== undefined && !isNaN(params.bagWeightKg)
          ? Math.max(1, params.bagWeightKg)
          : (current.bagWeightKg ?? 75);
      const grainBagCount = Number((safeYieldKg / safeBagWeight).toFixed(2));
      const totalCost = Math.round(grainBagCount * safePrice);
      const costPerDay = current.days > 0 ? Math.round(totalCost / current.days) : 0;
      const ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;

      return {
        ...prev,
        [taskId]: {
          ...current,
          yieldMode: 'tons',
          yieldKg: safeYieldKg,
          yieldTons: safeYieldTons,
          bagWeightKg: safeBagWeight,
          grainBagCount,
          grainBagPrice: safePrice,
          totalCost,
          costPerDay,
          ratePerCent,
        },
      };
    });
  };

  const handleStrawYieldChange = (taskId: string, sackCount: number, price: number) => {
    const safeCount = isNaN(sackCount) ? 0 : Math.max(0, sackCount);
    const safePrice = isNaN(price) ? 0 : Math.max(0, price);
    const cents = userDetails.landSize > 0 ? userDetails.landSize : 0;
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      const totalCost = Math.round(safeCount * safePrice);
      const costPerDay = current.days > 0 ? Math.round(totalCost / current.days) : 0;
      const ratePerCent = cents > 0 ? Math.round(totalCost / cents) : 0;
      return {
        ...prev,
        [taskId]: {
          ...current,
          strawSackCount: safeCount,
          strawPrice: safePrice,
          totalCost,
          costPerDay,
          ratePerCent,
        },
      };
    });
  };

  const resetToRecommendedDefaults = () => {
    setExpenseMap(buildInitialExpenses(currentPhases, userDetails.landSize));
  };

  const handleToggleNotify = (
    taskId: string,
    notifyType: 'Herbicide_notify' | 'pesticide_notify' | 'fertilizer_notify',
    checked: boolean
  ) => {
    setExpenseMap((prev) => {
      const current = prev[taskId];
      if (!current) return prev;
      if (notifyType === 'Herbicide_notify') {
        return { ...prev, [taskId]: { ...current, herbicideNotify: checked } };
      } else if (notifyType === 'pesticide_notify') {
        return { ...prev, [taskId]: { ...current, pesticideNotify: checked } };
      } else {
        return { ...prev, [taskId]: { ...current, fertilizerNotify: checked } };
      }
    });
  };

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
      newErrors.address = t.step1?.errors?.address || 'Farm address or survey number is required';
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

  const handleJumpToStep3 = (phaseIdx: number = 0) => {
    validateStep1();
    setActivePhaseIndex(phaseIdx);
    setStep(3);
  };

  const totalCropDays = getCropDurationDays(cultivation);
  const costPerCent = userDetails.landSize > 0 ? Math.round(totals.grandTotal / userDetails.landSize) : 0;
  const revenuePerCent =
    userDetails.landSize > 0 ? Math.round(totals.revenueTotal / userDetails.landSize) : 0;
  const netProfitPerCent =
    userDetails.landSize > 0 ? Math.round(totals.netProfit / userDetails.landSize) : 0;
  const roiPercentage =
    totals.grandTotal > 0 ? Math.round((totals.netProfit / totals.grandTotal) * 100) : 0;

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

  const saveCurrentPlan = async (isDraft: boolean = false, isCompleted: boolean = false) => {
    const nestedExpenses = formatToNestedExpenseMap(cultivation, expenseMap, userDetails.landSize);

    const cleanUserDetails = {
      name: userDetails.name || '',
      phone: userDetails.phone || '',
      landSize: Number(userDetails.landSize) || 0,
      state: userDetails.state || 'Tamil Nadu',
      district: userDetails.district || '',
      city: userDetails.city || '',
      village: userDetails.village || '',
      address: userDetails.address || '',
    };

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

    // Save to PostgreSQL via API to get authoritative id, created_at, and updated_at directly from DB
    const savedRecord = await syncPlanToApi(payload);

    let planId = activePlanId;
    if (savedRecord) {
      planId = savedRecord.id;
      const updatedPlans = [
        savedRecord,
        ...savedPlans.filter((p) => p.id !== activePlanId && p.id !== savedRecord.id).map(sanitizePlanRecord),
      ];
      setSavedPlans(updatedPlans);
      setActivePlanId(savedRecord.id);

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(getStorageKey(), JSON.stringify(updatedPlans));
        } catch (e) {
          console.error('Failed to save plans to localStorage', e);
        }
      }
    } else {
      // Offline fallback only if network/fetch completely fails
      const fallbackId = activePlanId || `plan_${Date.now()}`;
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
      setSavedPlans(updatedPlans);
      setActivePlanId(fallbackId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(getStorageKey(), JSON.stringify(updatedPlans));
        } catch (_) {}
      }
    }

    if (isCompleted) {
      setSaveSuccessMessage('Cultivation plan marked as Completed and finalized!');
    } else if (isDraft) {
      setSaveSuccessMessage('Cultivation draft saved successfully!');
    } else {
      setSaveSuccessMessage(t.step3?.savedSuccessToast || 'Cultivation record saved successfully!');
    }
    setPageView('records');

    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 4000);

    return planId;
  };

  const loadPlanAndShowSummary = (planId: string) => {
    const plan = savedPlans.find((p) => p.id === planId);
    if (!plan) return;
    const flatExpenses = plan.expenseMap?.phase_1
      ? nestedToFlatExpenseMap(plan.expenseMap, plan.cultivation, plan.userDetails?.landSize || 100)
      : plan.expenseMap;
    setCultivation(plan.cultivation);
    setUserDetails({
      ...DEFAULT_USER_DETAILS,
      ...plan.userDetails,
      location: [plan.userDetails?.village, plan.userDetails?.district, plan.userDetails?.state].filter(Boolean).join(', ') || plan.userDetails?.address || '',
    });
    setExpenseMap(flatExpenses || {});
    setActivePlanId(plan.id);
    setStep(4);
    setPageView('wizard');
  };

  const loadPlanForEditing = (planId: string) => {
    const plan = savedPlans.find((p) => p.id === planId);
    if (!plan) return;
    if (plan.isCompleted) return;
    const flatExpenses = plan.expenseMap?.phase_1
      ? nestedToFlatExpenseMap(plan.expenseMap, plan.cultivation, plan.userDetails?.landSize || 100)
      : plan.expenseMap;
    setCultivation(plan.cultivation);
    setUserDetails({
      ...DEFAULT_USER_DETAILS,
      ...plan.userDetails,
      location: [plan.userDetails?.village, plan.userDetails?.district, plan.userDetails?.state].filter(Boolean).join(', ') || plan.userDetails?.address || '',
    });
    setExpenseMap(flatExpenses || {});
    setActivePlanId(plan.id);
    setActivePhaseIndex(0);
    setStep(1);
    setPageView('wizard');
  };

  const loadPlan = (planId: string) => {
    const plan = savedPlans.find((p) => p.id === planId);
    if (!plan) return;
    const flatExpenses = plan.expenseMap?.phase_1
      ? nestedToFlatExpenseMap(plan.expenseMap, plan.cultivation, plan.userDetails?.landSize || 100)
      : plan.expenseMap;
    setCultivation(plan.cultivation);
    setUserDetails({
      ...DEFAULT_USER_DETAILS,
      ...plan.userDetails,
      location: [plan.userDetails?.village, plan.userDetails?.district, plan.userDetails?.state].filter(Boolean).join(', ') || plan.userDetails?.address || '',
    });
    setExpenseMap(flatExpenses || {});
    setActivePlanId(plan.id);
  };

  const deletePlan = (planId: string, e?: SyntheticEvent) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const updatedPlans = savedPlans.filter((p) => p.id !== planId);
    setSavedPlans(updatedPlans);
    if (activePlanId === planId) {
      setActivePlanId(null);
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(getStorageKey(), JSON.stringify(updatedPlans));
      } catch (err) {
        console.error('Failed to update localStorage', err);
      }
    }
    // Mirror deletion to API
    deletePlanFromApi(planId);
  };

  const createNewPlan = () => {
    setActivePlanId(null);
    // Fill static test values for Step 1 and all phases for easy testing
    setUserDetails({
      name: 'Arun Kumar',
      phone: '9876543210',
      landSize: 100,
      state: 'Tamil Nadu',
      district: '',
      city: '',
      village: '',
      location: 'Tamil Nadu',
      address: 'Survey No. 88/2, Tenkasi High Road',
    });
    setErrors({});
    setCultivation('paddy');
    setExpenseMap(buildInitialExpenses(PADDY_PHASES, 100));
    setActivePhaseIndex(0);
    setStep(1);
    setPageView('wizard');
  };

  const openSavedRecords = () => {
    setPageView('records');
  };

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
    clearError,
    expenseMap,
    currentPhases,
    handleCultivationSelect,
    handleCropSelect,
    handleConfigureCrop,
    handleRateChange,
    handleLabourChange,
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
    loadPlanAndShowSummary,
    loadPlanForEditing,
    loadPlan,
    deletePlan,
    createNewPlan,
  };
}
