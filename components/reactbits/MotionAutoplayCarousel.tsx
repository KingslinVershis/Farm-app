'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionTemplate } from 'framer-motion';
import SpecularButton from './SpecularButton';

export const FARM_IMAGES = [
  { id: 'img-1', src: '/images/green-field.jpg', alt: 'Green Agricultural Field' },
  { id: 'img-2', src: '/images/plant.jpg', alt: 'Crop Plant Growth' },
  { id: 'img-3', src: '/images/pexels-mazhar-arslanoglu-706220627-38389252.jpg', alt: 'Agricultural Landscape' },
  { id: 'img-4', src: '/images/fresh-green.jpg', alt: 'Fresh Green Cultivation' },
];

interface MotionAutoplayCarouselProps {
  images?: Array<{ id: string; src: string; alt?: string }>;
  interval?: number; // Duration in ms per image (default: 4500ms)
  className?: string;
  onGetStartedClick?: () => void;
}

export default function MotionAutoplayCarousel({
  images = FARM_IMAGES,
  interval = 4500,
  className = '',
  onGetStartedClick,
}: MotionAutoplayCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track scroll progress of the hero section through the viewport
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Scroll Zoom Hero Transforms (scaling, subtle parallax, softening blur, graceful fade)
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const opacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 0.9, 0.35]);
  const blurPx = useTransform(scrollYProgress, [0, 1], [0, 8]);
  const filter = useMotionTemplate`blur(${blurPx}px)`;

  // Floating CTA Button transforms on scroll (fades out as user scrolls into metrics)
  const buttonOpacity = useTransform(scrollYProgress, [0, 0.28], [1, 0]);
  const buttonY = useTransform(scrollYProgress, [0, 0.28], [0, 24]);
  const buttonScale = useTransform(scrollYProgress, [0, 0.28], [1, 0.92]);

  useEffect(() => {
    if (!images || images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [images, interval]);

  const activeImage = images[currentIndex] || images[0];

  const handleScrollToContent = () => {
    if (onGetStartedClick) {
      onGetStartedClick();
      return;
    }
    const el = document.getElementById('dashboard-metrics');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden aspect-[16/9] max-h-[85vh] min-h-[300px] sm:min-h-[380px] lg:min-h-[460px] bg-slate-900 ${className}`}
      aria-roledescription="carousel"
      aria-label="Farm Highlights Autoplay Carousel"
    >
      {/* Scroll Zoom Hero Motion Container */}
      <motion.div
        style={{
          scale,
          y,
          opacity,
          filter,
        }}
        className="absolute inset-0 w-full h-full will-change-transform origin-center"
      >
        <AnimatePresence mode="sync">
          <motion.img
            key={activeImage.src}
            src={activeImage.src}
            alt={activeImage.alt || 'Farm Landscape'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 1.1, ease: 'easeInOut' },
            }}
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
            draggable={false}
          />
        </AnimatePresence>
      </motion.div>

      {/* Centered Specular Button at Bottom */}
      <motion.div
        style={{
          opacity: buttonOpacity,
          y: buttonY,
          scale: buttonScale,
        }}
        className="absolute bottom-6 sm:bottom-10 lg:bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
      >
        <SpecularButton
          size="lg"
          radius={18}
          tint="#ffffff"
          tintOpacity={0.04}
          textColor="#f5f5f5"
          lineColor="#ffffff"
          baseColor="#525252"
          intensity={1}
          idleIntensity={0.35}
          shineSize={10}
          shineFade={34}
          thickness={1.2}
          glow={1}
          followMouse
          proximity={250}
          onClick={handleScrollToContent}
        >
          Get Started
        </SpecularButton>
      </motion.div>
    </div>
  );
}
