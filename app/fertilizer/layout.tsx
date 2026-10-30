'use client';

import React from 'react';
import { FertilizerProvider } from '@/lib/fertilizer/FertilizerContext';

export default function FertilizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <FertilizerProvider>
      {children}
    </FertilizerProvider>
  );
}

