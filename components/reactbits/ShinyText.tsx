'use client';

import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

export const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  speed = 4,
  className = '',
}) => {
  return (
    <span
      className={`inline-block bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-emerald-300 to-cyan-400 bg-[length:200%_auto] ${
        !disabled ? 'animate-shimmer' : ''
      } ${className}`}
      style={{
        animationDuration: `${speed}s`,
      }}
    >
      {text}
    </span>
  );
};
