'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme, type Theme } from '@/components/providers/ThemeProvider';
import { useLocationSelector } from '@/lib/hooks/useLocationSelector';
import { LocationSelectorFields } from '@/components/common/LocationSelectorFields';
import {
  User,
  Lock,
  Shield,
  Palette,
  Globe,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Sun,
  Moon,
  Mail,
  Calendar,
  Activity,
  KeyRound,
  Save,
  Check,
  Phone,
  MapPin,
  Home,
} from 'lucide-react';
import { Input } from 'antd';

export type SettingsTab = 'user-profile' | 'security-password' | 'language-theme';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  isactive: boolean;
  theme?: string;
  language?: string;
  state?: string;
  district?: string;
  city?: string;
  address?: string;
  phone_nun?: string;
  phone_number?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function SettingsPage() {
  const { locale, setLocale } = useLanguage();
  const isTamil = locale === 'ta';
  const { theme, setTheme } = useTheme();

  // Active section tab: 'user-profile' | 'security-password' | 'language-theme'
  const [activeTab, setActiveTab] = useState<SettingsTab>('user-profile');

  // User Profile state from /api/user
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  // Form states for profile
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [addressInput, setAddressInput] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Location selector hook (shared with fertilizer step 1)
  const location = useLocationSelector({
    initialState: user?.state || '',
    initialDistrict: user?.district || '',
    initialCity: user?.city || '',
  });

  // Password form state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPass, setShowCurrentPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [showConfirmPass, setShowConfirmPass] = useState<boolean>(false);
  const [savingPassword, setSavingPassword] = useState<boolean>(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Theme & Language feedback
  const [themeFeedback, setThemeFeedback] = useState<string | null>(null);
  const [langFeedback, setLangFeedback] = useState<string | null>(null);

  // 1. Sync URL path like /settings?user-profile, /settings?security-password, /settings?language-theme
  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.search = tab;
      window.history.pushState(null, '', url.pathname + '?' + tab);
    }
  };

  // Sync initial tab from URL query on load & listen to browser back/forward buttons
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const parseTabFromUrl = (): SettingsTab => {
        const search = window.location.search.replace(/^\?/, '').toLowerCase();
        if (search.includes('security') || search.includes('password')) {
          return 'security-password';
        }
        if (search.includes('language') || search.includes('theme') || search.includes('appearance')) {
          return 'language-theme';
        }
        return 'user-profile';
      };

      const initial = parseTabFromUrl();
      setActiveTab(initial);
      if (!window.location.search) {
        window.history.replaceState(null, '', window.location.pathname + '?' + initial);
      }

      const handlePopState = () => {
        setActiveTab(parseTabFromUrl());
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  // 2. Fetch user profile from /api/user
  const fetchUserProfile = async () => {
    setLoadingUser(true);
    try {
      const res = await fetch('/api/user', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Failed to fetch user details (${res.status})`);
      }

      if (data?.user) {
        const u = data.user;
        setUser(u);
        setUsernameInput(u.username || '');
        setPhoneInput(u.phone_nun || u.phone_number || '');
        setAddressInput(u.address || '');

        if (u.state) {
          location.applyDynamicLocation(u.state, u.district || '', u.city || '');
        }
      }
    } catch (err: any) {
      console.error('[Settings] Error fetching user profile:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // 3. Handle Profile & Location update via /api/user/profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    if (!usernameInput.trim()) {
      setProfileFeedback({
        type: 'error',
        message: isTamil ? 'பயனர் பெயரை உள்ளிடவும்' : 'Please enter a valid username',
      });
      return;
    }

    if (usernameInput.trim().length < 2) {
      setProfileFeedback({
        type: 'error',
        message: isTamil ? 'பயனர் பெயர் குறைந்தபட்சம் 2 எழுத்துகள் இருக்க வேண்டும்' : 'Username must be at least 2 characters',
      });
      return;
    }

    const cleanPhone = phoneInput.replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 10) {
      setProfileFeedback({
        type: 'error',
        message: isTamil ? 'செல்லுபடியாகும் 10 இலக்க தொலைபேசி எண்ணை உள்ளிடவும்' : 'Please enter a valid 10-digit phone number',
      });
      return;
    }

    setSavingProfile(true);

    const activeCity = location.isManualInput && location.manualPlaceName
      ? location.manualPlaceName.trim()
      : location.selectedPlace;

    try {
      const payload = {
        username: usernameInput.trim(),
        phone_nun: cleanPhone.slice(0, 10),
        state: (location.selectedStateName || '').slice(0, 20),
        district: (location.selectedDistrictName || '').slice(0, 20),
        city: (activeCity || '').slice(0, 20),
        address: addressInput.trim().slice(0, 40),
      };

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to update profile');
      }

      const updatedUser: UserProfile = {
        ...user,
        ...(data?.user || payload),
        id: user?.id || '',
        email: user?.email || '',
        role: user?.role || 'Farmer',
        isactive: user?.isactive !== false,
      };

      setUser(updatedUser);

      try {
        localStorage.setItem('farmhub_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('farmhub_user_updated', { detail: updatedUser }));
      } catch {}

      setProfileFeedback({
        type: 'success',
        message: isTamil
          ? 'சுயவிவரம், தொலைபேசி எண் மற்றும் பண்ணை இருப்பிட விவரங்கள் வெற்றிகரமாக சேமிக்கப்பட்டன!'
          : 'Profile, phone number, and location details saved successfully!',
      });
      setIsEditingUsername(false);
      setTimeout(() => setProfileFeedback(null), 4000);
    } catch (err: any) {
      setProfileFeedback({
        type: 'error',
        message: err?.message || 'Error updating profile',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // 4. Handle Password update via /api/user/password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!currentPassword) {
      setPasswordFeedback({
        type: 'error',
        message: isTamil ? 'தற்போதைய கடவுச்சொல்லை உள்ளிடவும்' : 'Please enter your current password',
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({
        type: 'error',
        message: isTamil
          ? 'புதிய கடவுச்சொல் குறைந்தபட்சம் 6 எழுத்துகள் இருக்க வேண்டும்'
          : 'New password must be at least 6 characters',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: isTamil ? 'புதிய கடவுச்சொற்கள் பொருந்தவில்லை' : 'New passwords do not match',
      });
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to update password');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({
        type: 'success',
        message: isTamil ? 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!' : 'Password changed successfully!',
      });
      setTimeout(() => setPasswordFeedback(null), 4000);
    } catch (err: any) {
      setPasswordFeedback({
        type: 'error',
        message: err?.message || 'Error updating password',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // 5. Handle Theme update via dedicated /api/user/theme API
  const handleThemeChange = async (newTheme: Theme) => {
    if (theme === newTheme && user?.theme === newTheme) return;

    setTheme(newTheme);
    setThemeFeedback(null);

    try {
      const res = await fetch('/api/user/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to persist theme preference');
      }

      setUser((prev) => (prev ? { ...prev, theme: newTheme } : null));
      setThemeFeedback(
        isTamil
          ? `${newTheme === 'dark' ? 'இருண்ட தீம் (Dark Theme)' : 'ஒளிர் தீம் (Light Theme)'} சேமிக்கப்பட்டது!`
          : `${newTheme === 'dark' ? 'Dark Theme' : 'Light Theme'} applied & saved to account!`
      );
      setTimeout(() => setThemeFeedback(null), 3500);
    } catch (err: any) {
      console.warn('[ThemeAPI] Error:', err);
      setThemeFeedback(err?.message || 'Failed to save theme to account');
    }
  };

  // 6. Handle Language update via dedicated /api/user/language API
  const handleLanguageChange = async (newLang: 'en' | 'ta') => {
    if (locale === newLang && user?.language === newLang) return;

    setLocale(newLang);
    setLangFeedback(null);

    try {
      const res = await fetch('/api/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLang }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to persist language preference');
      }

      setUser((prev) => (prev ? { ...prev, language: newLang } : null));
      setLangFeedback(
        newLang === 'ta'
          ? 'மொழி வெற்றிகரமாக தமிழாக மாற்றப்பட்டது!'
          : 'Language successfully updated to English!'
      );
      setTimeout(() => setLangFeedback(null), 3500);
    } catch (err: any) {
      console.warn('[LanguageAPI] Error:', err);
      setLangFeedback(err?.message || 'Failed to save language to account');
    }
  };

  // Format creation date
  const formatMemberDate = (dateStr?: string) => {
    if (!dateStr) return isTamil ? 'பதிவு செய்யப்பட்டது' : 'Active Member';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isTamil ? 'ta-IN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative min-h-screen w-full">
      {/* Background Photography Layer for Settings */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out scale-105"
        style={{
          backgroundImage: `url('/images/setting.png')`,
        }}
      />
      {/* Ambient Contrast Scrim to Guarantee High Readability Across Themes */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950/75 dark:bg-slate-950/80 bg-slate-900/20 backdrop-blur-[2px]" />

      {/* Main Content Area */}
      <div className="relative z-10 max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 flex flex-col gap-6 fade-in">
        {/* Page Header Banner */}
        <div className="rounded-3xl bg-slate-900/90 dark:bg-slate-900/90 bg-white/95 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl border border-white/15 dark:border-white/15 border-slate-200/90 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold mb-2.5 border border-emerald-500/30">
              <Sparkles size={14} />
              <span>{isTamil ? 'பயனர் கணக்கு & பண்ணை மேலாண்மை' : 'User Account & Farm Preferences'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white dark:text-white text-slate-900 tracking-tight m-0 mb-1.5">
              {isTamil ? 'கணக்கு அமைப்புகள் & விருப்பத்தேர்வுகள்' : 'Account Settings & Preferences'}
            </h1>
            <p className="text-slate-300 dark:text-slate-300 text-slate-600 text-xs sm:text-sm m-0 max-w-2xl leading-relaxed font-medium">
              {isTamil
                ? 'உங்கள் சுயவிவர விவரங்களை நிர்வகிக்கவும், பண்ணை இருப்பிடத்தை அமைக்கவும், கடவுச்சொல்லை மாற்றவும் மற்றும் காட்சி தீமை அமைக்கவும்.'
                : 'Manage your profile details, farm location, contact number, update password, and customize UI theme & language.'}
            </p>
          </div>

          {/* Quick User Identity Badge */}
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/80 dark:bg-slate-950/80 bg-slate-100 border border-white/15 dark:border-white/15 border-slate-200 shadow-md">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md ring-2 ring-emerald-400/30">
                {(user.username || user.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-extrabold text-white dark:text-white text-slate-900 truncate max-w-[170px]">
                  {user.username || 'FarmHub User'}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-400 text-slate-500 truncate max-w-[170px] font-mono">
                  {user.phone_nun || user.phone_number || user.email}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider">
                {user.role || 'Farmer'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Tabs Bar with URL query synchronization (?user-profile, ?security-password, ?language-theme) */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: 'user-profile' as SettingsTab, label: isTamil ? 'சுயவிவரம் & இருப்பிடம்' : 'User Profile & Farm Location', icon: User },
            { id: 'security-password' as SettingsTab, label: isTamil ? 'கடவுச்சொல் & பாதுகாப்பு' : 'Security & Password', icon: Lock },
            { id: 'language-theme' as SettingsTab, label: isTamil ? 'மொழி மற்றும் தீம்' : 'Language and Theme', icon: Palette },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap shadow-md ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 shadow-emerald-500/30 scale-[1.02] ring-2 ring-emerald-400/40'
                    : 'bg-slate-900/80 dark:bg-slate-900/85 bg-white/85 text-slate-300 dark:text-slate-300 text-slate-700 hover:text-white dark:hover:text-white hover:bg-slate-800/80 dark:hover:bg-slate-800/80 border border-white/10 dark:border-white/10 border-slate-200 backdrop-blur-xl'
                }`}
              >
                <Icon size={17} className={isActive ? 'text-slate-950' : 'text-emerald-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* SECTION 1: USER PROFILE & FARM LOCATION */}
        {activeTab === 'user-profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Profile Summary Card */}
            <div className="lg:col-span-1 rounded-3xl bg-slate-900/90 dark:bg-slate-900/90 bg-white/95 backdrop-blur-2xl p-6 sm:p-7 flex flex-col items-center text-center shadow-2xl border border-white/15 dark:border-white/15 border-slate-200/90 relative overflow-hidden h-fit">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent pointer-events-none" />

              <div className="relative mt-3 mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-1 shadow-2xl shadow-emerald-500/25">
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-white text-3xl font-black">
                    {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                </div>
                <div
                  className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-xs text-slate-950 font-black shadow"
                  title="Account Active"
                >
                  ✓
                </div>
              </div>

              <h2 className="text-xl font-black text-white dark:text-white text-slate-900 m-0 mb-1">
                {user?.username || (loadingUser ? 'Loading...' : 'User')}
              </h2>
              <p className="text-xs text-slate-300 dark:text-slate-300 text-slate-600 font-semibold m-0 mb-3 flex items-center gap-1.5">
                <Mail size={13} className="text-emerald-400" />
                <span>{user?.email || '---'}</span>
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  {user?.role || 'Farmer'}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                  <Activity size={12} />
                  <span>{user?.isactive !== false ? (isTamil ? 'செயலில் உள்ளது' : 'Active Account') : 'Inactive'}</span>
                </span>
              </div>

              {/* Account Meta & Location Summary List */}
              <div className="w-full space-y-3 pt-4 border-t border-white/10 dark:border-white/10 border-slate-200 text-left">
                {/* Phone */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 dark:text-slate-300 text-slate-600 font-semibold flex items-center gap-1.5">
                    <Phone size={14} className="text-emerald-400" />
                    <span>{isTamil ? 'தொலைபேசி எண்' : 'Phone Number'}</span>
                  </span>
                  <span className="font-extrabold text-white dark:text-white text-slate-900 font-mono">
                    {user?.phone_nun || user?.phone_number || (isTamil ? 'இல்லை' : 'Not set')}
                  </span>
                </div>

                {/* Farm Location (City, District, State) */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 dark:text-slate-300 text-slate-600 font-semibold flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-400" />
                    <span>{isTamil ? 'இருப்பிடம்' : 'Location'}</span>
                  </span>
                  <span
                    className="font-bold text-white dark:text-white text-slate-900 text-right truncate max-w-[170px]"
                    title={[user?.city, user?.district, user?.state].filter(Boolean).join(', ')}
                  >
                    {[user?.city, user?.district, user?.state].filter(Boolean).join(', ') || (isTamil ? 'குறிப்பிடப்படவில்லை' : 'Not set')}
                  </span>
                </div>

                {/* Farm Address */}
                {user?.address && (
                  <div className="flex justify-between items-start text-xs pt-0.5">
                    <span className="text-slate-300 dark:text-slate-300 text-slate-600 font-semibold flex items-center gap-1.5 shrink-0">
                      <Home size={14} className="text-emerald-400" />
                      <span>{isTamil ? 'முகவரி' : 'Address'}</span>
                    </span>
                    <span className="font-semibold text-white dark:text-white text-slate-900 text-right truncate max-w-[170px]" title={user.address}>
                      {user.address}
                    </span>
                  </div>
                )}

                {/* Joined Date */}
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-white/10 dark:border-white/10 border-slate-200">
                  <span className="text-slate-300 dark:text-slate-300 text-slate-600 font-semibold flex items-center gap-1.5">
                    <Calendar size={14} className="text-emerald-400" />
                    <span>{isTamil ? 'பதிவு செய்த நாள்' : 'Joined Date'}</span>
                  </span>
                  <span className="font-extrabold text-white dark:text-white text-slate-900">
                    {formatMemberDate(user?.createdAt)}
                  </span>
                </div>

                {/* Account Status */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 dark:text-slate-300 text-slate-600 font-semibold flex items-center gap-1.5">
                    <Shield size={14} className="text-emerald-400" />
                    <span>{isTamil ? 'கணக்கு நிலை' : 'Account Status'}</span>
                  </span>
                  <span className="font-black text-emerald-400">
                    {isTamil ? 'சரிபார்க்கப்பட்டது' : 'Verified'}
                  </span>
                </div>

                {/* Default Language */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 dark:text-slate-300 text-slate-600 font-semibold flex items-center gap-1.5">
                    <Globe size={14} className="text-emerald-400" />
                    <span>{isTamil ? 'இயல்பு மொழி' : 'Default Language'}</span>
                  </span>
                  <span className="font-extrabold text-white dark:text-white text-slate-900 uppercase">
                    {user?.language || locale}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Information & Location Form */}
            <div className="lg:col-span-2 rounded-3xl bg-slate-900/90 dark:bg-slate-900/90 bg-white/95 backdrop-blur-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl border border-white/15 dark:border-white/15 border-slate-200/90">
              <div className="border-b border-white/10 dark:border-white/10 border-slate-200 pb-4">
                <h2 className="text-lg font-black text-white dark:text-white text-slate-900 m-0 flex items-center gap-2">
                  <User className="text-emerald-400" size={20} />
                  <span>{isTamil ? 'பயனர் & பண்ணை இருப்பிட விவரங்கள்' : 'Profile & Farm Location Details'}</span>
                </h2>
                <p className="text-xs text-slate-300 dark:text-slate-300 text-slate-600 font-medium mt-1 mb-0">
                  {isTamil
                    ? 'உங்கள் பெயர், தொடர்பு எண், மற்றும் பண்ணையின் மாநிலம், மாவட்டம், கிராமம், முகவரியை அமைக்கவும்.'
                    : 'Manage your name, contact phone number, and official farm location (State, District, Village & Address).'}
                </p>
              </div>

              {profileFeedback && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${
                    profileFeedback.type === 'success'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {profileFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{profileFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {/* Row 1: Username & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Username Field */}
                  <div>
                    <label className="block text-xs font-bold text-white dark:text-white text-slate-900 uppercase tracking-wider mb-2">
                      {isTamil ? 'பயனர் பெயர் (Username)' : 'Username / Full Name'}
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          placeholder={isTamil ? 'எ.கா. Dr. M. Swaminathan' : 'e.g. Dr. M. Swaminathan'}
                          readOnly={!isEditingUsername}
                          className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-inner pr-10 ${
                            isEditingUsername
                              ? 'bg-slate-950 dark:bg-slate-950 bg-white border-2 border-emerald-500 text-white dark:text-white text-slate-900 focus:outline-none ring-2 ring-emerald-500/25'
                              : 'bg-slate-950/70 dark:bg-slate-950/70 bg-slate-100 border border-white/20 dark:border-white/20 border-slate-300 text-white dark:text-white text-slate-900 cursor-default select-all'
                          }`}
                          disabled={savingProfile || loadingUser}
                          autoFocus={isEditingUsername}
                        />
                        <User className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" size={17} />
                      </div>

                      {!isEditingUsername ? (
                        <button
                          type="button"
                          onClick={() => setIsEditingUsername(true)}
                          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                        >
                          <span>{isTamil ? 'மாற்று' : 'Change'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setUsernameInput(user?.username || '');
                            setIsEditingUsername(false);
                          }}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-800 bg-slate-200 border border-white/20 dark:border-white/20 border-slate-300 text-white dark:text-white text-slate-800 text-xs font-bold transition-all cursor-pointer active:scale-95"
                        >
                          {isTamil ? 'ரத்து' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Registered Email */}
                  <div>
                    <label className="block text-xs font-bold text-white dark:text-white text-slate-900 uppercase tracking-wider mb-2">
                      {isTamil ? 'மின்னஞ்சல் முகவரி' : 'Registered Email Address'}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={user?.email || ''}
                        readOnly
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 dark:bg-slate-950/70 bg-slate-100 border border-white/20 dark:border-white/20 border-slate-300 text-white dark:text-white text-slate-900 text-sm font-mono cursor-pointer hover:border-emerald-500/50 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner pr-10"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                        title={isTamil ? 'மின்னஞ்சலைத் தேர்ந்தெடுக்க கிளிக் செய்யவும்' : 'Click to select or copy email'}
                      />
                      <Mail className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" size={17} />
                    </div>
                  </div>
                </div>

                {/* Row 2: Phone Number Field */}
                <div className="max-w-md">
                  <label className="block text-xs font-bold text-white dark:text-white text-slate-900 uppercase tracking-wider mb-2">
                    {isTamil ? 'தொலைபேசி எண் (Mobile Number)' : 'Mobile Phone Number'}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      maxLength={10}
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder={isTamil ? 'எ.கா. 9876543210' : 'e.g. 9876543210'}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 dark:bg-slate-950/70 bg-slate-100 border border-white/20 dark:border-white/20 border-slate-300 text-white dark:text-white text-slate-900 text-sm font-mono font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner pr-10"
                      disabled={savingProfile || loadingUser}
                    />
                    <Phone className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" size={17} />
                  </div>
                  <span className="text-[11px] text-slate-300 dark:text-slate-300 text-slate-600 font-medium mt-1.5 block">
                    {isTamil
                      ? '10 இலக்க இந்திய மொபைல் எண் (SMS மற்றும் விவசாய அறிவிப்புகளுக்கு).'
                      : '10-digit mobile number for farm advisory and SMS telemetry alerts.'}
                  </span>
                </div>

                {/* Row 3: Farm Location (State, District, City/Village via common LocationSelectorFields) */}
                <div className="pt-3 border-t border-white/10 dark:border-white/10 border-slate-200">
                  <LocationSelectorFields
                    location={location}
                    isTamil={isTamil}
                    disabled={savingProfile || loadingUser}
                  />
                </div>

                {/* Row 4: Farm Street Address */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-white dark:text-white text-slate-900 uppercase tracking-wider">
                      {isTamil ? 'பண்ணை முகவரி (Farm Address)' : 'Farm Street Address'}
                    </label>
                    <span className="text-[11px] text-slate-400 dark:text-slate-400 text-slate-500 font-mono font-bold">
                      {addressInput.length}/40
                    </span>
                  </div>
                  <div className="relative">
                    <Input.TextArea
                      rows={2}
                      maxLength={40}
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value.slice(0, 40))}
                      placeholder={
                        isTamil
                          ? 'எ.கா. 14, வடக்கு தெரு, கோவில்பட்டி'
                          : 'e.g. 14, North Street, Kovilpatti'
                      }
                      className="w-full rounded-2xl px-4 py-2.5 text-sm font-semibold bg-slate-950/70 dark:bg-slate-950/70 bg-slate-100 border border-white/20 dark:border-white/20 border-slate-300 text-white dark:text-white text-slate-900 focus:border-emerald-500"
                      disabled={savingProfile || loadingUser}
                    />
                  </div>
                  <span className="text-[11px] text-slate-300 dark:text-slate-300 text-slate-600 font-medium mt-1.5 block">
                    {isTamil
                      ? 'அதிகபட்சம் 40 எழுத்துகள் (கள முகவரி).'
                      : 'Maximum 40 characters for field location / mailing delivery.'}
                  </span>
                </div>

                {/* Submit / Save Profile Button */}
                <div className="pt-3 flex justify-start">
                  <button
                    type="submit"
                    disabled={savingProfile || loadingUser}
                    className="px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm flex items-center gap-2.5 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    <Save size={17} />
                    <span>
                      {savingProfile
                        ? isTamil
                          ? 'சேமிக்கப்படுகிறது...'
                          : 'Saving Profile...'
                        : isTamil
                        ? 'சுயவிவரத்தைச் சேமி'
                        : 'Save Profile & Location'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SECTION 2: CHANGE PASSWORD */}
        {activeTab === 'security-password' && (
          <div className="max-w-3xl rounded-3xl bg-slate-900/90 dark:bg-slate-900/90 bg-white/95 backdrop-blur-2xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl border border-white/15 dark:border-white/15 border-slate-200/90">
            <div className="border-b border-white/10 dark:border-white/10 border-slate-200 pb-4">
              <h2 className="text-lg font-black text-white dark:text-white text-slate-900 m-0 flex items-center gap-2">
                <KeyRound className="text-emerald-400" size={20} />
                <span>{isTamil ? 'கடவுச்சொல்லை மாற்றவும்' : 'Change Password'}</span>
              </h2>
              <p className="text-xs text-slate-300 dark:text-slate-300 text-slate-600 font-medium mt-1 mb-0">
                {isTamil
                  ? 'உங்கள் தற்போதைய கடவுச்சொல்லை உள்ளிட்ட பின் புதிய வலுவான கடவுச்சொல்லை அமைக்கவும்.'
                  : 'Enter your current password followed by your new password to ensure maximum security.'}
              </p>
            </div>

            {passwordFeedback && (
              <div
                className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${
                  passwordFeedback.type === 'success'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                }`}
              >
                {passwordFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              {/* Current Password Field */}
              <div>
                <label className="block text-xs font-bold text-white dark:text-white text-slate-900 uppercase tracking-wider mb-2">
                  {isTamil ? 'தற்போதைய கடவுச்சொல்' : 'Current Password'}
                </label>
                <div className="relative max-w-md">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 dark:bg-slate-950/70 bg-slate-100 border border-white/20 dark:border-white/20 border-slate-300 text-white dark:text-white text-slate-900 text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-colors shadow-inner pr-11"
                    disabled={savingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Toggle Current Password Visibility"
                  >
                    {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password Field */}
              <div>
                <label className="block text-xs font-bold text-white dark:text-white text-slate-900 uppercase tracking-wider mb-2">
                  {isTamil ? 'புதிய கடவுச்சொல் (குறைந்தபட்சம் 6 எழுத்துகள்)' : 'New Password (min 6 characters)'}
                </label>
                <div className="relative max-w-md">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 dark:bg-slate-950/70 bg-slate-100 border border-white/20 dark:border-white/20 border-slate-300 text-white dark:text-white text-slate-900 text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-colors shadow-inner pr-11"
                    disabled={savingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Toggle New Password Visibility"
                  >
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Field with Eye Icon */}
              <div>
                <label className="block text-xs font-bold text-white dark:text-white text-slate-900 uppercase tracking-wider mb-2">
                  {isTamil ? 'புதிய கடவுச்சொல்லை மீண்டும் உள்ளிடவும்' : 'Confirm New Password'}
                </label>
                <div className="relative max-w-md">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/70 dark:bg-slate-950/70 bg-slate-100 border border-white/20 dark:border-white/20 border-slate-300 text-white dark:text-white text-slate-900 text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-colors shadow-inner pr-11"
                    disabled={savingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Toggle Confirm Password Visibility"
                  >
                    {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button with Dynamic Theme Text Color: white for dark theme, dark for white theme */}
              <div className="pt-3 flex justify-start">
                <button
                  type="submit"
                  disabled={savingPassword || !currentPassword || !newPassword}
                  className="px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white font-black text-sm flex items-center gap-2.5 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer active:scale-98"
                >
                  <Lock size={17} />
                  <span>{savingPassword ? (isTamil ? 'மாற்றப்படுகிறது...' : 'Updating...') : isTamil ? 'கடவுச்சொல்லை மாற்று' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SECTION 3: LANGUAGE AND THEME */}
        {activeTab === 'language-theme' && (
          <div className="max-w-4xl rounded-3xl bg-slate-900/90 dark:bg-slate-900/90 bg-white/95 backdrop-blur-2xl p-6 sm:p-8 flex flex-col gap-8 shadow-2xl border border-white/15 dark:border-white/15 border-slate-200/90">
            {/* Header: Language and Theme */}
            <div className="border-b border-white/10 dark:border-white/10 border-slate-200 pb-4">
              <h2 className="text-lg font-black text-white dark:text-white text-slate-900 m-0 flex items-center gap-2">
                <Palette className="text-emerald-400" size={20} />
                <span>{isTamil ? 'மொழி மற்றும் தீம்' : 'Language and Theme'}</span>
              </h2>
              <p className="text-xs text-slate-300 dark:text-slate-300 text-slate-600 font-medium mt-1 mb-0">
                {isTamil
                  ? 'உங்கள் காட்சி தீம் மற்றும் மொழியைத் தேர்ந்தெடுக்கவும். இவை உங்கள் கணக்கில் நேரடியாக சேமிக்கப்படும்.'
                  : 'Customize your visual theme and preferred system language. Preferences are instantly synced to your account.'}
              </p>
            </div>

            {/* Sub-section 1: Theme Selection */}
            <div>
              <div className="mb-3.5">
                <h3 className="text-sm font-bold text-white dark:text-white text-slate-900 m-0 flex items-center gap-2">
                  <Sun className="text-emerald-400" size={16} />
                  <span>{isTamil ? 'தீம் தேர்வு (Theme Preferences)' : 'Theme Selection'}</span>
                </h3>
                <span className="text-xs text-slate-300 dark:text-slate-300 text-slate-600 font-medium">
                  {isTamil ? 'இருண்ட அல்லது ஒளிர் இடைமுகத்தைத் தேர்ந்தெடுக்கவும்' : 'Switch between Dark Cosmos and Daylight crisp theme'}
                </span>
              </div>

              {themeFeedback && (
                <div className="p-3.5 rounded-2xl border bg-emerald-500/20 border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 mb-4 animate-fade-in">
                  <CheckCircle2 size={16} />
                  <span>{themeFeedback}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                {/* Dark Theme Option */}
                <div
                  onClick={() => handleThemeChange('dark')}
                  className={`relative p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    theme === 'dark'
                      ? 'border-emerald-500 bg-slate-950 shadow-2xl shadow-emerald-500/25 ring-2 ring-emerald-500/40'
                      : 'border-white/10 bg-slate-950/60 hover:border-emerald-500/50 hover:bg-slate-950/80'
                  }`}
                >
                  {theme === 'dark' && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-md">
                      <Check size={14} />
                    </div>
                  )}

                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-cyan-400 flex items-center justify-center border border-white/15 shadow-inner">
                      <Moon size={24} />
                    </div>
                    <div>
                      <h4
                        className={`text-base font-black m-0 ${
                          theme === 'dark' ? 'text-white' : 'text-slate-200'
                        }`}
                      >
                        {isTamil ? 'இருண்ட தீம் (Dark Theme)' : 'Dark Cosmos Theme'}
                      </h4>
                      <span
                        className={`text-xs font-medium ${
                          theme === 'dark' ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {isTamil ? 'குறைந்த ஒளி, ஒளிரும் பச்சை நிறங்கள்' : 'Deep obsidian slate & emerald accents'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-2xl border space-y-2 mt-auto ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-white/15'
                        : 'bg-slate-900/50 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                      <span
                        className={`text-xs font-mono font-bold ${
                          theme === 'dark' ? 'text-slate-200' : 'text-slate-400'
                        }`}
                      >
                        FarmHub Emerald #10b981
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 w-3/4" />
                    </div>
                  </div>
                </div>

                {/* Light Theme Option */}
                <div
                  onClick={() => handleThemeChange('light')}
                  className={`relative p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    theme === 'light'
                      ? 'border-emerald-500 bg-white shadow-2xl shadow-emerald-500/25 ring-2 ring-emerald-500/40'
                      : 'border-white/10 bg-slate-950/60 hover:border-emerald-500/50 hover:bg-slate-950/80'
                  }`}
                >
                  {theme === 'light' && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-md">
                      <Check size={14} />
                    </div>
                  )}

                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-200 shadow-sm">
                      <Sun size={24} />
                    </div>
                    <div>
                      <h4
                        className={`text-base font-black m-0 ${
                          theme === 'light' ? 'text-slate-950' : 'text-slate-200'
                        }`}
                      >
                        {isTamil ? 'ஒளிர் தீம் (Light Theme)' : 'Daylight Emerald Theme'}
                      </h4>
                      <span
                        className={`text-xs font-medium ${
                          theme === 'light' ? 'text-slate-700' : 'text-slate-400'
                        }`}
                      >
                        {isTamil ? 'பகல் நேர தெளிவான பார்வை' : 'Clean daytime high-contrast clarity'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-2xl border space-y-2 mt-auto ${
                      theme === 'light'
                        ? 'bg-slate-100 border-slate-200'
                        : 'bg-slate-900/50 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                      <span
                        className={`text-xs font-mono font-bold ${
                          theme === 'light' ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        Daylight Crisp Emerald
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-3/4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-section 2: Language Selection */}
            <div className="pt-6 border-t border-white/10 dark:border-white/10 border-slate-200">
              <div className="mb-3.5">
                <h3 className="text-sm font-bold text-white dark:text-white text-slate-900 m-0 flex items-center gap-2">
                  <Globe className="text-emerald-400" size={16} />
                  <span>{isTamil ? 'மொழி விருப்பத்தேர்வு (Language Selection)' : 'Language Selection'}</span>
                </h3>
                <span className="text-xs text-slate-300 dark:text-slate-300 text-slate-600 font-medium">
                  {isTamil
                    ? 'முழு அமைப்பின் மொழியைத் தேர்ந்தெடுக்கவும் (தமிழ் அல்லது ஆங்கிலம்)'
                    : 'Choose your application language. All modules, reports, and alerts will reflect this language.'}
                </span>
              </div>

              {langFeedback && (
                <div className="p-3.5 rounded-2xl border bg-emerald-500/20 border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 mb-4 animate-fade-in">
                  <CheckCircle2 size={16} />
                  <span>{langFeedback}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                {/* English Option */}
                <div
                  onClick={() => handleLanguageChange('en')}
                  className={`relative p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    locale === 'en'
                      ? 'border-emerald-500 bg-emerald-500/15 shadow-2xl shadow-emerald-500/20 ring-2 ring-emerald-500/40'
                      : 'border-white/10 bg-slate-950/60 hover:border-emerald-500/50 hover:bg-slate-950/80'
                  }`}
                >
                  {locale === 'en' && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-md">
                      <Check size={14} />
                    </div>
                  )}

                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 font-black text-base flex items-center justify-center border border-cyan-500/40">
                      EN
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white dark:text-white text-slate-900 m-0">
                        English (Global)
                      </h4>
                      <span className="text-xs text-slate-300 dark:text-slate-300 text-slate-600 font-medium">
                        Default international agricultural & agronomic terminology
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/60 dark:bg-slate-950/60 bg-slate-100 border border-white/10 dark:border-white/10 border-slate-200 text-xs text-slate-300 dark:text-slate-300 text-slate-700 font-medium">
                    &quot;Empowering farmers with hydrology telemetry, certified seed databases, and 5-phase agronomy audit.&quot;
                  </div>
                </div>

                {/* Tamil Option */}
                <div
                  onClick={() => handleLanguageChange('ta')}
                  className={`relative p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    locale === 'ta'
                      ? 'border-emerald-500 bg-emerald-500/15 shadow-2xl shadow-emerald-500/20 ring-2 ring-emerald-500/40'
                      : 'border-white/10 bg-slate-950/60 hover:border-emerald-500/50 hover:bg-slate-950/80'
                  }`}
                >
                  {locale === 'ta' && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-md">
                      <Check size={14} />
                    </div>
                  )}

                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 font-black text-base flex items-center justify-center border border-emerald-500/40">
                      தமிழ்
                    </div>
                    <div>
                      <h4 className="text-base font-black text-white dark:text-white text-slate-900 m-0">
                        தமிழ் (Tamil)
                      </h4>
                      <span className="text-xs text-slate-300 dark:text-slate-300 text-slate-600 font-medium">
                        காவிரி டெல்டா மற்றும் தமிழ்நாடு விவசாயிகளுக்கான நேரடி தமிழ் பதிப்பு
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/60 dark:bg-slate-950/60 bg-slate-100 border border-white/10 dark:border-white/10 border-slate-200 text-xs text-slate-300 dark:text-slate-300 text-slate-700 font-medium leading-relaxed">
                    &quot;5-நிலை சாகுபடி மேலாண்மை, நேரடி அணை நீர்மட்ட அளவீடு மற்றும் வேளாண் நுண்ணறிவு தளம்.&quot;
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
