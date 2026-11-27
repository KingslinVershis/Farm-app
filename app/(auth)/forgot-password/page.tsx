'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from '@/components/icons/FlaticonIcons';
import { message } from 'antd';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import CodeSlots, { type CodeSlotsStatus } from '@/components/auth/CodeSlots';

type RecoveryStep = 'email' | 'otp' | 'reset';

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, messages } = useLanguage();
  const { theme } = useTheme();
  const fp = messages.auth.forgotPasswordPage;
  const isDark = theme === 'dark';

  // 3-screen recovery flow:
  // 1) 'email' -> Validate email against DB & generate 6-digit code (5-min expiry)
  // 2) 'otp'   -> Enter & verify 6-digit code with CodeSlots
  // 3) 'reset' -> Create New Password & Confirm Password
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeStatus, setCodeStatus] = useState<CodeSlotsStatus>('idle');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // Auto-populate from URL query params (e.g. from verification email)
  useEffect(() => {
    const paramEmail = searchParams.get('email')?.trim();
    const paramCode = searchParams.get('code')?.replace(/\D/g, '').slice(0, 6);
    if (paramEmail) {
      setEmail(paramEmail);
    }
    if (paramCode && paramCode.length === 6) {
      setCode(paramCode);
      setStep('otp');
      setSecondsLeft((prev) => (prev > 0 ? prev : 300));
    }
  }, [searchParams]);

  // Live 5-minute countdown timer active during OTP & Reset screens
  useEffect(() => {
    if (step === 'email' || secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, secondsLeft]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Screen 1 Handler: Validate email against DB & generate 6-digit code
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const err = fp.errors.validEmail;
      setErrorMsg(err);
      message.error(err);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        const err = data?.error || fp.errors.noAccount;
        setErrorMsg(err);
        message.error(err);
        return;
      }

      setEmailPreviewUrl(data.previewUrl || null);
      setSecondsLeft(data.expiresInSeconds || 300);
      setCode('');
      setCodeStatus('idle');
      setStep('otp');
      const okMsg = data.previewUrl
        ? fp.success.testEmailGenerated
        : fp.success.codeSent;
      setSuccessMsg(okMsg);
      message.success(okMsg);
    } catch {
      const err = fp.errors.serverError;
      setErrorMsg(err);
      message.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Screen 2 Handler: Verify 6-digit code before proceeding to New Password screen
  const verifyOtpCode = async (submittedCode: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (secondsLeft <= 0) {
      const err = fp.errors.expiredCode;
      setCodeStatus('error');
      setErrorMsg(err);
      message.error(err);
      return;
    }

    if (!/^\d{6}$/.test(submittedCode.trim())) {
      const err = fp.errors.valid6Digit;
      setCodeStatus('error');
      setErrorMsg(err);
      message.error(err);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/forgot-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: submittedCode.trim(),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        const err = data?.error || fp.errors.invalidCode;
        setCodeStatus('error');
        setErrorMsg(err);
        message.error(err);
        return;
      }

      setCodeStatus('success');
      const okMsg = fp.success.codeVerified;
      message.success(okMsg);

      // Allow the CodeSlots checkmark wash animation to play before advancing to Screen 3
      setTimeout(() => {
        setErrorMsg(null);
        setSuccessMsg(okMsg);
        setStep('reset');
      }, 650);
    } catch {
      const err = fp.errors.serverErrorCode;
      setCodeStatus('error');
      setErrorMsg(err);
      message.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyOtpCode(code);
  };

  // Screen 3 Handler: Save New Password & Confirm Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (secondsLeft <= 0) {
      const err = fp.errors.sessionExpired;
      setErrorMsg(err);
      message.error(err);
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      const err = fp.errors.minChars;
      setErrorMsg(err);
      message.error(err);
      return;
    }

    if (newPassword !== confirmPassword) {
      const err = fp.errors.mismatch;
      setErrorMsg(err);
      message.error(err);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        const err = data?.error || fp.errors.failedReset;
        setErrorMsg(err);
        message.error(err);
        return;
      }

      const okMsg = data.message || fp.success.resetSuccess;
      setSuccessMsg(okMsg);
      message.success(okMsg);

      setTimeout(() => {
        router.push('/signin');
      }, 1500);
    } catch {
      const err = fp.errors.serverErrorReset;
      setErrorMsg(err);
      message.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Contextual Header Badge, Title, and Subtitle per Screen
  const screenCopy = {
    email: {
      badge: fp.step1Badge,
      title: fp.step1Title,
      subtitle: fp.step1Subtitle,
    },
    otp: {
      badge: fp.step2Badge,
      title: fp.step2Title,
      subtitle: fp.step2Subtitle,
    },
    reset: {
      badge: fp.step3Badge,
      title: fp.step3Title,
      subtitle: fp.step3Subtitle,
    },
  }[step];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-lg rounded-[28px] sm:rounded-[32px] bg-white/95 dark:bg-[#080e14]/90 border border-slate-200/90 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl overflow-hidden p-6 sm:p-8 transition-colors"
    >
      {/* Back to Sign In Link */}
      <div className="mb-5">
        <Link
          href="/signin"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors group"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>{fp.backToSignIn}</span>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-3 border border-emerald-500/30">
          {step === 'otp' ? <ShieldCheck size={14} /> : <KeyRound size={14} />}
          <span>{screenCopy.badge}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight m-0">
          {screenCopy.title}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-white/60 mt-1.5 font-medium m-0">
          {screenCopy.subtitle}
        </p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-300 flex items-start gap-2 overflow-hidden">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span className="min-w-0 break-words leading-relaxed">{errorMsg}</span>
        </div>
      )}

      {/* Success Alert */}
      {successMsg && (
        <div className="mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* SCREEN 1: Email Verification */}
        {step === 'email' && (
          <motion.form
            key="step-email"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleRequestCode}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80 mb-1.5"
              >
                {fp.emailLabel} *
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="forgot-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={fp.emailPlaceholder}
                  className="w-full h-11 sm:h-12 rounded-xl bg-slate-50/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 pl-10 pr-4 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-300/60 pointer-events-none">
                  <Mail size={17} />
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ color: '#ffffff' }}
              className="keep-white w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? fp.verifyingEmail : fp.verifyEmailBtn}
            </button>
          </motion.form>
        )}

        {/* SCREEN 2: 6-Digit OTP Verification Code */}
        {step === 'otp' && (
          <motion.form
            key="step-otp"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleOtpSubmit}
            className="space-y-5"
          >
            {/* Verified Email Summary & 5-Min Countdown */}
            <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
                  {fp.verifiedEmail}
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
                  {email.trim().toLowerCase()}
                </span>
              </div>

              <div className="flex items-center gap-2">
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
                  <span>{secondsLeft > 0 ? formatTimer(secondsLeft) : fp.expired}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setEmailPreviewUrl(null);
                    setCode('');
                    setCodeStatus('idle');
                  }}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {fp.change}
                </button>
              </div>
            </div>

            {/* 6-Digit Code Input (Animated CodeSlots) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80">
                  {fp.codeLabel} *
                </span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleRequestCode()}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} />
                  <span>{fp.resendCode}</span>
                </button>
              </div>
              <div className="flex justify-center py-2">
                <CodeSlots
                  length={6}
                  value={code}
                  status={codeStatus}
                  onChange={(val) => {
                    setCode(val);
                    setCodeStatus('idle');
                  }}
                  onComplete={(val) => {
                    setCode(val);
                    verifyOtpCode(val);
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
                  disabled={loading}
                  ariaLabel={fp.codeAriaLabel}
                />
              </div>
              <p className="text-[11px] text-center text-slate-500 dark:text-white/55 mt-2 mb-0 font-medium">
                {fp.enterDigitsNotice}
                {emailPreviewUrl && (
                  <>
                    {' '}
                    <a
                      href={emailPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 font-bold underline"
                    >
                      {fp.openTestInbox}
                    </a>
                  </>
                )}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || secondsLeft <= 0 || code.length !== 6}
              style={{ color: '#ffffff' }}
              className="keep-white w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? fp.verifyingCode : fp.verifyCodeBtn}
            </button>
          </motion.form>
        )}

        {/* SCREEN 3: Create New Password & Confirm Password */}
        {step === 'reset' && (
          <motion.form
            key="step-reset"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleResetPassword}
            className="space-y-4"
          >
            {/* Create New Password */}
            <div>
              <label
                htmlFor="reset-new-password"
                className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80 mb-1.5"
              >
                {fp.newPasswordLabel} *
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  id="reset-new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={fp.newPasswordPlaceholder}
                  className="w-full h-11 sm:h-12 rounded-xl bg-slate-50/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-300/60 pointer-events-none">
                  <Lock size={17} />
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewPass((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-emerald-300/60 dark:hover:text-white cursor-pointer transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showNewPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label
                htmlFor="reset-confirm-password"
                className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80 mb-1.5"
              >
                {fp.confirmPasswordLabel} *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  id="reset-confirm-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={fp.confirmPasswordPlaceholder}
                  className="w-full h-11 sm:h-12 rounded-xl bg-slate-50/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-300/60 pointer-events-none">
                  <Lock size={17} />
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfirmPass((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-emerald-300/60 dark:hover:text-white cursor-pointer transition-colors"
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || secondsLeft <= 0}
              style={{ color: '#ffffff' }}
              className="keep-white w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? fp.resettingPassword : fp.resetPasswordBtn}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
