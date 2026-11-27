'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { message } from 'antd';
import { useFertilizerContext } from '@/lib/fertilizer/FertilizerContext';
import { SavedRecordsView } from '@/components/fertilizer/SavedRecordsView';
import { StepNavigation } from '@/components/fertilizer/StepNavigation';
import { Step1FarmerDetails } from '@/components/fertilizer/Step1FarmerDetails';
import { Step2CropSelection } from '@/components/fertilizer/Step2CropSelection';
import { Step3PhaseExpenses } from '@/components/fertilizer/Step3PhaseExpenses';
import { Step4ExecutiveSummary } from '@/components/fertilizer/Step4ExecutiveSummary';
import { StickyDock } from '@/components/fertilizer/StickyDock';

export default function FertilizerCatchAllPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const {
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
    grandTotal,
    phaseTotals,
    revenueTotal,
    netProfit,
    handleStep1Submit,
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
  } = useFertilizerContext();

  const isInitialSync = useRef(true);
  const pendingStepGrantRef = useRef<number>(0);

  const prevPathnameRef = useRef<string | null>(null);

  // Clear validation errors only when route/pathname actually changes
  useEffect(() => {
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname) {
      clearErrors();
    }
    prevPathnameRef.current = pathname;
  }, [pathname, clearErrors]);

  // Sync state from current URL pathname and enforce sequential Step 1 -> 2 -> 3 access order
  useEffect(() => {
    if (!pathname) return;

    const grantedStep = pendingStepGrantRef.current;

    // 1. Portfolio records view: /fertilizer or /fertilizer/
    if (pathname === '/fertilizer' || pathname === '/fertilizer/') {
      if (pageView !== 'records') {
        setPageView('records');
      }
      isInitialSync.current = false;
      return;
    }

    // 2. Direct /fertilizer/create redirect to step1
    if (pathname === '/fertilizer/create' || pathname === '/fertilizer/create/') {
      router.replace('/fertilizer/create/step1');
      isInitialSync.current = false;
      return;
    }

    // 3. Summary view: /fertilizer/summary/:planId
    if (pathname.startsWith('/fertilizer/summary/')) {
      const planIdFromUrl = pathname.replace('/fertilizer/summary/', '').trim();
      if (pageView !== 'wizard' || step !== 4) {
        setPageView('wizard');
        setStep(4);
      }
      if (planIdFromUrl && activePlanId !== planIdFromUrl) {
        loadPlanAndShowSummary(planIdFromUrl);
      }
      isInitialSync.current = false;
      return;
    }

    // 4. Wizard Step view:
    // New format: /fertilizer/step1/1 or /fertilizer/step1
    const newFormatMatch = pathname.match(/^\/fertilizer\/step([1-3])(?:\/([^/]+))?\/?$/);
    // Legacy format: /fertilizer/create/step1 or /fertilizer/1/step1
    const legacyFormatMatch = pathname.match(/^\/fertilizer\/([^/]+)\/step([1-3])\/?$/);

    let targetStep: 1 | 2 | 3 | null = null;
    let urlPlanId: string | null = null;
    let isCreate = false;

    if (newFormatMatch) {
      targetStep = parseInt(newFormatMatch[1], 10) as 1 | 2 | 3;
      urlPlanId = newFormatMatch[2] ? newFormatMatch[2].trim() : null;
      isCreate = !urlPlanId;
    } else if (legacyFormatMatch) {
      targetStep = parseInt(legacyFormatMatch[2], 10) as 1 | 2 | 3;
      const part = legacyFormatMatch[1].trim();
      if (part === 'create') {
        isCreate = true;
      } else {
        urlPlanId = part;
        isCreate = false;
      }
    }

    if (targetStep !== null) {
      // If viewing/editing an existing plan (e.g. /fertilizer/step1/1), load the plan if not already active
      if (urlPlanId) {
        if (activePlanId !== urlPlanId) {
          const plan = savedPlans.find((p) => p.id === urlPlanId);
          if (plan) {
            loadPlan(urlPlanId);
          }
        }
      } else {
        // Enforce sequential access guard for new plan creation
        if (targetStep === 2 && !isStep1Valid && !activePlanId && grantedStep < 2) {
          router.replace('/fertilizer/create/step1');
          return;
        }
        if (targetStep === 3) {
          if (!isStep1Valid && !activePlanId && grantedStep < 3) {
            router.replace('/fertilizer/create/step1');
            return;
          }
          if (!step2Completed && !activePlanId && grantedStep < 3) {
            router.replace('/fertilizer/create/step2');
            return;
          }
        }
      }

      pendingStepGrantRef.current = 0;
      if (pageView !== 'wizard' || step !== targetStep) {
        setPageView('wizard');
        setStep(targetStep);
      }
      isInitialSync.current = false;
      return;
    }

    // 5. Direct /fertilizer/:planId (without /stepX) -> default to step1
    const barePlanMatch = pathname.match(/^\/fertilizer\/([^/]+)\/?$/);
    if (barePlanMatch) {
      const planId = barePlanMatch[1];
      if (planId !== 'create' && planId !== 'summary') {
        router.replace(`/fertilizer/step1/${planId}`);
        return;
      }
    }

    isInitialSync.current = false;
  }, [
    pathname,
    pageView,
    step,
    activePlanId,
    savedPlans,
    isStep1Valid,
    step2Completed,
    loadPlan,
    loadPlanAndShowSummary,
    setPageView,
    setStep,
    router,
  ]);

  // Route-aware navigation helpers
  const handleNavigateToRecords = () => {
    clearErrors();
    router.push('/fertilizer');
  };

  const handleNavigateToCreateNew = () => {
    clearErrors();
    pendingStepGrantRef.current = 0;
    createNewPlan();
    router.push('/fertilizer/create/step1');
  };

  const handleSelectPlanSummary = (planId: string) => {
    clearErrors();
    loadPlanAndShowSummary(planId);
    router.push(`/fertilizer/summary/${planId}`);
  };

  const handleEditPlan = (planId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    clearErrors();
    pendingStepGrantRef.current = 3;
    loadPlanForEditing(planId);
    router.push(`/fertilizer/step1/${planId}`);
  };

  const handleStepNavSelect = (targetStep: 1 | 2 | 3 | 4) => {
    clearErrors();
    const getStepUrl = (s: number) =>
      activePlanId ? `/fertilizer/step${s}/${activePlanId}` : `/fertilizer/create/step${s}`;

    if (targetStep > maxUnlockedStep && targetStep !== 4) {
      if (!isStep1Valid) {
        validateStep1();
        message.warning('Please fill all required Step 1 Farmer Details first.');
        if (pathname !== getStepUrl(1)) {
          router.push(getStepUrl(1));
        }
        return;
      }
      if (targetStep === 3) {
        message.warning('Please select and continue from Step 2 Crop Selection first.');
        if (pathname !== getStepUrl(2)) {
          router.push(getStepUrl(2));
        }
        return;
      }
    }

    if (targetStep === 1) router.push(getStepUrl(1));
    else if (targetStep === 2) router.push(getStepUrl(2));
    else if (targetStep === 3) router.push(getStepUrl(3));
    else if (targetStep === 4) {
      const id = activePlanId || userDetails.phone || 'record';
      router.push(`/fertilizer/summary/${id}`);
    }
  };

  const handleStep1FormSubmit = (e?: React.FormEvent) => {
    const success = handleStep1Submit(e);
    if (success) {
      pendingStepGrantRef.current = 2;
      const targetUrl = activePlanId ? `/fertilizer/step2/${activePlanId}` : '/fertilizer/create/step2';
      router.push(targetUrl);
    }
  };

  const handleCropSelectionAndProceed = (cropType: any) => {
    pendingStepGrantRef.current = 3;
    handleConfigureCrop(cropType);
    const targetUrl = activePlanId ? `/fertilizer/step3/${activePlanId}` : '/fertilizer/create/step3';
    router.push(targetUrl);
  };

  const handleSummaryNavigation = () => {
    const targetId = activePlanId || userDetails.phone || 'record';
    router.push(`/fertilizer/summary/${targetId}`);
  };

  return (
    <div className="relative min-h-screen text-text-main font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Background Photography Layer with Soft Vignette & Frosted Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out scale-105"
        style={{
          backgroundImage: `url(https://res.cloudinary.com/chk0va7a/image/upload/v1795758908/farm.jpg)`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 gpu-accelerate" />

      {/* Main Responsive Application Shell */}
      <div className="relative z-10 max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 pb-32">
        {/* Floating Save Notification Toast */}
        <AnimatePresence>
          {saveSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-6 right-6 z-50"
            >
              <div className="rounded-xl glass-panel bg-emerald-500/20 border border-emerald-500/50 px-5 py-3 shadow-2xl flex items-center gap-3 text-emerald-200 text-sm font-bold backdrop-blur-sm">
                <span className="text-xl">💾</span>
                <span>{saveSuccessMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* VIEW 1: SAVED RECORDS PORTFOLIO (/fertilizer)                            */}
        {/* ========================================================================= */}
        <AnimatePresence mode="wait" initial={false}>
          {pageView === 'records' && (
            <motion.div
              key="records-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <SavedRecordsView
                savedPlans={savedPlans}
                activePlanId={activePlanId}
                onSelectPlan={handleSelectPlanSummary}
                onEditPlan={handleEditPlan}
                onDeletePlan={deletePlan}
                onCreateNewRecord={handleNavigateToCreateNew}
              />
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: 3-STEP CULTIVATION WIZARD (/fertilizer/create/... & summary)       */}
          {/* ========================================================================= */}
          {pageView === 'wizard' && (
            <motion.div
              key="wizard-view"
              className="fertilizer-step-scope"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step Navigation Tabs (Hidden for summary page, and on mobile when in Step 3 where dedicated mobile header is present) */}
              {step !== 4 && (
                <div className={step === 3 ? 'hidden md:block' : 'block'}>
                  <StepNavigation
                    currentStep={step}
                    maxUnlockedStep={maxUnlockedStep}
                    onSelectStep={handleStepNavSelect}
                    stepsList={stepsList}
                    onOpenRecords={handleNavigateToRecords}
                    savedPlansCount={savedPlans.length}
                  />
                </div>
              )}

              {/* Step 1: Farmer Parameters & Land Area (/fertilizer/create/step1) */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <Step1FarmerDetails
                    userDetails={userDetails}
                    setUserDetails={setUserDetails}
                    errors={errors}
                    onClearError={clearError}
                    onSubmit={handleStep1FormSubmit}
                    onJumpToStep3={handleNavigateToRecords}
                  />
                </motion.div>
              )}

              {/* Step 2: Cultivation Crop Selector (/fertilizer/create/step2) */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <Step2CropSelection
                    userDetails={userDetails}
                    cultivation={cultivation}
                    onSelectCrop={handleCropSelect}
                    onConfigureCrop={handleCropSelectionAndProceed}
                    onBackToStep1={() => {
                      const targetUrl = activePlanId ? `/fertilizer/step1/${activePlanId}` : '/fertilizer/create/step1';
                      router.push(targetUrl);
                    }}
                  />
                </motion.div>
              )}

              {/* Step 3: 5 Cultivation Phases Expenses (/fertilizer/create/step3) */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <Step3PhaseExpenses
                    cultivation={cultivation}
                    currentPhases={currentPhases}
                    activePhaseIndex={activePhaseIndex}
                    setActivePhaseIndex={setActivePhaseIndex}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    userDetails={userDetails}
                    expenseMap={expenseMap}
                    phaseTotals={phaseTotals}
                    getPhaseMeta={getPhaseMeta}
                    getTaskMeta={getTaskMeta}
                    activePhase={activePhase}
                    activePhaseMeta={activePhaseMeta}
                    handleRateChange={handleRateChange}
                    handleRepairCostChange={handleRepairCostChange}
                    handleLabourChange={handleLabourChange}
                    handleMultiDayChangeActiveDay={handleMultiDayChangeActiveDay}
                    handleMultiDayLabourChange={handleMultiDayLabourChange}
                    handleMultiDayHarvestChange={handleMultiDayHarvestChange}
                    handleMultiDayGunnyBagsChange={handleMultiDayGunnyBagsChange}
                    handleMultiDayTransportChange={handleMultiDayTransportChange}
                    handleFertilizerWithLabourChange={handleFertilizerWithLabourChange}
                    handleMandiChange={handleMandiChange}
                    handleToggleOptional={handleToggleOptional}
                    handleToggleMachineMode={handleToggleMachineMode}
                    handleToggleBagType={handleToggleBagType}
                    handleGunnyBagsChange={handleGunnyBagsChange}
                    handleTransportLoadingChange={handleTransportLoadingChange}
                    handleToggleYieldMode={handleToggleYieldMode}
                    handleGrainYieldChange={handleGrainYieldChange}
                    handleStrawYieldChange={handleStrawYieldChange}
                    handleToggleNotify={handleToggleNotify}
                    resetToRecommendedDefaults={resetToRecommendedDefaults}
                    savedPlans={savedPlans}
                    activePlanId={activePlanId}
                    saveCurrentPlan={saveCurrentPlan}
                    savePhaseProgress={savePhaseProgress}
                    loadPlanAndShowSummary={handleSelectPlanSummary}
                    deletePlan={deletePlan}
                    createNewPlan={handleNavigateToCreateNew}
                    highestUnlockedPhaseIndex={highestUnlockedPhaseIndex}
                    phaseCompletionMap={phaseCompletionMap}
                    allPhasesComplete={allPhasesComplete}
                  />

                  {/* Sticky Bottom Dock */}
                  <StickyDock
                    grandTotal={grandTotal}
                    revenueTotal={revenueTotal}
                    netProfit={netProfit}
                    netProfitPerCent={netProfitPerCent}
                    activePhaseIndex={activePhaseIndex}
                    totalPhases={currentPhases.length}
                    viewMode={viewMode}
                    savedPlansCount={savedPlans.length}
                    onBack={() => {
                      if (viewMode === 'all') {
                        setViewMode('individual');
                      } else if (activePhaseIndex > 0) {
                        setActivePhaseIndex((prev) => prev - 1);
                      } else {
                        const targetUrl = activePlanId ? `/fertilizer/step2/${activePlanId}` : '/fertilizer/create/step2';
                        router.push(targetUrl);
                      }
                    }}
                    onNextPhase={() => {
                      if (activePhaseIndex < currentPhases.length - 1) {
                        setActivePhaseIndex((prev) => prev + 1);
                      } else {
                        handleSummaryNavigation();
                      }
                    }}
                    onSavePlan={saveCurrentPlan}
                    onViewSummary={handleSummaryNavigation}
                  />
                </motion.div>
              )}

              {/* Step 4: Executive Commercial Dossier (/fertilizer/summary/[userid]) */}
              {step === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                >
                  <Step4ExecutiveSummary
                    userDetails={userDetails}
                    cultivation={cultivation}
                    totalCropDays={totalCropDays}
                    grandTotal={grandTotal}
                    revenueTotal={revenueTotal}
                    netProfit={netProfit}
                    costPerCent={costPerCent}
                    revenuePerCent={revenuePerCent}
                    roiPercentage={roiPercentage}
                    currentPhases={currentPhases}
                    phaseTotals={phaseTotals}
                    expenseMap={expenseMap}
                    getPhaseMeta={getPhaseMeta}
                    getTaskMeta={getTaskMeta}
                    savedPlans={savedPlans}
                    activePlanId={activePlanId}
                    onLoadPlan={handleSelectPlanSummary}
                    onEditPhase={(phaseIdx: number) => {
                      setActivePhaseIndex(phaseIdx);
                      const targetUrl = activePlanId ? `/fertilizer/step3/${activePlanId}` : '/fertilizer/create/step3';
                      router.push(targetUrl);
                    }}
                    onBackToPhase5={() => {
                      setActivePhaseIndex(currentPhases.length - 1);
                      const targetUrl = activePlanId ? `/fertilizer/step3/${activePlanId}` : '/fertilizer/create/step3';
                      router.push(targetUrl);
                    }}
                    onOpenSavedRecords={handleNavigateToRecords}
                    onCreateNewRecord={handleNavigateToCreateNew}
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

