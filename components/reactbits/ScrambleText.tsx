'use client';

import React, { useEffect, useRef } from 'react';
import { stagger } from 'motion';

export interface ScrambleTextProps {
  text: string;
  className?: string;
  scrambleChars?: string;
  staggerDelay?: number;
  resolveDuration?: number;
  speed?: number; // ms interval between random glyph flips
}

const DEFAULT_SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#_~';

/**
 * Splits text safely using Unicode Grapheme Segmenter so Tamil and complex scripts
 * are treated as complete character clusters rather than broken combining marks.
 */
const getGraphemes = (str: string): string[] => {
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(str), (s: any) => s.segment);
  }
  return Array.from(str);
};

/**
 * High-performance Scramble Text effect using Motion's stagger from center.
 * Characters scramble through dynamic glyphs, then resolve outward from the center.
 */
export const ScrambleText: React.FC<ScrambleTextProps> = ({
  text,
  className = '',
  scrambleChars = DEFAULT_SCRAMBLE_CHARS,
  staggerDelay = 0.05,
  resolveDuration = 0.42,
  speed = 42,
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<string>(text);
  const isScramblingRef = useRef<boolean>(false);
  const animFrameRef = useRef<number | null>(null);

  // Sync textRef with incoming text
  useEffect(() => {
    textRef.current = text;
    if (containerRef.current && !isScramblingRef.current) {
      containerRef.current.textContent = text;
    }
  }, [text]);

  const startScramble = () => {
    if (!containerRef.current) return;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    isScramblingRef.current = true;
    const currentTarget = textRef.current;
    const graphemes = getGraphemes(currentTarget);
    const len = graphemes.length;
    if (len === 0) return;

    // Motion stagger from center
    const staggerFn = stagger(staggerDelay, { from: 'center' });
    const delays = graphemes.map((_, i) => staggerFn(i, len));
    const maxDelay = Math.max(...delays, 0);
    const totalDuration = maxDelay + resolveDuration;

    const startTime = performance.now();
    let lastGlyphShuffle = startTime;
    let currentRandoms: string[] = graphemes.map((g) => {
      if (g.trim() === '') return g;
      return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
    });

    const frame = (now: number) => {
      const elapsed = (now - startTime) / 1000;

      // Periodically shuffle the randomized glyphs
      if (now - lastGlyphShuffle >= speed) {
        lastGlyphShuffle = now;
        currentRandoms = graphemes.map((g) => {
          if (g.trim() === '') return g;
          return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        });
      }

      let allResolved = true;
      const resultChars: string[] = [];

      for (let i = 0; i < len; i++) {
        const char = graphemes[i];
        if (char.trim() === '') {
          resultChars.push(char);
          continue;
        }

        const resolveTime = delays[i] + resolveDuration;
        if (elapsed >= resolveTime) {
          resultChars.push(char);
        } else {
          allResolved = false;
          resultChars.push(currentRandoms[i]);
        }
      }

      if (containerRef.current) {
        containerRef.current.textContent = resultChars.join('');
      }

      if (elapsed < totalDuration && !allResolved) {
        animFrameRef.current = requestAnimationFrame(frame);
      } else {
        if (containerRef.current) {
          containerRef.current.textContent = currentTarget;
        }
        isScramblingRef.current = false;
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(frame);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Attach to closest nav item (button, link, or .group)
    const hoverTarget = el.closest('button, a, .group') || el;

    const onEnter = () => {
      startScramble();
    };

    hoverTarget.addEventListener('mouseenter', onEnter);

    return () => {
      hoverTarget.removeEventListener('mouseenter', onEnter);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [text, scrambleChars, staggerDelay, resolveDuration, speed]);

  return (
    <span
      ref={containerRef}
      className={`inline-block select-none will-change-contents ${className}`}
      aria-label={text}
    >
      {text}
    </span>
  );
};

export default ScrambleText;
