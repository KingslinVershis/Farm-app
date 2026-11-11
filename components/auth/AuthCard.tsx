'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { message } from 'antd';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { OtpVerificationModal } from '@/components/auth/OtpVerificationModal';
import type { CodeSlotsStatus } from '@/components/auth/CodeSlots';

const CAROUSEL_SLIDES = [
  {
    titleEn: 'Capturing Moments, Cultivating Harvests',
    titleTa: 'துல்லிய விவசாயம், வளமான அறுவடை',
    descEn: 'Empowering farmers with real-time hydrology telemetry, certified seed databases, and 5-phase agronomy audit.',
    descTa: '5-நிலை சாகுபடி மேலாண்மை, நேரடி அணை நீர்மட்ட அளவீடு மற்றும் வேளாண் நுண்ணறிவு தளம்.',
  },
  {
    titleEn: 'Real-Time Dam Hydrology & Water Telemetry',
    titleTa: 'நிகழ்நேர அணை நீர்மட்ட தரவுகள்',
    descEn: 'Live monitoring of Mettur, Bhavanisagar, and Vaigai reservoir capacities, storage volumes, and outflow rates.',
    descTa: 'மேட்டூர், பவானிசாகர், வைகை அணைகளின் நீர் இருப்பு, வரத்து மற்றும் வெளியேற்ற விவரங்களை நேரடியாக கண்காணிக்கலாம்.',
  },
  {
    titleEn: 'Certified Seeds & 5-Phase Agronomy Planning',
    titleTa: 'சான்றளிக்கப்பட்ட விதைகள் & 5-நிலை சாகுபடி',
    descEn: 'Official TNAU verified seed price directory and scientific cultivation budgeting from land prep to harvest.',
    descTa: 'TNAU சான்றளிக்கப்பட்ட விதை விலைகள் மற்றும் விதைப்பு முதல் அறுவடை வரையிலான முழுமையான செலவு திட்டமிடல்.',
  },
];

const formVariants: Variants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 40 : -40,
    scale: 0.98,
    filter: 'blur(4px)',
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.35,
      ease: 'easeOut',
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -40 : 40,
    scale: 0.98,
    filter: 'blur(4px)',
    transition: {
      duration: 0.22,
      ease: 'easeIn',
    },
  }),
};

interface AuthCardProps {
  initialMode: 'signin' | 'signup';
}

