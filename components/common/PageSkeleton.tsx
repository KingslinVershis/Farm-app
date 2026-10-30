'use client';

import React from 'react';

interface PageSkeletonProps {
  variant?: 'dashboard' | 'table' | 'form' | 'cards';
  title?: string;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ variant = 'dashboard' }) => {
  return (
    <div className="flex flex-col gap-7 fade-in w-full animate-pulse">
      {/* 1. Header Skeleton */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="space-y-2.5">
          <div className="skeleton-box h-5 w-36 rounded-full" />
          <div className="skeleton-box h-8 w-72 rounded-lg" />
          <div className="skeleton-box h-4 w-96 max-w-full rounded" />
        </div>
        <div className="flex gap-3">
          <div className="skeleton-box h-10 w-28 rounded-lg" />
          <div className="skeleton-box h-10 w-36 rounded-lg" />
        </div>
      </div>

      {/* 2. Variant-Specific Skeleton Content */}
      {variant === 'dashboard' && (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-3 shadow-lg"
              >
                <div className="flex justify-between items-center">
                  <div className="skeleton-box h-3.5 w-24 rounded" />
                  <div className="skeleton-box h-9 w-9 rounded-lg" />
                </div>
                <div className="skeleton-box h-7 w-28 rounded" />
                <div className="skeleton-box h-3 w-32 rounded" />
              </div>
            ))}
          </div>

          {/* 2 Large Panels Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((panel) => (
              <div
                key={panel}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-xl"
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="space-y-1.5">
                    <div className="skeleton-box h-5 w-40 rounded" />
                    <div className="skeleton-box h-3 w-56 rounded" />
                  </div>
                  <div className="skeleton-box h-6 w-24 rounded-full" />
                </div>

                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((row) => (
                    <div
                      key={row}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-slate-800/80 flex items-center justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="skeleton-box h-4 w-32 rounded" />
                        <div className="skeleton-box h-3 w-24 rounded" />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="skeleton-box h-5 w-14 rounded" />
                        <div className="skeleton-box h-6 w-20 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {variant === 'table' && (
        <div className="space-y-4">
          {/* Filter Bar Skeleton */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="skeleton-box h-10 w-64 rounded-xl" />
              <div className="skeleton-box h-10 w-48 rounded-xl" />
              <div className="skeleton-box h-10 w-40 rounded-xl" />
            </div>
            <div className="skeleton-box h-9 w-24 rounded-lg" />
          </div>

          {/* Table Container Skeleton */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
            {/* Table Header */}
            <div className="p-4 border-b border-slate-800 grid grid-cols-6 gap-4 bg-slate-900/80">
              {[1, 2, 3, 4, 5, 6].map((h) => (
                <div key={h} className="skeleton-box h-4 rounded w-3/4" />
              ))}
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-800/60">
              {[1, 2, 3, 4, 5, 6, 7].map((row) => (
                <div key={row} className="p-4 grid grid-cols-6 gap-4 items-center">
                  <div className="skeleton-box h-4 w-4/5 rounded" />
                  <div className="skeleton-box h-4 w-2/3 rounded" />
                  <div className="skeleton-box h-3 w-full rounded-full" />
                  <div className="skeleton-box h-4 w-1/2 rounded" />
                  <div className="skeleton-box h-4 w-1/2 rounded" />
                  <div className="skeleton-box h-7 w-20 rounded-lg justify-self-end" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {variant === 'form' && (
        <div className="space-y-6">
          {/* Step tabs */}
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3"
              >
                <div className="skeleton-box w-8 h-8 rounded-full shrink-0" />
                <div className="space-y-1 w-full">
                  <div className="skeleton-box h-3.5 w-3/4 rounded" />
                  <div className="skeleton-box h-2.5 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Form Card Skeleton */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-7 space-y-6 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="skeleton-box h-3.5 w-24 rounded" />
                <div className="skeleton-box h-11 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="skeleton-box h-3.5 w-28 rounded" />
                <div className="skeleton-box h-11 w-full rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="skeleton-box h-3.5 w-32 rounded" />
                <div className="skeleton-box h-11 w-full rounded-xl" />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="skeleton-box h-4 w-60 rounded" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="skeleton-box h-11 w-full rounded-xl" />
                <div className="skeleton-box h-11 w-full rounded-xl" />
                <div className="skeleton-box h-11 w-full rounded-xl" />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="skeleton-box h-3.5 w-40 rounded" />
              <div className="skeleton-box h-20 w-full rounded-xl" />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <div className="skeleton-box h-12 w-48 rounded-xl" />
            </div>
          </div>
        </div>
      )}

      {variant === 'cards' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4">
            <div className="skeleton-box h-10 w-72 rounded-xl" />
            <div className="flex gap-2">
              <div className="skeleton-box h-9 w-28 rounded-lg" />
              <div className="skeleton-box h-9 w-28 rounded-lg" />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((card) => (
              <div
                key={card}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-3 shadow-lg"
              >
                <div className="flex justify-between items-start">
                  <div className="skeleton-box h-5 w-20 rounded-full" />
                  <div className="skeleton-box h-4 w-16 rounded" />
                </div>
                <div className="skeleton-box h-5 w-4/5 rounded" />
                <div className="skeleton-box h-3.5 w-full rounded" />
                <div className="skeleton-box h-3.5 w-2/3 rounded" />
                <div className="mt-2 pt-3 border-t border-slate-800 flex justify-between items-center">
                  <div className="skeleton-box h-6 w-24 rounded" />
                  <div className="skeleton-box h-8 w-20 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
