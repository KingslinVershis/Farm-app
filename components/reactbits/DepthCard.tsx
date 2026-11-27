'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';

export interface DepthCardLayer {
  image: string;
  depth: number; // Parallax intensity factor (e.g. 0.2 to 1.5)
  className?: string;
}

export interface DepthCardProps extends React.HTMLAttributes<HTMLDivElement> {
  image?: string;
  alt?: string;
  title?: string;
  description?: string;
  width?: number | string;
  height?: number | string;
  aspectRatio?: string;
  maxRotation?: number; // Maximum tilt angle in degrees (default: 15)
  maxTranslation?: number; // Maximum parallax translation in px (default: 15)
  spotlight?: boolean; // Spotlight effect toggle (default: true)
  spotlightColor?: string; // Color of radial spotlight
  revealAnimation?: 'slide' | 'fade' | 'scale' | 'none'; // Content reveal animation (default: 'slide')
  disableOnMobile?: boolean; // Disable 3D tilt on touch devices (default: false)
  respectReducedMotion?: boolean; // Respect prefers-reduced-motion (default: true)
  layers?: DepthCardLayer[]; // Optional multi-layer assets for 3D parallax
  bottomContent?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  imageClassName?: string;
}

export function DepthCard({
  image,
  alt = 'Card visual',
  title,
  description,
  width,
  height,
  aspectRatio,
  maxRotation = 15,
  maxTranslation = 15,
  spotlight = true,
  spotlightColor = 'rgba(255, 255, 255, 0.18)',
  revealAnimation = 'slide',
  disableOnMobile = false,
  respectReducedMotion = true,
  layers,
  bottomContent,
  children,
  className = '',
  imageClassName = '',
  style,
  ...props
}: DepthCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [translation, setTranslation] = useState({ x: 0, y: 0 });
  const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
      if (respectReducedMotion && window.matchMedia) {
        setPrefersReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      }
    }
  }, [respectReducedMotion]);

  const isDisabled = prefersReduced || (disableOnMobile && isTouchDevice);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDisabled) return;
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Normalized coordinates from -1 (left/top) to +1 (right/bottom)
      const normX = (x / rect.width) * 2 - 1;
      const normY = (y / rect.height) * 2 - 1;

      setRotation({
        x: -normY * maxRotation,
        y: normX * maxRotation,
      });

      setTranslation({
        x: normX * maxTranslation,
        y: normY * maxTranslation,
      });

      setSpotlightPos({ x, y });
    },
    [isDisabled, maxRotation, maxTranslation]
  );

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
    setTranslation({ x: 0, y: 0 });
  };

  // Toggle on mobile tap so touch users can view/hide telemetry content smoothly
  const handleTouchEnd = () => {
    if (isTouchDevice) {
      setIsHovered((prev) => !prev);
    }
  };

  // Dynamic 3D tilt transforms
  const transformCard =
    !isDisabled && isHovered
      ? `perspective(1000px) rotateX(${rotation.x.toFixed(2)}deg) rotateY(${rotation.y.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`
      : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';

  const effectiveBottomContent = bottomContent || children;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchEnd={handleTouchEnd}
      className={`group relative w-full overflow-hidden rounded-3xl select-none cursor-pointer transition-shadow duration-500 ${className}`}
      style={{
        width: width ?? undefined,
        height: height ?? undefined,
        aspectRatio,
        transform: transformCard,
        transformStyle: 'preserve-3d',
        transition: isHovered
          ? 'transform 0.12s ease-out, box-shadow 0.4s ease'
          : 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease',
        ...style,
      }}
      {...props}
    >
      {/* 1. Base Image Layer (or Custom Layers) */}
      {image && !layers && (
        <div
          className="absolute inset-0 w-full h-full overflow-hidden"
          style={{
            transform: !isDisabled && isHovered
              ? `translate3d(${-translation.x * 0.4}px, ${-translation.y * 0.4}px, 0px) scale(1.08)`
              : 'translate3d(0px, 0px, 0px) scale(1.02)',
            transition: isHovered
              ? 'transform 0.15s ease-out'
              : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <Image
            src={image}
            alt={alt}
            fill
            className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${imageClassName}`}
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority={false}
          />
        </div>
      )}

      {/* Multi-layer Parallax support */}
      {layers &&
        layers.map((layer, index) => (
          <div
            key={index}
            className={`absolute inset-0 w-full h-full overflow-hidden ${layer.className || ''}`}
            style={{
              transform: !isDisabled && isHovered
                ? `translate3d(${-translation.x * layer.depth}px, ${-translation.y * layer.depth}px, ${layer.depth * 20}px) scale(1.06)`
                : 'translate3d(0px, 0px, 0px) scale(1)',
              transition: isHovered
                ? 'transform 0.15s ease-out'
                : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Image
              src={layer.image}
              alt={`${alt} layer ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        ))}

      {/* 2. Dark Atmospheric Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none z-10" />

      {/* 3. Dynamic Cursor Spotlight Glow */}
      {spotlight && !isDisabled && (
        <div
          className="pointer-events-none absolute inset-0 z-15 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(460px circle at ${spotlightPos.x}px ${spotlightPos.y}px, ${spotlightColor}, transparent 75%)`,
          }}
        />
      )}

      {/* 4. Bottom Content Layer with Smooth Hover Transition from Bottom */}
      <div
        className="absolute bottom-5 sm:bottom-6 left-5 sm:left-6 right-5 sm:right-6 z-20 flex flex-col justify-end pointer-events-none"
        style={{
          transform: 'translateZ(30px)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* If Title / Description props are used (e.g., Mountains / Ocean / Forest layout) */}
        {(title || description) && (
          <div className="text-white space-y-1">
            {title && (
              <h3
                className={`text-xl sm:text-2xl font-black tracking-tight text-white transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${
                  isHovered && description ? '-translate-y-1' : 'translate-y-0'
                }`}
              >
                {title}
              </h3>
            )}
            {description && (
              <p
                className={`text-xs sm:text-sm text-white/85 font-normal transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${
                  isHovered
                    ? 'opacity-100 translate-y-0 max-h-24 pointer-events-auto'
                    : 'opacity-0 translate-y-4 max-h-0 pointer-events-none overflow-hidden'
                }`}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {/* If Custom Telemetry / Card Children are used (Feature Showcases) */}
        {effectiveBottomContent && (
          <div
            className={`w-full transition-all duration-500 ${
              revealAnimation === 'slide'
                ? isHovered
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 translate-y-8 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
                : revealAnimation === 'fade'
                ? isHovered
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
                : revealAnimation === 'scale'
                ? isHovered
                  ? 'opacity-100 scale-100 pointer-events-auto'
                  : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
                : ''
            }`}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {effectiveBottomContent}
          </div>
        )}
      </div>
    </div>
  );
}

export default DepthCard;
