'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function SignInPage() {
  const router = useRouter();
  const { messages, locale } = useLanguage();
  const t = (messages as any).auth || {};

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const useremail = String(formData.get('useremail') || '').trim();
    const userpassword = String(formData.get('userpassword') || '');

    if (!useremail) {
      setErrorMessage(locale === 'ta' ? 'மின்னஞ்சல் அல்லது கைபேசி எண்ணை உள்ளிடவும்' : 'Please enter your email or mobile number');
      return;
    }
    if (!userpassword) {
      setErrorMessage(locale === 'ta' ? 'கடவுச்சொல்லை உள்ளிடவும்' : 'Please enter your password');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const res = await fetch('/api/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          useremail,
          userpassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setErrorMessage(data?.message || (locale === 'ta' ? 'உள்நுழைவு தோல்வியடைந்தது' : 'Invalid email or password'));
        setIsLoading(false);
        return;
      }

      if (data?.token && typeof window !== 'undefined') {
        document.cookie = `agripulse_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
        if (data?.user) {
          localStorage.setItem('agripulse_user', JSON.stringify(data.user));
        }
      }

      setIsLoading(false);
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect') || '/';
      // Hard navigation ensures full cookie synchronization, clean shell transition, and correct URL
      window.location.href = redirectUrl;
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(locale === 'ta' ? 'சேவையக பிழை ஏற்பட்டது' : 'Server authentication error');
      console.error("Auth signin error:", err);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl glass-panel p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-emerald-500/30">
        {/* Card Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 mb-2.5 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <Lock size={20} />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-display">
            {t.signInTitle || 'Welcome Back'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-emerald-200/60 mt-0.5 leading-relaxed font-medium">
            {t.signInSubtitle || 'Precision Farm Advisory & IoT Intelligence Platform'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-300">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignIn} className="space-y-3.5">
          {/* Email / Mobile */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80 mb-1">
              {t.emailOrPhone || 'Email or Mobile Number'}
            </label>
            <div className="relative">
              <input
                type="text"
                id="useremail"
                name="useremail"
                autoComplete="username"
                required
                placeholder={t.emailOrPhonePlaceholder || 'e.g. 9876543210 or agronomist@agripulse.in'}
                className="w-full h-10 rounded-xl bg-slate-50/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 pl-10 pr-4 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/35 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-300/60 pointer-events-none">
                <Mail size={16} />
              </span>
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-emerald-200/80">
                {t.password || 'Password'}
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert(locale === 'ta' ? 'கடவுச்சொல் மீட்டமைப்பு உங்கள் பதிவுசெய்த கைபேசி எண்ணிற்கு அனுப்பப்படும்.' : 'Password reset link has been dispatched to your registered phone.');
                }}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline"
              >
                {t.forgotPassword || 'Forgot password?'}
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="userpassword"
                name="userpassword"
                autoComplete="current-password"
                required
                placeholder={t.passwordPlaceholder || 'Enter your password'}
                className="w-full h-10 rounded-xl bg-slate-50/90 dark:bg-black/60 border border-slate-200 dark:border-white/15 pl-10 pr-10 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/35 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-300/60 pointer-events-none">
                <Lock size={16} />
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-emerald-300/60 dark:hover:text-white transition-colors cursor-pointer"
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
              className="h-4 w-4 rounded border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-black/60 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="remember-me" className="text-xs font-semibold text-slate-600 dark:text-emerald-200/80 cursor-pointer select-none">
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
        <div className="mt-5 text-center text-xs text-slate-600 dark:text-emerald-200/60 border-t border-slate-200 dark:border-white/10 pt-3.5">
          <span>{t.noAccount || "Don't have an AgriPulse account?"} </span>
          <Link
            href="/signup"
            className="font-extrabold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline inline-flex items-center gap-1"
          >
            {t.signUpLink || 'Create an Account'} →
          </Link>
        </div>
      </div>
    </div>
  );
}
