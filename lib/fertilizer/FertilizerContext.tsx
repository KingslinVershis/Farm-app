'use client';

import React, { createContext, useContext } from 'react';
import { useFertilizerPlanner } from './useFertilizerPlanner';

type FertilizerPlannerReturn = ReturnType<typeof useFertilizerPlanner>;

const FertilizerContext = createContext<FertilizerPlannerReturn | null>(null);

export function FertilizerProvider({ children }: { children: React.ReactNode }) {
  const planner = useFertilizerPlanner();

  return (
    <FertilizerContext.Provider value={planner}>
      {children}
    </FertilizerContext.Provider>
  );
}

export function useFertilizerContext(): FertilizerPlannerReturn {
  const ctx = useContext(FertilizerContext);
  if (!ctx) {
    throw new Error('useFertilizerContext must be used within a FertilizerProvider');
  }
  return ctx;
}

