import React from 'react';
import { PageSkeleton } from '@/components/common/PageSkeleton';

export default function SeedsLoading() {
  return (
    <div className="relative min-h-screen w-full">
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out scale-105"
        style={{
          backgroundImage: `url('/images/green.png')`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 gpu-accelerate" />
      <div className="relative z-10 flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto">
        <PageSkeleton variant="cards" />
      </div>
    </div>
  );
}
