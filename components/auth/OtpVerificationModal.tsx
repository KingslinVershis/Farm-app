'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { Clock, RefreshCw, ShieldCheck, AlertCircle } from '@/components/icons/FlaticonIcons';
import CodeSlots, { type CodeSlotsStatus } from '@/components/auth/CodeSlots';
import { useTheme } from '@/components/providers/ThemeProvider';

export interface OtpVerificationModalProps {
  open: boolean;
  email: string;
  title: string;
  subtitle: string;
  confirmLabel: string;
  loading: boolean;
  resending?: boolean;
  errorMsg?: string | null;
  secondsLeft: number;
  status: CodeSlotsStatus;
  onStatusChange: (nextStatus: CodeSlotsStatus) => void;
  onVerify: (code: string) => void | Promise<void>;
  onResend: () => void | Promise<void>;
  onCancel: () => void;
  isTamil?: boolean;
  previewUrl?: string | null;
}

export function OtpVerificationModal({
  open,
  email,
  title,
  subtitle,
  confirmLabel,
  loading,
  resending = false,
  errorMsg,
  secondsLeft,
  status,
  onStatusChange,
  onVerify,
  onResend,
  onCancel,
  isTamil = false,
  previewUrl,
}: OtpVerificationModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [code, setCode] = useState('');

  // Reset code whenever modal freshly opens
  useEffect(() => {
    if (open) {
      setCode('');
      onStatusChange('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        if (!loading && !resending) onCancel();
      }}
      footer={null}
      centered
      destroyOnClose
      width={460}
      title={
        <div className="flex items-center gap-2 text-emerald-500 font-black text-base">
          <ShieldCheck size={20} />
          <span>{title}</span>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 m-0 leading-relaxed">
          {subtitle}
        </p>

        {/* Recipient & Countdown Summary */}
        <div className="px-3.5 py-2.5 rounded-xl bg-slate-100/90 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
              {isTamil ? 'மின்னஞ்சல்' : 'Verification Sent To'}
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
              {email}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-black text-xs border ${
              secondsLeft > 60
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : secondsLeft > 0
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
            }`}
          >
            <Clock size={13} />
            <span>
              {secondsLeft > 0 ? formatTimer(secondsLeft) : isTamil ? 'காலாவதியானது' : 'Expired'}
            </span>
          </span>
        </div>

        {/* Error Alert inside Modal */}
        {errorMsg && (
          <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="min-w-0 break-words leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* 6-Digit Animated CodeSlots */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80">
              {isTamil ? '6 இலக்க குறியீடு' : '6-Digit Verification Code'} *
            </span>
            <button
              type="button"
              disabled={loading || resending}
              onClick={() => {
                setCode('');
                onStatusChange('idle');
                onResend();
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
              <span>
                {resending
                  ? isTamil
                    ? 'அனுப்புகிறது...'
                    : 'Resending...'
                  : isTamil
                  ? 'மீண்டும் அனுப்பு'
                  : 'Resend Code'}
              </span>
            </button>
          </div>

          <div className="flex justify-center py-2">
            <CodeSlots
              length={6}
              value={code}
              status={status}
              onChange={(val) => {
                setCode(val);
                onStatusChange('idle');
              }}
              onComplete={(val) => {
                setCode(val);
                onVerify(val);
              }}
              accentColor={isDark ? '#f5f5f5' : '#10b981'}
              inkColor={isDark ? '#f5f5f5' : '#0f172a'}
              slotColor={isDark ? '#27272a' : '#e2e8f0'}
              digitColor={isDark ? '#18181b' : '#ffffff'}
              dangerColor="#ff3b30"
              slotSize={44}
              gap={8}
              radius={12}
              bounce={0.2}
              settle={0.3}
              rise={8}
              cascade={20}
              mask={false}
              caret
              autoFocus
              disabled={loading || resending}
              ariaLabel={isTamil ? '6 இலக்க சரிபார்ப்பு குறியீடு' : '6-digit verification code'}
            />
          </div>

          {previewUrl && (
            <p className="text-[11px] text-center text-slate-500 dark:text-white/55 mt-1.5 mb-0">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 font-bold underline"
              >
                {isTamil ? 'சோதனை மின்னஞ்சலைத் திற →' : 'Open Test Email Inbox →'}
              </a>
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            disabled={loading || resending}
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm hover:bg-slate-200/70 dark:hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
          >
            {isTamil ? 'ரத்து' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={loading || resending || secondsLeft <= 0 || code.length !== 6}
            onClick={() => onVerify(code)}
            style={{ color: '#ffffff' }}
            className="keep-white flex-[1.5] h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? isTamil
                ? 'சரிபார்க்கிறது...'
                : 'Verifying...'
              : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

