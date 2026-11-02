'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

export default function SignUpPage() {
  const router = useRouter();
  const { messages, locale } = useLanguage();
  const t = (messages as any).auth || {};

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage(locale === 'ta' ? 'முழு பெயரை உள்ளிடவும்' : 'Please enter your full name');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage(locale === 'ta' ? 'செல்லுபடியாகும் மின்னஞ்சல் முகவரியை உள்ளிடவும்' : 'Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage(locale === 'ta' ? 'கடவுச்சொல் குறைந்தபட்சம் 6 எழுத்துகள் இருக்க வேண்டும்' : 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(locale === 'ta' ? 'கடவுச்சொற்கள் பொருந்தவில்லை' : 'Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      setErrorMessage(locale === 'ta' ? 'விதிமுறைகளை ஏற்கவும்' : 'Please agree to terms and privacy policy');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const newUser = {
        username: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
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
        setErrorMessage(data?.error || (locale === 'ta' ? 'பதிவு செய்வதில் பிழை ஏற்பட்டது' : 'Failed to create account'));
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      router.push('/signin');
    } catch (err: any) {
      console.error('ERROR', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-3xl bg-[#060f0a]/90 p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(16,185,129,0.16)] border border-emerald-500/30 backdrop-blur-2xl">
        {/* Card Header */}
        <div className="text-center mb-5">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-2.5 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <User size={20} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display">
            {t.signUpTitle || 'Create Account'}
          </h2>
          <p className="text-xs text-emerald-200/60 mt-0.5 leading-relaxed">
            {t.signUpSubtitle || 'Join Kaveri Delta’s Precision Agriculture Network'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 px-3.5 py-2 text-xs font-bold text-rose-300">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignUp} className="space-y-3.5">
          {/* Full Name & Email Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-200/80 mb-1">
                {t.fullName || 'Full Name'} *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="signup-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.fullNamePlaceholder || 'e.g. R. Subramanian'}
                  className="w-full h-10 rounded-xl bg-black/60 border border-white/15 pl-9 pr-3 text-xs font-semibold text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300/60 pointer-events-none">
                  <User size={15} />
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-200/80 mb-1">
                {t.email || 'Email Address'} *
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="signup-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder || 'e.g. farmer@deltafarm.in'}
                  className="w-full h-10 rounded-xl bg-black/60 border border-white/15 pl-9 pr-3 text-xs font-semibold text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300/60 pointer-events-none">
                  <Mail size={15} />
                </span>
              </div>
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-200/80 mb-1">
                {t.password || 'Password'} *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="signup-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder || 'Min 6 characters'}
                  className="w-full h-10 rounded-xl bg-black/60 border border-white/15 pl-9 pr-8 text-xs font-semibold text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300/60 pointer-events-none">
                  <Lock size={15} />
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-300/60 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-200/80 mb-1">
                {t.confirmPassword || 'Confirm Password'} *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="signup-confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.confirmPasswordPlaceholder || 'Repeat password'}
                  className="w-full h-10 rounded-xl bg-black/60 border border-white/15 pl-9 pr-3 text-xs font-semibold text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300/60 pointer-events-none">
                  <Lock size={15} />
                </span>
              </div>
            </div>
          </div>

          {/* Terms checkbox */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="agree-terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-black/60 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="agree-terms" className="text-[11px] text-emerald-200/75 leading-tight cursor-pointer select-none">
              {t.termsNotice || 'I agree to AgriPulse Agricultural Intelligence Terms & Privacy Policy'}
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="btn-submit-signup"
            disabled={isLoading}
            className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 font-black text-slate-950 text-xs sm:text-sm shadow-[0_8px_25px_rgba(16,185,129,0.35)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                <span>{t.signingUp || 'Creating account...'}</span>
              </>
            ) : (
              <span>{t.signUpBtn || 'Create Account & Get Started'}</span>
            )}
          </button>
        </form>

        {/* Footer Link to Sign In */}
        <div className="mt-5 text-center text-xs text-emerald-200/60 border-t border-white/10 pt-3.5">
          <span>{t.haveAccount || 'Already have an account?'} </span>
          <Link
            href="/signin"
            className="font-extrabold text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1"
          >
            {t.signInLink || 'Sign In here'} →
          </Link>
        </div>
      </div>
    </div>
  );
}

