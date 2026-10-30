'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 text-white text-center">
      <div className="text-6xl mb-4">🌾</div>
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-400 mb-6 max-w-md">
        The requested resource could not be found. Return to Fertilizer Management to continue.
      </p>
      <Link
        href="/fertilizer"
        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-emerald-900/40"
      >
        Go to Fertilizer Planner
      </Link>
    </div>
  );
}

