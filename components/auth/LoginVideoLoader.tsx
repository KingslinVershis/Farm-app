'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface LoginVideoLoaderProps {
  open: boolean;
  locale?: string;
}

export function LoginVideoLoader({ open }: LoginVideoLoaderProps) {
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('farm-login-loader-state', { detail: { active: open } })
      );
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('farm-login-loader-state', { detail: { active: false } })
        );
      }
    };
  }, [open]);

  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback
      });
    }
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="login-video-loader-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[999999] w-screen h-screen overflow-hidden bg-black select-none pointer-events-auto flex items-center justify-center"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            backgroundColor: '#000000',
          }}
        >
          {/* Full Screen Black Background with Responsive Centered Video */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="w-full h-full object-contain max-w-4xl max-h-[85vh] sm:max-h-[90vh]"
              style={{
                backgroundColor: '#000000',
              }}
            >
              <source src="https://res.cloudinary.com/chk0va7a/video/upload/v1795760588/man_farm.mp4" type="video/mp4" />
            </video>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
