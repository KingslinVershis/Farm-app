'use client';

import React, { useEffect } from 'react';
import { useMotionValue, useSpring, useTransform, motion } from 'motion/react';

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  formatCommas?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  decimals = 0,
  formatCommas = true,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, {
    damping: 25,
    stiffness: 90,
  });

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  const display = useTransform(springVal, (current) => {
    let formatted: string;
    if (decimals > 0) {
      formatted = Number(current).toFixed(decimals);
    } else {
      const rounded = Math.round(current);
      formatted = formatCommas ? rounded.toLocaleString() : rounded.toString();
    }
    return `${prefix}${formatted}${suffix}`;
  });

  return <motion.span className={className}>{display}</motion.span>;
};
