'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useMotionTemplate } from 'framer-motion';
import { useLanguage } from '@/components/providers/LanguageProvider';
import SpecularButton from './SpecularButton';
import TechText from './TechText';

export const HERO_VIDEO_SRC = 'https://res.cloudinary.com/chk0va7a/video/upload/v1795759821/crop.mp4';

interface MotionAutoplayCarouselProps {
  videoSrc?: string;
  videos?: Array<{ id: string; src: string; title?: string }>; // Backwards compatibility
  images?: Array<{ id: string; src: string; alt?: string }>; // Backwards compatibility
  className?: string;
  onGetStartedClick?: () => void;
}

export default function MotionAutoplayCarousel({
  videoSrc = HERO_VIDEO_SRC,
  className = '',
  onGetStartedClick,
}: MotionAutoplayCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { locale, messages } = useLanguage();
  const isTamil = locale === 'ta';
  const car = messages.dashboard.carousel;

  const line1 = car.heroLine1;
  const line2 = car.heroLine2;
  const line3 = car.heroLine3;
  const heroMultiLineText = `${line1}\n${line2}\n${line3}`;

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

  // Ensure seamless autoplay and looping of crop.mp4
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback on first user interaction if browser policy delays initial autoplay
        const onFirstInteraction = () => {
          video.play().catch(() => { });
          window.removeEventListener('pointerdown', onFirstInteraction);
          window.removeEventListener('touchstart', onFirstInteraction);
          window.removeEventListener('scroll', onFirstInteraction);
        };
        window.addEventListener('pointerdown', onFirstInteraction, { once: true, passive: true });
        window.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });
        window.addEventListener('scroll', onFirstInteraction, { once: true, passive: true });
      });
    }
  }, [videoSrc]);

  const handleScrollToContent = () => {
    if (onGetStartedClick) {
      onGetStartedClick();
      return;
    }
    const el =
      document.getElementById('feature-sections') ||
      document.getElementById('dashboard-metrics') ||
      document.querySelector('section:nth-of-type(2)');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden aspect-[16/9] h-[95vh] bg-slate-950 ${className}`}
      aria-label="Farm Highlights Hero Video"
    >
      {/* Scroll Zoom Hero Motion Container */}
      <motion.div
        style={{
          scale,
          y,
          opacity,
          filter,
        }}
        className="absolute inset-0 w-full will-change-transform origin-center"
      >
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-[95vh] w-full object-cover object-center pointer-events-none select-none"
        />

        {/* Subtle cinematic gradient vignettes for optimal contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/35 pointer-events-none" />
      </motion.div>

      {/* Centered Specular Button at Bottom (z-30 ensures priority clickability over full-area canvas) */}
      <div className="absolute bottom-6 sm:bottom-10 lg:bottom-12 inset-x-0 flex justify-center z-30 pointer-events-none">
        <motion.div
          style={{
            opacity: buttonOpacity,
            y: buttonY,
            scale: buttonScale,
          }}
          className="pointer-events-auto"
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
            {car.getStarted}
          </SpecularButton>
        </motion.div>
      </div>

      {/* Animated Full-Area TechText Showcase (Full hero area: letters can be dragged across the whole screen without clipping) */}
      <div className="absolute inset-0 z-20 pointer-events-none select-none">
        <motion.div
          style={{
            opacity: buttonOpacity,
            y: buttonY,
            scale: buttonScale,
            color: '#ffffff',
          }}
          className="w-full h-full pointer-events-auto text-white !text-white"
        >
          <TechText
            key={`${heroMultiLineText}-${isMobile ? 'm' : 'd'}`}
            text={heroMultiLineText}
            fontWeight={600}
            fontSize={isMobile ? (isTamil ? 17 : 20) : (isTamil ? 46 : 56)}
            lineHeight={isMobile ? 1.45 : 1.32}
            align={isMobile ? 'center' : 'right'}
            verticalAlign="bottom"
            marginBottom={isMobile ? 128 : 118}
            marginRight={isMobile ? 0 : 56}
            autoFit={true}
            reveal="area"
            dashLength={4}
            dashGap={2}
            specks={0}
            intro="type"
            introDuration={1.8}
            clickKick
            guides={false}
            fontFamily=""
            letterSpacing={isTamil ? 0.01 : -0.04}
            accentColor="#ffffff"
            reach={200}
            softness={0.85}
            lineStyle="solid"
            strokeWidth={1}
            speed={1}
            bounce={0.4}
            selection
            labels={false}
            color="#ffffff"
            draggable
            sweep={false}
          />
        </motion.div>
      </div>
    </div>
  );
}
