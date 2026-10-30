'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
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
    loadPlanAndShowSummary,
    loadPlanForEditing,
    deletePlan,
    createNewPlan,
  } = useFertilizerContext();

  const isInitialSync = useRef(true);

  // Sync state from current URL pathname (handles direct links & browser Back/Forward)
  useEffect(() => {
    if (!pathname) return;

    if (pathname === '/fertilizer' || pathname === '/fertilizer/') {
      if (pageView !== 'records') {
        setPageView('records');
      }
    } else if (pathname === '/fertilizer/create/step1') {
      if (pageView !== 'wizard' || step !== 1) {
        setPageView('wizard');
        setStep(1);
      }
    } else if (pathname === '/fertilizer/create/step2') {
      if (pageView !== 'wizard' || step !== 2) {
        setPageView('wizard');
        setStep(2);
      }
    } else if (pathname === '/fertilizer/create/step3') {
      if (pageView !== 'wizard' || step !== 3) {
        setPageView('wizard');
        setStep(3);
      }
    } else if (pathname.startsWith('/fertilizer/summary/')) {
      const planIdFromUrl = pathname.replace('/fertilizer/summary/', '').trim();
      if (pageView !== 'wizard' || step !== 4) {
        setPageView('wizard');
        setStep(4);
      }
      if (planIdFromUrl && activePlanId !== planIdFromUrl) {
        loadPlanAndShowSummary(planIdFromUrl);
      }
    }
    isInitialSync.current = false;
  }, [pathname, pageView, step, activePlanId, loadPlanAndShowSummary, setPageView, setStep]);

  // Route-aware navigation helpers
  const handleNavigateToRecords = () => {
    router.push('/fertilizer');
  };

  const handleNavigateToCreateNew = () => {
    createNewPlan();
    router.push('/fertilizer/create/step1');
  };

  const handleSelectPlanSummary = (planId: string) => {
    loadPlanAndShowSummary(planId);
    router.push(`/fertilizer/summary/${planId}`);
  };

  const handleEditPlan = (planId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    loadPlanForEditing(planId);
    router.push('/fertilizer/create/step3');
  };

  const handleStepNavSelect = (targetStep: 1 | 2 | 3 | 4) => {
    if (targetStep === 1) router.push('/fertilizer/create/step1');
    else if (targetStep === 2) router.push('/fertilizer/create/step2');
    else if (targetStep === 3) router.push('/fertilizer/create/step3');
    else if (targetStep === 4) {
      const id = activePlanId || userDetails.phone || 'record';
      router.push(`/fertilizer/summary/${id}`);
    }
  };

  const handleStep1FormSubmit = (e?: React.FormEvent) => {
    const success = handleStep1Submit(e);
    if (success) {
      router.push('/fertilizer/create/step2');
    }
  };

  const handleCropSelectionAndProceed = (cropType: any) => {
    handleConfigureCrop(cropType);
    router.push('/fertilizer/create/step3');
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
          backgroundImage: `url(/images/farm.jpg)`,
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
        <AnimatePresence mode="wait">
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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              {/* Step Navigation Tabs (Hidden for summary page) */}
              {step !== 4 && (
                <StepNavigation
                  currentStep={step}
                  onSelectStep={handleStepNavSelect}
                  stepsList={stepsList}
                />
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
                    onBackToStep1={() => router.push('/fertilizer/create/step1')}
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
                    handleLabourChange={handleLabourChange}
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
                    loadPlanAndShowSummary={handleSelectPlanSummary}
                    deletePlan={deletePlan}
                    createNewPlan={handleNavigateToCreateNew}
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
                        router.push('/fertilizer/create/step2');
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
                    onBackToPhase5={() => {
                      setActivePhaseIndex(currentPhases.length - 1);
                      router.push('/fertilizer/create/step3');
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

