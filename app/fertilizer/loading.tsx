import React from 'react';
import { PageSkeleton } from '@/components/common/PageSkeleton';

export default function FertilizerLoading() {
  return (
    <div className="relative z-10 max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
      <PageSkeleton variant="form" />
    </div>
  );
}
