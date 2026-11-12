'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { message } from 'antd';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import CodeSlots, { type CodeSlotsStatus } from '@/components/auth/CodeSlots';

type RecoveryStep = 'email' | 'otp' | 'reset';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { locale } = useLanguage();
  const { theme } = useTheme();
  const isTamil = locale === 'ta';
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
      const err = isTamil
        ? 'சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்.'
        : 'Please enter a valid email address.';
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
        const err =
          data?.error ||
          (isTamil
            ? 'இந்த மின்னஞ்சல் முகவரியுடன் கணக்கு எதுவும் இல்லை.'
            : 'No account found with this email address.');
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
        ? isTamil
          ? 'சோதனை மின்னஞ்சல் உருவாக்கப்பட்டது! கீழே உள்ள இன்பாக்ஸ் இணைப்பில் குறியீட்டைப் பார்க்கவும்.'
          : 'Test email generated (configure SMTP_USER & SMTP_PASS in .env.local for Gmail delivery).'
        : isTamil
        ? '6 இலக்க சரிபார்ப்பு குறியீடு உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்டது (5 நிமிடங்கள் செல்லுபடியாகும்).'
        : '6-digit verification code sent to your email address (valid for 5 minutes).';
      setSuccessMsg(okMsg);
      message.success(okMsg);
    } catch {
      const err = isTamil ? 'சேவையக பிழை ஏற்பட்டது.' : 'Server error while verifying email.';
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
      const err = isTamil
        ? 'குறியீடு காலாவதியாகிவிட்டது (5 நிமிட வரம்பு). புதிய குறியீட்டைப் பெறவும்.'
        : 'Verification code expired (5-minute limit). Please request a new code.';
      setCodeStatus('error');
      setErrorMsg(err);
      message.error(err);
      return;
    }

    if (!/^\d{6}$/.test(submittedCode.trim())) {
      const err = isTamil
        ? 'சரியான 6 இலக்க குறியீட்டை உள்ளிடவும்.'
        : 'Please enter the valid 6-digit verification code.';
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
        const err =
          data?.error ||
          (isTamil ? 'தவறான 6 இலக்க குறியீடு.' : 'Invalid 6-digit verification code.');
        setCodeStatus('error');
        setErrorMsg(err);
        message.error(err);
        return;
      }

      setCodeStatus('success');
      const okMsg = isTamil
        ? 'குறியீடு சரிபார்க்கப்பட்டது! இப்போது புதிய கடவுச்சொல்லை உருவாக்கவும்.'
        : 'Code verified! Now create your new password.';
      message.success(okMsg);

      // Allow the CodeSlots checkmark wash animation to play before advancing to Screen 3
      setTimeout(() => {
        setErrorMsg(null);
        setSuccessMsg(okMsg);
        setStep('reset');
      }, 650);
    } catch {
      const err = isTamil ? 'சேவையக பிழை ஏற்பட்டது.' : 'Server error while verifying code.';
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
      const err = isTamil
        ? 'அமர்வு நேரம் முடிந்துவிட்டது (5 நிமிட வரம்பு). புதிய குறியீட்டைப் பெறவும்.'
        : 'Verification session expired (5-minute limit). Please request a new code.';
      setErrorMsg(err);
      message.error(err);
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      const err = isTamil
        ? 'புதிய கடவுச்சொல் குறைந்தபட்சம் 6 எழுத்துகள் இருக்க வேண்டும்.'
        : 'New password must be at least 6 characters long.';
      setErrorMsg(err);
      message.error(err);
      return;
    }

    if (newPassword !== confirmPassword) {
      const err = isTamil
        ? 'புதிய கடவுச்சொல்லும் உறுதிப்படுத்தும் கடவுச்சொல்லும் பொருந்தவில்லை.'
        : 'New password and confirm password do not match.';
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
        const err =
          data?.error ||
          (isTamil ? 'கடவுச்சொல் மாற்றம் தோல்வியடைந்தது.' : 'Failed to reset password.');
        setErrorMsg(err);
        message.error(err);
        return;
      }

      const okMsg = isTamil
        ? 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது! உள்நுழைவு பக்கத்திற்கு செல்கிறது...'
        : data.message || 'Password reset successfully! Redirecting to Sign In...';
      setSuccessMsg(okMsg);
      message.success(okMsg);

      setTimeout(() => {
        router.push('/signin');
      }, 1500);
    } catch {
      const err = isTamil ? 'சேவையக பிழை ஏற்பட்டது.' : 'Server error while resetting password.';
      setErrorMsg(err);
      message.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Contextual Header Badge, Title, and Subtitle per Screen
  const screenCopy = {
    email: {
      badge: isTamil ? 'கணக்கு மீட்பு • படி 1 / 3' : 'Account Recovery • Step 1 of 3',
      title: isTamil ? 'கடவுச்சொல் மறந்துவிட்டதா?' : 'Forgot Password?',
      subtitle: isTamil
        ? 'உங்கள் பதிவுசெய்த மின்னஞ்சல் முகவரியை உள்ளிடவும். சரிபார்த்த பின் 5 நிமிட செல்லுபடியாகும் 6 இலக்க குறியீடு உருவாக்கப்படும்.'
        : 'Enter your registered email address. We will validate your account and generate a 6-digit verification code valid for 5 minutes.',
    },
    otp: {
      badge: isTamil ? 'குறியீடு சரிபார்ப்பு • படி 2 / 3' : 'Verify Code • Step 2 of 3',
      title: isTamil ? '6 இலக்க குறியீட்டை உள்ளிடவும்' : 'Enter Verification Code',
      subtitle: isTamil
        ? 'உங்கள் கணக்கிற்காக உருவாக்கப்பட்ட 6 இலக்க சரிபார்ப்பு குறியீட்டை 5 நிமிடங்களுக்குள் உள்ளிடவும்.'
        : 'Enter the 6-digit verification code generated for your account within 5 minutes to unlock password reset.',
    },
    reset: {
      badge: isTamil ? 'புதிய கடவுச்சொல் • படி 3 / 3' : 'New Password • Step 3 of 3',
      title: isTamil ? 'புதிய கடவுச்சொல் உருவாக்கவும்' : 'Create New Password',
      subtitle: isTamil
        ? 'உங்கள் கணக்கைப் புதுப்பிக்க குறைந்தது 6 எழுத்துகள் கொண்ட வலுவான புதிய கடவுச்சொல்லை அமைத்து உறுதிப்படுத்தவும்.'
        : 'Set a strong new password (minimum 6 characters) and confirm it below to update your account.',
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
          <span>{isTamil ? 'உள்நுழைவுக்குத் திரும்பு' : 'Back to Sign In'}</span>
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
                {isTamil ? 'பதிவுசெய்த மின்னஞ்சல் முகவரி' : 'Registered Email Address'} *
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="forgot-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isTamil ? 'எ.கா. farmer@example.com' : 'e.g. farmer@example.com'}
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
              {loading
                ? isTamil
                  ? 'சரிபார்க்கிறது...'
                  : 'Verifying Email...'
                : isTamil
                ? 'மின்னஞ்சலை சரிபார்த்து 6-இலக்க குறியீட்டைப் பெறு'
                : 'Verify Email & Get 6-Digit Code'}
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
                  {isTamil ? 'சரிபார்க்கப்பட்ட மின்னஞ்சல்' : 'Verified Email'}
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
                  <span>{secondsLeft > 0 ? formatTimer(secondsLeft) : isTamil ? 'காலாவதியானது' : 'Expired'}</span>
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
                  {isTamil ? 'மாற்று' : 'Change'}
                </button>
              </div>
            </div>

            {/* 6-Digit Code Input (Animated CodeSlots) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80">
                  {isTamil ? '6 இலக்க சரிபார்ப்பு குறியீடு' : '6-Digit Verification Code'} *
                </span>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleRequestCode()}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} />
                  <span>{isTamil ? 'மீண்டும் அனுப்பு' : 'Resend Code'}</span>
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
                  ariaLabel={isTamil ? '6 இலக்க சரிபார்ப்பு குறியீடு' : '6-digit verification code'}
                />
              </div>
              <p className="text-[11px] text-center text-slate-500 dark:text-white/55 mt-2 mb-0 font-medium">
                {isTamil
                  ? '5 நிமிடங்களுக்குள் 6 இலக்க குறியீட்டை உள்ளிட்டு சரிபார்க்கவும்.'
                  : 'Enter all 6 digits above — valid for 5 minutes from generation.'}
                {emailPreviewUrl && (
                  <>
                    {' '}
                    <a
                      href={emailPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 font-bold underline"
                    >
                      {isTamil ? 'சோதனை மின்னஞ்சலைத் திற →' : 'Open Test Email Inbox →'}
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
              {loading
                ? isTamil
                  ? 'குறியீட்டை சரிபார்க்கிறது...'
                  : 'Verifying Code...'
                : isTamil
                ? 'குறியீட்டைச் சரிபார்'
                : 'Verify 6-Digit Code'}
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
                {isTamil ? 'புதிய கடவுச்சொல்' : 'Create New Password'} *
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  id="reset-new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={isTamil ? 'குறைந்தது 6 எழுத்துகள்' : 'Min 6 characters'}
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
                {isTamil ? 'புதிய கடவுச்சொல்லை உறுதிப்படுத்து' : 'Confirm New Password'} *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  id="reset-confirm-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={isTamil ? 'கடவுச்சொல்லை மீண்டும் உள்ளிடவும்' : 'Repeat new password'}
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
              {loading
                ? isTamil
                  ? 'கடவுச்சொல் மாற்றப்படுகிறது...'
                  : 'Resetting Password...'
                : isTamil
                ? 'கடவுச்சொல்லை மாற்று'
                : 'Reset Password'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
