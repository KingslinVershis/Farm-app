import React from 'react';
import { PageSkeleton } from '@/components/common/PageSkeleton';

export default function SettingsLoading() {
  return (
    <div className="relative min-h-screen w-full">
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <PageSkeleton variant="dashboard" />
      </div>
    </div>
  );
}

