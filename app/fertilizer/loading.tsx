import React from 'react';
import { PageSkeleton } from '@/components/common/PageSkeleton';

export default function FertilizerLoading() {
  return (
    <div className="relative min-h-screen w-full">
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out scale-105"
        style={{
          backgroundImage: `url('/images/farm.jpg')`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 gpu-accelerate" />
      <div className="relative z-10 max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
        <PageSkeleton variant="form" />
      </div>
    </div>
  );
}
