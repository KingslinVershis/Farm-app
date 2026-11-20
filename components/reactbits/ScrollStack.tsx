'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRightIcon } from '@/components/icons/Icons';

export interface ScrollStackItemData {
  id?: string | number;
  eyebrow?: string;
  title: string;
  body: string;
  image: string;
  accent?: string;
  tag?: string;
  meta?: React.ReactNode;
  link?: string;
  linkText?: string;
}

export interface ScrollStackProps {
  items?: ScrollStackItemData[];
  children?: React.ReactNode;
  variant?: 'stack' | 'deck' | 'fade' | 'flip' | 'zoom' | 'reveal';
  scrollLength?: number;
  peek?: number;
  scaleStep?: number;
  blur?: number;
  dim?: number;
  topOffset?: number;
  smooth?: boolean;
  className?: string;
  cardClassName?: string;
  isTamil?: boolean;
}

interface ScrollCardProps {
  item: ScrollStackItemData;
  index: number;
  total: number;
  peek: number;
  scaleStep: number;
  blur: number;
  dim: number;
  topOffset: number;
  cardClassName?: string;
  isTamil?: boolean;
}

function ScrollCard({
  item,
  index,
  total,
  peek,
  scaleStep,
  blur,
  dim,
  topOffset,
  cardClassName = '',
  isTamil = false,
}: ScrollCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isLast = index === total - 1;

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start start', 'end start'],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 1 - scaleStep]);
  const opacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 1 - dim * 0.5, 1 - dim]);
  const filter = useTransform(scrollYProgress, (pos) => `blur(${pos * blur}px)`);

  const accentColor = item.accent || '#10b981';

  return (
    <motion.div
      ref={cardRef}
      style={{
        scale: isLast ? 1 : scale,
        opacity: isLast ? 1 : opacity,
        filter: isLast ? 'none' : filter,
        transformOrigin: 'top center',
        top: `${topOffset + index * peek}px`,
        zIndex: 10 + index,
      }}
      className={`sticky w-full mb-[12vh] sm:mb-[18vh] last:mb-0 transition-shadow duration-300 ${cardClassName}`}
    >
      <div className="relative rounded-[28px] sm:rounded-[36px] glass-panel border border-border-light bg-surface/90 dark:bg-slate-900/90 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] overflow-hidden p-6 sm:p-8 lg:p-10 transition-all duration-300">
        {/* Ambient Subtle Accent Glow */}
        <div
          className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Eyebrow, Title, Body, Metadata & CTA */}
          <div className="lg:col-span-6 space-y-5">
            {item.eyebrow && (
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest border"
                style={{
                  borderColor: `${accentColor}40`,
                  backgroundColor: `${accentColor}15`,
                  color: accentColor,
                }}
              >
                <span>{item.eyebrow}</span>
              </div>
            )}

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-text-main leading-tight m-0">
              {item.title}
            </h3>

            <p className="text-sm sm:text-base text-text-secondary leading-relaxed font-normal m-0">
              {item.body}
            </p>

            <div className="pt-2 flex items-center gap-4 flex-wrap">
              <Link
                href={item.link || '/fertilizer'}
                className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer text-slate-950 hover:brightness-110 active:scale-95"
                style={{ backgroundColor: accentColor }}
              >
                <span>{item.linkText || (isTamil ? 'திட்டம் தொடங்க →' : 'Explore Protocol →')}</span>
                <ArrowUpRightIcon size={14} />
              </Link>
            </div>
          </div>

          {/* Right Column: High-Res Visual Showcase */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl aspect-[16/10] group">
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority={index <= 1}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface ScrollStackChildWrapperProps {
  children: React.ReactNode;
  index: number;
  total: number;
  peek: number;
  scaleStep: number;
  blur: number;
  dim: number;
  topOffset: number;
  cardClassName?: string;
}

function ScrollStackChildWrapper({
  children,
  index,
  total,
  peek,
  scaleStep,
  blur,
  dim,
  topOffset,
  cardClassName = '',
}: ScrollStackChildWrapperProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isLast = index === total - 1;

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start start', 'end start'],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 1 - scaleStep]);
  const opacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 1 - dim * 0.5, 1 - dim]);
  const filter = useTransform(scrollYProgress, (pos) => `blur(${pos * blur}px)`);

  return (
    <motion.div
      ref={cardRef}
      style={{
        scale: isLast ? 1 : scale,
        opacity: isLast ? 1 : opacity,
        filter: isLast ? 'none' : filter,
        transformOrigin: 'top center',
        top: `${topOffset + index * peek}px`,
        zIndex: 10 + index,
      }}
      className={`sticky w-full mb-[12vh] sm:mb-[18vh] last:mb-0 transition-shadow duration-300 ${cardClassName}`}
    >
      {children}
    </motion.div>
  );
}

export default function ScrollStack({
  items,
  children,
  peek = 24,
  scaleStep = 0.06,
  blur = 4,
  dim = 0.25,
  topOffset = 88,
  className = '',
  cardClassName = '',
  isTamil = false,
}: ScrollStackProps) {
  return (
    <div className={`relative w-full ${className}`}>
      {children ? (
        React.Children.map(children, (child, index) => (
          <ScrollStackChildWrapper
            key={index}
            index={index}
            total={React.Children.count(children)}
            peek={peek}
            scaleStep={scaleStep}
            blur={blur}
            dim={dim}
            topOffset={topOffset}
            cardClassName={cardClassName}
          >
            {child}
          </ScrollStackChildWrapper>
        ))
      ) : items && items.length > 0 ? (
        items.map((item, index) => (
          <ScrollCard
            key={item.id ?? index}
            item={item}
            index={index}
            total={items.length}
            peek={peek}
            scaleStep={scaleStep}
            blur={blur}
            dim={dim}
            topOffset={topOffset}
            cardClassName={cardClassName}
            isTamil={isTamil}
          />
        ))
      ) : null}
    </div>
  );
}

