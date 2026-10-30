'use client';

import React, { useEffect, useState } from 'react';
import { useRive, Layout, Fit, Alignment, Rive as RiveCanvas } from '@rive-app/react-canvas';

if (typeof window !== 'undefined' && RiveCanvas) {
  try {
    (RiveCanvas as any).suppressDeprecationWarnings = ['animations-param'];
  } catch {}
}

export function RiveVillageBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { rive, RiveComponent } = useRive({
    src: '/videos/day-to-night-village-scene.riv',
    animations: 'Day_To_Night',
    autoplay: true,
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
  });

  // Play once on initial page load, with no repeating or looping
  useEffect(() => {
    if (!rive) return;
    try {
      rive.play('Day_To_Night');
    } catch {}
  }, [rive]);

  if (!mounted) {
    return (
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out"
        style={{
          backgroundImage: `url('/images/farm.jpg')`,
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Rive Live Canvas Layer - Plays once on initial page load */}
      <RiveComponent
        className="w-full h-full object-cover"
        aria-hidden="true"
      />
      {/* Subtle atmospheric tint overlay matching theme */}
      <div className="absolute inset-0 bg-black/10 dark:bg-black/25 pointer-events-none" />
    </div>
  );
}

export default RiveVillageBackground;