export function AuthCard({ initialMode }: AuthCardProps) {
  const router = useRouter();
  const { messages, locale } = useLanguage();
  const t = (messages as any).auth || {};

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [direction, setDirection] = useState<number>(1);
  const [activeSlide, setActiveSlide] = useState(0);

  // Sign In states
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInShowPassword, setSignInShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState('');

  // Sign Up states
  const [fullName, setFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signUpShowPassword, setSignUpShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState('');
  const [signUpSuccessMsg, setSignUpSuccessMsg] = useState('');

  // Sign Up OTP Modal states
  const [signUpOtpOpen, setSignUpOtpOpen] = useState(false);
  const [signUpOtpSeconds, setSignUpOtpSeconds] = useState(0);
  const [signUpOtpStatus, setSignUpOtpStatus] = useState<CodeSlotsStatus>('idle');
  const [signUpOtpLoading, setSignUpOtpLoading] = useState(false);
  const [signUpOtpResending, setSignUpOtpResending] = useState(false);
  const [signUpOtpError, setSignUpOtpError] = useState<string | null>(null);
  const [signUpOtpPreviewUrl, setSignUpOtpPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!signUpOtpOpen || signUpOtpSeconds <= 0) return;
    const timer = setInterval(() => {
      setSignUpOtpSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [signUpOtpOpen, signUpOtpSeconds]);

  // Carousel auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Sync mode with browser back/forward history
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.includes('signup')) {
        setDirection(1);
        setMode('signup');
      } else {
        setDirection(-1);
        setMode('signin');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const switchMode = (targetMode: 'signin' | 'signup') => {
    if (mode === targetMode) return;
    setDirection(targetMode === 'signup' ? 1 : -1);
    setMode(targetMode);
    setSignInError('');
    setSignUpError('');
    setSignUpSuccessMsg('');
    const targetUrl = targetMode === 'signup' ? '/signup' : '/signin';
    window.history.pushState({ mode: targetMode }, '', targetUrl);
  };

  // Sign In submit handler
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!signInEmail.trim()) {
      setSignInError(
        locale === 'ta'
          ? 'மின்னஞ்சல் அல்லது கைபேசி எண்ணை உள்ளிடவும்'
          : 'Please enter your email or mobile number'
      );
      return;
    }
    if (!signInPassword) {
      setSignInError(
        locale === 'ta'
          ? 'கடவுச்சொல்லை உள்ளிடவும்'
          : 'Please enter your password'
      );
      return;
    }

    try {
      setSignInLoading(true);
      setSignInError('');
      const res = await fetch('/api/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          useremail: signInEmail.trim(),
          userpassword: signInPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setSignInError(
          data?.message ||
            (locale === 'ta'
              ? 'உள்நுழைவு தோல்வியடைந்தது'
              : 'Invalid email or password')
        );
        setSignInLoading(false);
        return;
      }

      if (data?.token && typeof window !== 'undefined') {
        document.cookie = `farmhub_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `agripulse_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
        if (data?.user) {
          localStorage.setItem('farmhub_user', JSON.stringify(data.user));
          localStorage.setItem('agripulse_user', JSON.stringify(data.user));
        }
      }

      setSignInLoading(false);
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect') || '/';
      window.location.href = redirectUrl;
    } catch (err: any) {
      setSignInLoading(false);
      setSignInError(
        locale === 'ta'
          ? 'சேவையக பிழை ஏற்பட்டது'
          : 'Server authentication error'
      );
      console.error('Auth signin error:', err);
    }
  };

  // Sign Up submit handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setSignUpError(
        locale === 'ta'
          ? 'முழு பெயரை உள்ளிடவும்'
          : 'Please enter your full name'
      );
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!signUpEmail.trim() || !emailRegex.test(signUpEmail.trim())) {
      setSignUpError(
        locale === 'ta'
          ? 'செல்லுபடியாகும் மின்னஞ்சல் முகவரியை உள்ளிடவும்'
          : 'Please enter a valid email address'
      );
      return;
    }
    if (!signUpPassword || signUpPassword.length < 6) {
      setSignUpError(
        locale === 'ta'
          ? 'கடவுச்சொல் குறைந்தபட்சம் 6 எழுத்துகள் இருக்க வேண்டும்'
          : 'Password must be at least 6 characters'
      );
      return;
    }
    if (signUpPassword !== confirmPassword) {
      setSignUpError(
        locale === 'ta'
          ? 'கடவுச்சொற்கள் பொருந்தவில்லை'
          : 'Passwords do not match'
      );
      return;
    }
    if (!agreeTerms) {
      setSignUpError(
        locale === 'ta'
          ? 'விதிமுறைகளை ஏற்கவும்'
          : 'Please agree to terms and privacy policy'
      );
      return;
    }

    setSignUpLoading(true);
    setSignUpError('');
    try {
      const newUser = {
        username: fullName.trim(),
        email: signUpEmail.trim().toLowerCase(),
        password: signUpPassword,
      };
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSignUpError(
          data?.error ||
            (locale === 'ta'
              ? 'பதிவு செய்வதில் பிழை ஏற்பட்டது'
              : 'Failed to create account')
        );
        setSignUpLoading(false);
        return;
      }

      setSignUpLoading(false);

      if (data?.otpRequired) {
        setSignUpOtpError(null);
        setSignUpOtpStatus('idle');
        setSignUpOtpSeconds(data.expiresInSeconds || 300);
        setSignUpOtpPreviewUrl(data.previewUrl || null);
        setSignUpOtpOpen(true);
        message.success(
          locale === 'ta'
            ? '6 இலக்க சரிபார்ப்பு குறியீடு உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்டது!'
            : '6-digit verification code sent to your email!'
        );
        return;
      }

      // Fallback direct creation
      setSignInEmail(signUpEmail.trim().toLowerCase());
      setSignUpSuccessMsg(
        locale === 'ta'
          ? 'கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது! இப்போது உள்நுழையவும்.'
          : 'Account created successfully! Please sign in.'
      );
      switchMode('signin');
    } catch (err: any) {
      console.error('ERROR', err);
      setSignUpLoading(false);
      setSignUpError(
        locale === 'ta'
          ? 'சேவையக பிழை ஏற்பட்டது'
          : 'Server error during sign up'
      );
    }
  };

  const handleResendSignUpOtp = async () => {
    setSignUpOtpResending(true);
    setSignUpOtpError(null);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: fullName.trim(),
          email: signUpEmail.trim().toLowerCase(),
          password: signUpPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setSignUpOtpError(data?.error || 'Failed to resend verification code.');
        return;
      }
      setSignUpOtpSeconds(data.expiresInSeconds || 300);
      setSignUpOtpPreviewUrl(data.previewUrl || null);
      message.success(
        locale === 'ta'
          ? 'புதிய 6 இலக்க குறியீடு அனுப்பப்பட்டது!'
          : 'A new 6-digit verification code was sent!'
      );
    } catch {
      setSignUpOtpError('Server error while resending code.');
    } finally {
      setSignUpOtpResending(false);
    }
  };

  const handleVerifySignUpOtp = async (otpCode: string) => {
    setSignUpOtpError(null);
    setSignUpOtpLoading(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: fullName.trim(),
          email: signUpEmail.trim().toLowerCase(),
          password: signUpPassword,
          otp: otpCode.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setSignUpOtpStatus('error');
        setSignUpOtpError(
          data?.error ||
            (locale === 'ta' ? 'தவறான சரிபார்ப்பு குறியீடு.' : 'Invalid verification code.')
        );
        return;
      }

      setSignUpOtpStatus('success');
      message.success(
        locale === 'ta'
          ? 'மின்னஞ்சல் சரிபார்க்கப்பட்டது! கணக்கு உருவாக்கப்பட்டது.'
          : 'Email verified & account created successfully!'
      );

      setTimeout(() => {
        setSignUpOtpOpen(false);
        setSignInEmail(signUpEmail.trim().toLowerCase());
        setSignUpSuccessMsg(
          locale === 'ta'
            ? 'கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது! இப்போது உள்நுழையவும்.'
            : 'Account verified & created successfully! Please sign in.'
        );
        switchMode('signin');
      }, 650);
    } catch {
      setSignUpOtpStatus('error');
      setSignUpOtpError('Server error while verifying OTP.');
    } finally {
      setSignUpOtpLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-4xl xl:max-w-5xl rounded-[28px] sm:rounded-[32px] bg-white/95 dark:bg-[#080e14]/90 border border-slate-200/90 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl overflow-hidden p-3 sm:p-4 lg:p-5 transition-colors"
    >
      <motion.div
        layout
        className="flex flex-col lg:flex-row gap-4 lg:gap-8 items-stretch"
      >
        {/* Media Showcase Card (Left in Sign In, Right in Sign Up) */}
        <motion.div
          layout="position"
          transition={{
            layout: { duration: 0.5, ease: 'easeInOut' },
          }}
          className={`w-full lg:w-1/2 relative rounded-2xl sm:rounded-[24px] overflow-hidden min-h-[340px] sm:min-h-[440px] lg:min-h-[540px] flex flex-col justify-end p-6 sm:p-8 bg-slate-950 text-white shadow-inner ${
            mode === 'signup' ? 'lg:order-2' : 'lg:order-1'
          }`}
        >
          {/* Background Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover scale-105"
          >
            <source src="/videos/login.mp4" type="video/mp4" />
          </video>

          {/* Gradients for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 pointer-events-none" />
          <div className="absolute inset-0 bg-emerald-950/20 mix-blend-overlay pointer-events-none" />

          {/* Bottom Content of Left Card: Interactive Animated Carousel */}
          <div className="relative z-10 space-y-3">
            <div className="min-h-[115px] sm:min-h-[125px] flex flex-col justify-end overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <h3
                    className="keep-white text-xl sm:text-2xl lg:text-3xl font-black leading-tight font-display tracking-tight"
                    style={{ color: '#ffffff' }}
                  >
                    {locale === 'ta'
                      ? CAROUSEL_SLIDES[activeSlide].titleTa
                      : CAROUSEL_SLIDES[activeSlide].titleEn}
                  </h3>

                  <p className="text-xs sm:text-sm text-white/75 font-medium leading-relaxed mt-2 line-clamp-3">
                    {locale === 'ta'
                      ? CAROUSEL_SLIDES[activeSlide].descTa
                      : CAROUSEL_SLIDES[activeSlide].descEn}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Slider / Pagination interactive dashes */}
            <div className="flex items-center gap-2 pt-2">
              {CAROUSEL_SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    activeSlide === idx
                      ? 'w-8 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]'
                      : 'w-3.5 bg-white/35 hover:bg-white/60'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Form Container (Right in Sign In, Left in Sign Up) */}
        <motion.div
          layout="position"
          transition={{
            layout: { duration: 0.5, ease: 'easeInOut' },
          }}
          className={`w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-5 sm:py-8 overflow-hidden ${
            mode === 'signup' ? 'lg:order-1' : 'lg:order-2'
          }`}
        >
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            {mode === 'signin' ? (
              <motion.div
                key="signin-panel"
                custom={direction}
                variants={formVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full"
              >
                {/* Header */}
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                    {t.signInTitle || 'Welcome Back'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-white/60 mt-1.5 font-medium flex items-center gap-1.5 flex-wrap">
                    <span>{t.noAccount || "Don't have an account?"}</span>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => switchMode('signup')}
                      className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1 group cursor-pointer"
                    >
                      <span className="group-hover:underline">
                        {t.signUpLink || 'Create an Account'}
                      </span>
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </motion.button>
                  </p>
                </div>

                {/* Success Alert (e.g. from signup) */}
                {signUpSuccessMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
                  >
                    <span>✓</span>
                    <span>{signUpSuccessMsg}</span>
                  </motion.div>
                )}

                {/* Error Alert */}
                {signInError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-300 flex items-center gap-2"
                  >
                    <span>⚠️</span>
                    <span>{signInError}</span>
                  </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSignIn} className="space-y-4">
                  {/* Email / Mobile */}
                  <div>
                    <label
                      htmlFor="signin-useremail"
                      className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80 mb-1.5"
                    >
                      {t.emailOrPhone || 'Email or Mobile Number'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="signin-useremail"
                        name="useremail"
                        autoComplete="username"
                        required
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        placeholder={
                          t.emailOrPhonePlaceholder ||
                          'e.g. swaminathan@farmhub.in or 9876543210'
                        }
                        className="w-full h-11 sm:h-12 rounded-xl bg-slate-50/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 pl-10 pr-4 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-300/60 pointer-events-none">
                        <Mail size={17} />
                      </span>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="signin-userpassword"
                        className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80"
                      >
                        {t.password || 'Password'}
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline"
                      >
                        {t.forgotPassword || 'Forgot password?'}
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        type={signInShowPassword ? 'text' : 'password'}
                        id="signin-userpassword"
                        name="userpassword"
                        autoComplete="current-password"
                        required
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        placeholder={t.passwordPlaceholder || 'Enter your password'}
                        className="w-full h-11 sm:h-12 rounded-xl bg-slate-50/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-300/60 pointer-events-none">
                        <Lock size={17} />
                      </span>
                      <button
                        type="button"
                        onClick={() => setSignInShowPassword(!signInShowPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-emerald-300/60 dark:hover:text-white transition-colors cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {signInShowPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      type="checkbox"
                      id="signin-remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-black/60 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label
                      htmlFor="signin-remember-me"
                      className="text-xs font-semibold text-slate-600 dark:text-emerald-200/80 cursor-pointer select-none"
                    >
                      {t.rememberMe || 'Remember this device'}
                    </label>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    whileHover={{ scale: 1.012 }}
                    whileTap={{ scale: 0.985 }}
                    type="submit"
                    id="btn-submit-signin"
                    disabled={signInLoading}
                    style={{ color: '#ffffff' }}
                    className="keep-white w-full mt-2 h-11 sm:h-12 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 font-black text-white text-sm shadow-[0_8px_25px_rgba(16,185,129,0.35)] hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {signInLoading ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>{t.signingIn || 'Authenticating...'}</span>
                      </>
                    ) : (
                      <span>{t.signInBtn || 'Sign In to Dashboard'}</span>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="signup-panel"
                custom={direction}
                variants={formVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full"
              >
                {/* Header */}
                <div className="mb-5 sm:mb-6">
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                    {t.signUpTitle || 'Create an account'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-white/60 mt-1.5 font-medium flex items-center gap-1.5 flex-wrap">
                    <span>{t.haveAccount || 'Already have an account?'}</span>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1 group cursor-pointer"
                    >
                      <span className="group-hover:underline">
                        {t.signInLink || 'Log in'}
                      </span>
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </motion.button>
                  </p>
                </div>

                {/* Error Alert */}
                {signUpError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-300 flex items-center gap-2"
                  >
                    <span>⚠️</span>
                    <span>{signUpError}</span>
                  </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSignUp} className="space-y-3.5 sm:space-y-4">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="signup-name"
                      className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80 mb-1.5"
                    >
                      {t.fullName || 'Full Name'} *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="signup-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder={t.fullNamePlaceholder || 'e.g. R. Subramanian'}
                        className="w-full h-11 sm:h-12 rounded-xl bg-slate-50/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 pl-10 pr-4 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-300/60 pointer-events-none">
                        <User size={17} />
                      </span>
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label
                      htmlFor="signup-email"
                      className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80 mb-1.5"
                    >
                      {t.email || 'Email Address'} *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        id="signup-email"
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        required
                        placeholder={t.emailPlaceholder || 'e.g. farmer@farmhub.in'}
                        className="w-full h-11 sm:h-12 rounded-xl bg-slate-50/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 pl-10 pr-4 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-300/60 pointer-events-none">
                        <Mail size={17} />
                      </span>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="signup-password"
                      className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80 mb-1.5"
                    >
                      {t.password || 'Password'} *
                    </label>
                    <div className="relative">
                      <input
                        type={signUpShowPassword ? 'text' : 'password'}
                        id="signup-password"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        required
                        placeholder={t.passwordPlaceholder || 'Min 6 characters'}
                        className="w-full h-11 sm:h-12 rounded-xl bg-slate-50/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-300/60 pointer-events-none">
                        <Lock size={17} />
                      </span>
                      <button
                        type="button"
                        onClick={() => setSignUpShowPassword(!signUpShowPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-emerald-300/60 dark:hover:text-white cursor-pointer transition-colors"
                        aria-label="Toggle password visibility"
                      >
                        {signUpShowPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="signup-confirm-password"
                      className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80 mb-1.5"
                    >
                      {t.confirmPassword || 'Confirm Password'} *
                    </label>
                    <div className="relative">
                      <input
                        type={signUpShowPassword ? 'text' : 'password'}
                        id="signup-confirm-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder={t.confirmPasswordPlaceholder || 'Repeat password'}
                        className="w-full h-11 sm:h-12 rounded-xl bg-slate-50/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                      />
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-300/60 pointer-events-none">
                        <Lock size={17} />
                      </span>
                      <button
                        type="button"
                        onClick={() => setSignUpShowPassword(!signUpShowPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-emerald-300/60 dark:hover:text-white cursor-pointer transition-colors"
                        aria-label="Toggle password visibility"
                      >
                        {signUpShowPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  {/* Terms checkbox */}
                  <div className="flex items-start gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="signup-agree-terms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-black/60 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label
                      htmlFor="signup-agree-terms"
                      className="text-xs text-slate-600 dark:text-white/70 leading-relaxed cursor-pointer select-none"
                    >
                      <span>
                        {locale === 'ta'
                          ? 'FarmHub விவசாய சேவை விதிமுறைகள் மற்றும் கொள்கைகளை ஏற்கிறேன்.'
                          : 'I agree to the FarmHub Terms of Service & Privacy Policy.'}
                      </span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    whileHover={{ scale: 1.012 }}
                    whileTap={{ scale: 0.985 }}
                    type="submit"
                    id="btn-submit-signup"
                    disabled={signUpLoading}
                    style={{ color: '#ffffff' }}
                    className="keep-white w-full mt-2 h-11 sm:h-12 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 font-black text-white text-sm shadow-[0_8px_25px_rgba(16,185,129,0.35)] hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {signUpLoading ? (
                      <>
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>{t.signingUp || 'Creating account...'}</span>
                      </>
                    ) : (
                      <span>{t.signUpBtn || 'Create account'}</span>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <OtpVerificationModal
        open={signUpOtpOpen}
        email={signUpEmail.trim().toLowerCase()}
        title={locale === 'ta' ? 'மின்னஞ்சலை சரிபார்க்கவும்' : 'Verify Your Email'}
        subtitle={
          locale === 'ta'
            ? 'உங்கள் கணக்கை உருவாக்க, உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்ட 6 இலக்க குறியீட்டை உள்ளிடவும்.'
            : 'Enter the 6-digit verification code sent to your email address to activate your FarmHub account.'
        }
        confirmLabel={locale === 'ta' ? 'சரிபார்த்து கணக்கை உருவாக்கு' : 'Verify & Create Account'}
        loading={signUpOtpLoading}
        resending={signUpOtpResending}
        errorMsg={signUpOtpError}
        secondsLeft={signUpOtpSeconds}
        status={signUpOtpStatus}
        onStatusChange={setSignUpOtpStatus}
        onVerify={handleVerifySignUpOtp}
        onResend={handleResendSignUpOtp}
        onCancel={() => {
          setSignUpOtpOpen(false);
          setSignUpOtpError(null);
        }}
        isTamil={locale === 'ta'}
        previewUrl={signUpOtpPreviewUrl}
      />
    </motion.div>
  );
}
