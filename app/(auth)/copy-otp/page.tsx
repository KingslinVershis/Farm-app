'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Copy, ShieldCheck, ArrowLeft } from 'lucide-react';
import { message } from 'antd';

function CopyOtpContent() {
  const searchParams = useSearchParams();
  const code = (searchParams.get('code') || '').replace(/\D/g, '').slice(0, 6);
  const [copied, setCopied] = useState(false);

  const performCopy = async (silent = false) => {
    if (!code) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const input = document.createElement('input');
        input.value = code;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      if (!silent) {
        message.success(`Code ${code} copied to clipboard!`);
      }
    } catch {
      if (!silent) {
        message.info('Click the Copy button below to copy the code.');
      }
    }
  };

  useEffect(() => {
    if (code) {
      performCopy(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="w-full max-w-md rounded-[28px] bg-white/95 dark:bg-[#080e14]/90 border border-slate-200/90 dark:border-white/10 shadow-2xl backdrop-blur-2xl p-6 sm:p-8 text-center">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-4 border border-emerald-500/30">
        <ShieldCheck size={14} />
        <span>Verification Code</span>
      </div>

      {code ? (
        <>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white m-0 mb-2">
            {copied ? 'Code Copied to Clipboard!' : 'Copy Verification Code'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-white/60 m-0 mb-5">
            {copied
              ? 'You can now paste this 6-digit code back into the verification screen.'
              : 'Click the button below to copy your 6-digit verification code.'}
          </p>

          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/15 mb-5 flex items-center justify-between gap-3">
            <span className="font-mono text-2xl sm:text-3xl font-black tracking-[0.28em] text-emerald-600 dark:text-emerald-400 select-all">
              {code}
            </span>
            <button
              type="button"
              onClick={() => performCopy(false)}
              style={{ color: '#ffffff' }}
              className="keep-white inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white font-black text-xs shadow-md cursor-pointer transition-all"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500 dark:text-white/60 mb-5">
          No verification code was provided in this link.
        </p>
      )}

      <Link
        href="/signin"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
      >
        <ArrowLeft size={14} />
        <span>Return to Sign In</span>
      </Link>
    </div>
  );
}

export default function CopyOtpPage() {
  return (
    <Suspense fallback={null}>
      <CopyOtpContent />
    </Suspense>
  );
}

