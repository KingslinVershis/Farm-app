import React from 'react';

export default function CropHealthLoading() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto space-y-5 animate-pulse">
      <div className="skeleton-box h-36 rounded-3xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="skeleton-box h-28 rounded-2xl" />
        <div className="skeleton-box h-28 rounded-2xl" />
        <div className="skeleton-box h-28 rounded-2xl" />
      </div>
      <div className="skeleton-box h-14 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="skeleton-box h-56 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

