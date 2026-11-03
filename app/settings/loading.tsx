import React from 'react';
import { PageSkeleton } from '@/components/common/PageSkeleton';

export default function SettingsLoading() {
  return (
    <div className="relative min-h-screen w-full">
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out scale-105"
        style={{
          backgroundImage: `url('/images/setting.png')`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 gpu-accelerate" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <PageSkeleton variant="dashboard" />
      </div>
    </div>
  );
}

