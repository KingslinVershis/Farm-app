'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SproutIcon } from '@/components/icons/Icons';
import { User, Phone, Mail, MapPin, Lock, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { ThemeSwitch } from '@/components/layout/ThemeSwitch';
import { RisingLines } from '@/components/ui/rising-lines';

const DELTA_DISTRICTS = [
  { id: 'thanjavur', nameEn: 'Thanjavur (தஞ்சாவூர்)', nameTa: 'தஞ்சாவூர்' },
  { id: 'tiruvarur', nameEn: 'Tiruvarur (திருவாரூர்)', nameTa: 'திருவாரூர்' },
  { id: 'nagapattinam', nameEn: 'Nagapattinam (நாகப்பட்டினம்)', nameTa: 'நாகப்பட்டினம்' },
  { id: 'mayiladuthurai', nameEn: 'Mayiladuthurai (மயிலாடுதுறை)', nameTa: 'மயிலாடுதுறை' },
  { id: 'tiruchirappalli', nameEn: 'Tiruchirappalli (திருச்சிராப்பள்ளி)', nameTa: 'திருச்சிராப்பள்ளி' },
  { id: 'cuddalore', nameEn: 'Cuddalore (கடலூர்)', nameTa: 'கடலூர்' },
  { id: 'pudukkottai', nameEn: 'Pudukkottai (புதுக்கோட்டை)', nameTa: 'புதுக்கோட்டை' },
  { id: 'ariyalur', nameEn: 'Ariyalur (அரியலூர்)', nameTa: 'அரியலூர்' },
  { id: 'karur', nameEn: 'Karur (கரூர்)', nameTa: 'கரூர்' },
];

export default function SignUpPage() {
  const router = useRouter();
  const { messages, locale, setLocale } = useLanguage();
  const t = (messages as any).auth || {};

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [landSize, setLandSize] = useState<number | ''>(100);
  const [district, setDistrict] = useState('thanjavur');
  const [role, setRole] = useState<'farmer' | 'agronomist' | 'fpo'>('farmer');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const landSizeNum = typeof landSize === 'number' ? landSize : 0;
  const acresEquivalent = (landSizeNum / 100).toFixed(2);

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage(locale === 'ta' ? 'முழு பெயரை உள்ளிடவும்' : 'Please enter your full name');
      return;
    }
    if (!mobile.trim() || mobile.length < 10) {
      setErrorMessage(locale === 'ta' ? 'செல்லுபடியாகும் 10 இலக்க கைபேசி எண்ணை உள்ளிடவும்' : 'Please enter a valid 10-digit mobile number');
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

    setTimeout(() => {
      if (typeof window !== 'undefined') {
        const newUser = {
          name: fullName,
          phone: mobile,
          email: email || `${mobile}@agripulse.in`,
          landSize: landSizeNum,
          district,
          role: role === 'farmer' ? 'Farmer / Landowner' : role === 'agronomist' ? 'Agronomist' : 'FPO Operator',
        };
        localStorage.setItem('agripulse_user', JSON.stringify(newUser));
      }
      setIsLoading(false);
      router.push('/fertilizer/create/step1');
    }, 700);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-start items-center p-3 sm:p-5 overflow-hidden bg-[#010403]">
      {/* RISING LINES FROM GLOWING HORIZON (Emerald Green Theme - Horizon below form) */}
      <RisingLines
        className="fixed inset-0 z-0 pointer-events-none"
        lineColor="#ffffff"
        glowColor="#10b981"
        particleColor="#6ee7b7"
        lineCount={105}
        particleCount={65}
        speed={1}
        horizonYPercent={0.88}
      />

      {/* Top Bar Navigation */}
      <header className="relative z-10 w-full max-w-5xl flex items-center justify-between py-1.5 sm:py-2.5 mb-1">
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
          <ThemeSwitch id="auth-theme-switch-signup" />
        </div>
      </header>

      {/* Centered Glass Sign Up Card (Finished nicely above the horizon so the glowing spot is visible) */}
      <div className="relative z-10 w-full max-w-xl mt-1 sm:mt-2 mb-20 sm:mb-24">
        <div className="rounded-3xl bg-[#060f0a]/90 p-5 sm:p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(16,185,129,0.16)] border border-emerald-500/30 backdrop-blur-2xl">
          {/* Card Header */}
          <div className="text-center mb-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-2 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <User size={19} />
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
            <div className="mb-3 rounded-xl bg-rose-500/20 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-300">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-3">
            {/* Full Name & Mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
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
                    className="w-full h-9 sm:h-10 rounded-xl bg-black/60 border border-white/15 pl-9 pr-3 text-xs font-semibold text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300/60 pointer-events-none">
                    <User size={15} />
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-200/80 mb-1">
                  {t.mobileNumber || 'Mobile Number'} *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="signup-mobile"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder={t.mobilePlaceholder || '10-digit mobile'}
                    className="w-full h-9 sm:h-10 rounded-xl bg-black/60 border border-white/15 pl-9 pr-3 text-xs font-semibold text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300/60 pointer-events-none">
                    <Phone size={15} />
                  </span>
                </div>
              </div>
            </div>

            {/* Email & Land Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-200/80 mb-1">
                  {t.email || 'Email Address'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="signup-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder || 'farmer@deltafarm.in'}
                    className="w-full h-9 sm:h-10 rounded-xl bg-black/60 border border-white/15 pl-9 pr-3 text-xs font-semibold text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300/60 pointer-events-none">
                    <Mail size={15} />
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-200/80">
                    {t.landSize || 'Land Area (Cents)'}
                  </label>
                  <span className="text-[10px] font-bold text-emerald-400">
                    ≈ {acresEquivalent} {locale === 'ta' ? 'ஏக்கர்' : 'Acres'}
                  </span>
                </div>
                <input
                  type="number"
                  id="signup-land"
                  min={1}
                  max={10000}
                  value={landSize}
                  onChange={(e) => setLandSize(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder={t.landSizePlaceholder || '100 Cents'}
                  className="w-full h-9 sm:h-10 rounded-xl bg-black/60 border border-white/15 px-3 text-xs font-black text-emerald-300 placeholder:text-white/35 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                />
              </div>
            </div>

            {/* District & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-200/80 mb-1">
                  {t.district || 'Delta District'}
                </label>
                <div className="relative">
                  <select
                    id="signup-district"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full h-9 sm:h-10 rounded-xl bg-black/60 border border-white/15 pl-9 pr-4 text-xs font-semibold text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer"
                  >
                    {DELTA_DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id} className="bg-[#060f0a] text-white">
                        {locale === 'ta' ? d.nameTa : d.nameEn}
                      </option>
                    ))}
                  </select>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300/60 pointer-events-none">
                    <MapPin size={15} />
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-200/80 mb-1">
                  {t.role || 'Primary Role'}
                </label>
                <select
                  id="signup-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full h-9 sm:h-10 rounded-xl bg-black/60 border border-white/15 px-3 text-xs font-semibold text-white focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer"
                >
                  <option value="farmer" className="bg-[#060f0a] text-white">{t.roleFarmer || '🌾 Farmer / Landowner'}</option>
                  <option value="agronomist" className="bg-[#060f0a] text-white">{t.roleAgronomist || '🧪 Agronomist / Field Scientist'}</option>
                  <option value="fpo" className="bg-[#060f0a] text-white">{t.roleFpo || '🏢 FPO / Agri-Business Enterprise'}</option>
                </select>
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
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
                    className="w-full h-9 sm:h-10 rounded-xl bg-black/60 border border-white/15 pl-9 pr-8 text-xs font-semibold text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
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
                    className="w-full h-9 sm:h-10 rounded-xl bg-black/60 border border-white/15 pl-9 pr-3 text-xs font-semibold text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300/60 pointer-events-none">
                    <Lock size={15} />
                  </span>
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2 pt-0.5">
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
              className="w-full mt-2 h-10 sm:h-11 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 font-black text-slate-950 text-xs sm:text-sm shadow-[0_8px_25px_rgba(16,185,129,0.35)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
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
          <div className="mt-4 text-center text-xs text-emerald-200/60 border-t border-white/10 pt-3">
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
    </div>
  );
}
