'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SproutIcon } from '@/components/icons/Icons';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ThemeSwitch } from '@/components/layout/ThemeSwitch';
import { RisingLines } from '@/components/ui/rising-lines';

export default function SignInPage() {
  const router = useRouter();
  const { messages, locale, setLocale } = useLanguage();
  const t = (messages as any).auth || {};

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage(locale === 'ta' ? 'மின்னஞ்சல் அல்லது கைபேசி எண்ணை உள்ளிடவும்' : 'Please enter your email or mobile number');
      return;
    }
    if (!password) {
      setErrorMessage(locale === 'ta' ? 'கடவுச்சொல்லை உள்ளிடவும்' : 'Please enter your password');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      if (typeof window !== 'undefined') {
        const user = {
          name: identifier.includes('swaminathan') || identifier === '9876543210' ? 'Dr. M. Swaminathan' : identifier.split('@')[0] || 'Farmer User',
          email: identifier.includes('@') ? identifier : `${identifier}@agripulse.in`,
          role: 'Head Agronomist',
        };
        localStorage.setItem('agripulse_user', JSON.stringify(user));
      }
      setIsLoading(false);
      router.push('/');
    }, 600);
  };

  const handleDemoLogin = () => {
    setIdentifier('swaminathan@agripulse.in');
    setPassword('agripulse2026');
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'agripulse_user',
          JSON.stringify({
            name: 'Dr. M. Swaminathan',
            email: 'swaminathan@agripulse.in',
            role: 'Head Agronomist',
          })
        );
      }
      setIsLoading(false);
      router.push('/');
    }, 500);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-start items-center p-3 sm:p-5 overflow-hidden bg-[#010403]">
      {/* RISING LINES FROM GLOWING HORIZON (Emerald Green Theme - Horizon below form) */}
      <RisingLines
        className="fixed inset-0 z-0 pointer-events-none"
        lineColor="#ffffff"
        glowColor="#10b981"
        particleColor="#6ee7b7"
        lineCount={100}
        particleCount={60}
        speed={1}
        horizonYPercent={0.88}
      />

      {/* Top Bar Navigation */}
      <header className="relative z-10 w-full max-w-5xl flex items-center justify-between py-2 sm:py-3 mb-2">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.35)] backdrop-blur-md transition-transform group-hover:scale-105">
            <SproutIcon size={24} />
          </div>
          <div>
            <h1 className="font-display text-base sm:text-lg font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {messages.common?.brandName || 'AgriPulse'}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {messages.common?.brandSubtitle || 'Precision Agriculture OS'}
            </p>
          </div>
        </Link>

        {/* Language & Theme Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-white/15 bg-black/60 p-1 shadow-lg backdrop-blur-md">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                locale === 'en'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale('ta')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                locale === 'ta'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              தமிழ்
            </button>
          </div>
          <ThemeSwitch id="auth-theme-switch" />
        </div>
      </header>

      {/* Centered Glass Login Card (Positioned so the glowing horizon shines right below it) */}
      <div className="relative z-10 w-full max-w-md mt-2 sm:mt-4 mb-20 sm:mb-24">
        <div className="rounded-3xl bg-[#060f0a]/90 p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(16,185,129,0.16)] border border-emerald-500/30 backdrop-blur-2xl">
          {/* Card Header */}
          <div className="text-center mb-5">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-2.5 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <Lock size={20} />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white font-display">
              {t.signInTitle || 'Welcome Back'}
            </h2>
            <p className="text-xs text-emerald-200/60 mt-0.5 leading-relaxed">
              {t.signInSubtitle || 'Precision Farm Advisory & IoT Intelligence Platform'}
            </p>
          </div>

          {/* Quick Demo Button */}
          <button
            type="button"
            id="btn-demo-login"
            onClick={handleDemoLogin}
            className="w-full mb-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/25 to-emerald-500/20 hover:from-emerald-500/35 hover:to-teal-500/35 border border-emerald-500/40 px-4 py-2 text-xs font-black text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all cursor-pointer active:scale-98"
          >
            <span>{t.demoLogin || '⚡ Quick Demo: Dr. M. Swaminathan'}</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-4">
            <div className="w-full border-t border-white/10" />
            <span className="absolute bg-[#060f0a] px-3 text-[11px] font-bold text-emerald-300/70 uppercase tracking-wider rounded-full border border-emerald-500/25">
              {locale === 'ta' ? 'அல்லது உங்கள் கணக்கில்' : 'Or with credentials'}
            </span>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-3 rounded-xl bg-rose-500/20 border border-rose-500/40 px-3.5 py-2 text-xs font-bold text-rose-300">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-3.5">
            {/* Email / Mobile */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-emerald-200/80 mb-1">
                {t.emailOrPhone || 'Email or Mobile Number'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="signin-identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t.emailOrPhonePlaceholder || 'e.g. 9876543210 or agronomist@agripulse.in'}
                  className="w-full h-10 rounded-xl bg-black/60 border border-white/15 pl-10 pr-4 text-xs font-semibold text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-300/60 pointer-events-none">
                  <Mail size={16} />
                </span>
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-emerald-200/80">
                  {t.password || 'Password'}
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert(locale === 'ta' ? 'கடவுச்சொல் மீட்டமைப்பு உங்கள் பதிவுசெய்த கைபேசி எண்ணிற்கு அனுப்பப்படும்.' : 'Password reset link has been dispatched to your registered phone.');
                  }}
                  className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  {t.forgotPassword || 'Forgot password?'}
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="signin-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder || 'Enter your password'}
                  className="w-full h-10 rounded-xl bg-black/60 border border-white/15 pl-10 pr-10 text-xs font-semibold text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-300/60 pointer-events-none">
                  <Lock size={16} />
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-300/60 hover:text-white transition-colors cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-black/60 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="remember-me" className="text-xs font-semibold text-emerald-200/80 cursor-pointer select-none">
                {t.rememberMe || 'Remember this device'}
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-submit-signin"
              disabled={isLoading}
              className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 font-black text-slate-950 text-sm shadow-[0_8px_25px_rgba(16,185,129,0.35)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                  <span>{t.signingIn || 'Authenticating...'}</span>
                </>
              ) : (
                <span>{t.signInBtn || 'Sign In to Dashboard'}</span>
              )}
            </button>
          </form>

          {/* Footer Link to Sign Up */}
          <div className="mt-5 text-center text-xs text-emerald-200/60 border-t border-white/10 pt-3.5">
            <span>{t.noAccount || "Don't have an AgriPulse account?"} </span>
            <Link
              href="/signup"
              className="font-extrabold text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1"
            >
              {t.signUpLink || 'Create an Account'} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
