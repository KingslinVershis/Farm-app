'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useTheme, type Theme } from '@/components/providers/ThemeProvider';
import { useLocationSelector } from '@/lib/hooks/useLocationSelector';
import { LocationSelectorFields } from '@/components/common/LocationSelectorFields';
import { fetchUserData, invalidateUserDataCache } from '@/lib/clientUser';
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
  Trash2,
  AlertTriangle,
  Camera,
  Upload,
} from '@/components/icons/FlaticonIcons';
import { Input, Modal, App } from 'antd';
import { OtpVerificationModal } from '@/components/auth/OtpVerificationModal';
import type { CodeSlotsStatus } from '@/components/auth/CodeSlots';
import { clearClientSessionStorage } from '@/components/layout/AppShell';
import HoldButton from '@/components/common/HoldButton';
import { SettingsContactsSection } from '@/components/settings/SettingsContactsSection';

export type SettingsTab = 'user-profile' | 'security-password' | 'language-theme' | 'contacts';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  isactive?: boolean;
  theme?: string;
  language?: string;
  state?: string;
  district?: string;
  city?: string;
  address?: string;
  avatar_url?: string;
  phone_nun?: string;
  phone_number?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function SettingsPage() {
  const { message } = App.useApp();
  const { locale, setLocale, messages } = useLanguage();
  const isTamil = locale === 'ta';
  const sp = messages.settingsPage;
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
  const [uploadingAvatar, setUploadingAvatar] = useState<boolean>(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

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

  // Change Password OTP modal states
  const [passOtpOpen, setPassOtpOpen] = useState(false);
  const [passOtpEmail, setPassOtpEmail] = useState('');
  const [passOtpSeconds, setPassOtpSeconds] = useState(0);
  const [passOtpStatus, setPassOtpStatus] = useState<CodeSlotsStatus>('idle');
  const [passOtpLoading, setPassOtpLoading] = useState(false);
  const [passOtpResending, setPassOtpResending] = useState(false);
  const [passOtpError, setPassOtpError] = useState<string | null>(null);
  const [passOtpPreviewUrl, setPassOtpPreviewUrl] = useState<string | null>(null);

  // Delete Account state
  const [deleteConfirmInput, setDeleteConfirmInput] = useState<string>('');
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);

  const expectedDeletePhrase = user?.email
    ? `delete ${user.email.trim().toLowerCase()}`
    : 'delete the account';

  useEffect(() => {
    if (!passOtpOpen || passOtpSeconds <= 0) return;
    const timer = setInterval(() => {
      setPassOtpSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [passOtpOpen, passOtpSeconds]);

  // Reset any unsaved edits across Profile/Location, Password, and Delete inputs when switching tabs
  const resetUnsavedTabValues = () => {
    setUsernameInput(user?.username || '');
    setIsEditingUsername(false);
    setPhoneInput(user?.phone_nun || user?.phone_number || '');
    setAddressInput(user?.address || '');
    location.applyDynamicLocation(user?.state || '', user?.district || '', user?.city || '');
    setProfileFeedback(null);
    setDeleteConfirmInput('');
    setDeleteModalOpen(false);

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPass(false);
    setShowNewPass(false);
    setShowConfirmPass(false);
    setPasswordFeedback(null);
    setPassOtpOpen(false);
    setPassOtpError(null);
    setPassOtpStatus('idle');
  };

  const resetFnRef = useRef<() => void>(() => { });
  resetFnRef.current = resetUnsavedTabValues;

  // 1. Sync URL path like /settings?user-profile, /settings?security-password, /settings?language-theme
  const handleTabChange = (tab: SettingsTab) => {
    if (tab !== activeTab) {
      resetUnsavedTabValues();
    }
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
        if (search.includes('contact')) {
          return 'contacts';
        }
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
        resetFnRef.current();
        setActiveTab(parseTabFromUrl());
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  // 2. Fetch user profile from /api/user (deduplicated)
  const fetchUserProfile = async (force = false) => {
    setLoadingUser(true);
    try {
      const data = await fetchUserData({ force });

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch user details');
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

  // Avatar upload logic via backend API /api/user/avatar
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      message.error(sp.messages.imageOnly);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      message.error(sp.messages.sizeLimit);
      return;
    }

    setUploadingAvatar(true);
    const hideLoading = message.loading(sp.messages.uploadingAvatar, 0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || sp.messages.avatarFailed);
      }

      const updatedAvatarUrl = data.avatar_url;
      const updatedUser: UserProfile = {
        ...(user || {
          id: '',
          username: '',
          email: '',
          role: 'Farmer',
          isactive: true,
        }),
        avatar_url: updatedAvatarUrl,
      };

      setUser(updatedUser);

      try {
        localStorage.setItem('farmhub_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('farmhub_user_updated', { detail: updatedUser }));
        invalidateUserDataCache();
      } catch { }

      message.success(sp.messages.avatarUpdated);
    } catch (err: any) {
      console.error('[Settings] Avatar upload error:', err);
      message.error(err?.message || sp.messages.avatarFailed);
    } finally {
      hideLoading();
      setUploadingAvatar(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);
    const hideLoading = message.loading(sp.messages.removingAvatar, 0);
    try {
      const res = await fetch('/api/user/avatar', { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to remove avatar');
      }

      const updatedUser: UserProfile = {
        ...(user || {
          id: '',
          username: '',
          email: '',
          role: 'Farmer',
          isactive: true,
        }),
        avatar_url: '',
      };
      setUser(updatedUser);

      try {
        localStorage.setItem('farmhub_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('farmhub_user_updated', { detail: updatedUser }));
        invalidateUserDataCache();
      } catch { }

      message.success(sp.messages.avatarRemoved);
    } catch (err: any) {
      message.error(err?.message || 'Failed to remove avatar');
    } finally {
      hideLoading();
      setUploadingAvatar(false);
    }
  };

  // 1. Check if User Details are dirty (Username, Phone Number differed from API values)
  const isUserDetailsDirty = useMemo(() => {
    if (!user) return false;

    const originalUsername = (user.username || '').trim();
    const currentUsername = usernameInput.trim();
    if (currentUsername !== originalUsername) return true;

    const originalPhone = (user.phone_nun || user.phone_number || '').replace(/\D/g, '');
    const currentPhone = phoneInput.replace(/\D/g, '');
    if (currentPhone !== originalPhone) return true;

    return false;
  }, [user, usernameInput, phoneInput]);

  // 2. Check if Farm Location is dirty (State, District, City, Address differed from API values)
  const isLocationDirty = useMemo(() => {
    if (!user) return false;

    const originalState = (user.state || '').trim();
    const currentState = (location.selectedStateName || '').trim();
    if (currentState !== originalState) return true;

    const originalDistrict = (user.district || '').trim();
    const currentDistrict = (location.selectedDistrictName || '').trim();
    if (currentDistrict !== originalDistrict) return true;

    const originalCity = (user.city || '').trim();
    const activeCity = (
      location.isManualInput && location.manualPlaceName
        ? location.manualPlaceName.trim()
        : location.selectedPlace || ''
    ).trim();
    if (activeCity !== originalCity) return true;

    const originalAddress = (user.address || '').trim();
    const currentAddress = addressInput.trim();
    if (currentAddress !== originalAddress) return true;

    return false;
  }, [
    user,
    location.selectedStateName,
    location.selectedDistrictName,
    location.selectedPlace,
    location.manualPlaceName,
    location.isManualInput,
    addressInput,
  ]);

  // 3. Handle User Details update via /api/user/profile (Username, Phone)
  const handleUpdateUserDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isUserDetailsDirty) return;
    setProfileFeedback(null);

    if (!usernameInput.trim()) {
      setProfileFeedback({
        type: 'error',
        message: sp.messages.enterUsername,
      });
      return;
    }

    if (usernameInput.trim().length < 2) {
      setProfileFeedback({
        type: 'error',
        message: sp.messages.enterUsername,
      });
      return;
    }

    const cleanPhone = phoneInput.replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 10) {
      setProfileFeedback({
        type: 'error',
        message: sp.profile.phoneHelp,
      });
      return;
    }

    setSavingProfile(true);
    try {
      const payload = {
        username: usernameInput.trim(),
        phone_nun: cleanPhone.slice(0, 10),
      };

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || sp.messages.profileFailed);
      }

      const updatedUser: UserProfile = {
        ...user!,
        ...(data?.user || payload),
      };

      setUser(updatedUser);

      try {
        localStorage.setItem('farmhub_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('farmhub_user_updated', { detail: updatedUser }));
        invalidateUserDataCache();
      } catch { }

      setProfileFeedback({
        type: 'success',
        message: sp.messages.profileUpdated,
      });
      message.success(sp.messages.profileUpdated);
      setIsEditingUsername(false);
      setTimeout(() => setProfileFeedback(null), 4000);
    } catch (err: any) {
      setProfileFeedback({
        type: 'error',
        message: err?.message || sp.messages.profileFailed,
      });
      message.error(err?.message || sp.messages.profileFailed);
    } finally {
      setSavingProfile(false);
    }
  };

  // 4. Handle Farm Location update via /api/user/profile (State, District, City, Address)
  const handleUpdateFarmLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isLocationDirty) return;
    setProfileFeedback(null);

    setSavingProfile(true);
    const activeCity = location.isManualInput && location.manualPlaceName
      ? location.manualPlaceName.trim()
      : location.selectedPlace;

    try {
      const payload = {
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
        throw new Error(data?.error || sp.messages.locationFailed);
      }

      const updatedUser: UserProfile = {
        ...user!,
        ...(data?.user || payload),
      };

      setUser(updatedUser);

      try {
        localStorage.setItem('farmhub_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('farmhub_user_updated', { detail: updatedUser }));
        invalidateUserDataCache();
      } catch { }

      setProfileFeedback({
        type: 'success',
        message: sp.messages.locationUpdated,
      });
      message.success(sp.messages.locationUpdated);
      setTimeout(() => setProfileFeedback(null), 4000);
    } catch (err: any) {
      setProfileFeedback({
        type: 'error',
        message: err?.message || sp.messages.locationFailed,
      });
      message.error(err?.message || sp.messages.locationFailed);
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
        message: sp.messages.enterCurrentPassword,
      });
      message.error(sp.messages.enterCurrentPassword);
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({
        type: 'error',
        message: sp.messages.enterNewPassword,
      });
      message.error(sp.messages.enterNewPassword);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: sp.messages.passwordMismatch,
      });
      message.error(sp.messages.passwordMismatch);
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
        throw new Error(data?.error || sp.messages.passwordFailed);
      }

      if (data?.otpRequired) {
        setPassOtpEmail(data.email || user?.email || '');
        setPassOtpSeconds(data.expiresInSeconds || 300);
        setPassOtpPreviewUrl(data.previewUrl || null);
        setPassOtpError(null);
        setPassOtpStatus('idle');
        setPassOtpOpen(true);
        message.success(sp.messages.otpSent);
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({
        type: 'success',
        message: sp.messages.passwordUpdated,
      });
      message.success(sp.messages.passwordUpdated);
      setTimeout(() => setPasswordFeedback(null), 4000);
    } catch (err: any) {
      setPasswordFeedback({
        type: 'error',
        message: err?.message || sp.messages.passwordFailed,
      });
      message.error(err?.message || sp.messages.passwordFailed);
    } finally {
      setSavingPassword(false);
    }
  };

  const handleResendPasswordOtp = async () => {
    setPassOtpResending(true);
    setPassOtpError(null);
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
        setPassOtpError(data?.error || 'Failed to resend verification code.');
        return;
      }
      setPassOtpSeconds(data.expiresInSeconds || 300);
      setPassOtpPreviewUrl(data.previewUrl || null);
      message.success(sp.messages.otpSent);
    } catch {
      setPassOtpError('Server error while resending code.');
    } finally {
      setPassOtpResending(false);
    }
  };

  const handleVerifyPasswordOtp = async (otpCode: string) => {
    setPassOtpError(null);
    setPassOtpLoading(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          otp: otpCode.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setPassOtpStatus('error');
        setPassOtpError(data?.error || sp.messages.otpInvalid);
        return;
      }

      setPassOtpStatus('success');
      message.success(sp.messages.otpSuccessRelog, 4);

      setTimeout(() => {
        setPassOtpOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        clearClientSessionStorage();
        if (typeof window !== 'undefined') {
          window.location.href = '/signin';
        }
      }, 1100);
    } catch {
      setPassOtpStatus('error');
      setPassOtpError('Server error while verifying OTP.');
    } finally {
      setPassOtpLoading(false);
    }
  };

  // 4b. Handle Permanent Account Deletion
  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: deleteConfirmInput.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || sp.messages.accountDeleteFailed);
      }

      setDeleteModalOpen(false);
      message.success(sp.messages.accountDeleted, 3);
      clearClientSessionStorage();
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/signin';
        }
      }, 900);
    } catch (err: any) {
      message.error(err?.message || sp.messages.accountDeleteFailed);
    } finally {
      setDeletingAccount(false);
    }
  };

  // 5. Handle Theme update (persisted via ThemeProvider -> /api/user/theme)
  const handleThemeChange = (newTheme: Theme) => {
    if (theme === newTheme && user?.theme === newTheme) return;

    setTheme(newTheme);
    setUser((prev) => (prev ? { ...prev, theme: newTheme } : null));
    message.success(newTheme === 'dark' ? sp.messages.themeAppliedDark : sp.messages.themeAppliedLight);
  };

  // 6. Handle Language update (persisted via LanguageProvider -> /api/user/language)
  const handleLanguageChange = (newLang: 'en' | 'ta') => {
    if (locale === newLang && user?.language === newLang) return;

    setLocale(newLang);
    setUser((prev) => (prev ? { ...prev, language: newLang } : null));
    message.success(newLang === 'ta' ? sp.messages.langUpdatedTa : sp.messages.langUpdatedEn);
  };

  // Format creation date
  const formatMemberDate = (dateStr?: string) => {
    if (!dateStr) return sp.profile.activeMember;
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
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Background Photography Layer with Soft Vignette & Frosted Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out scale-105"
        style={{
          backgroundImage: `url('https://res.cloudinary.com/chk0va7a/image/upload/v1795763640/settings.png')`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 gpu-accelerate" />

      {/* Main Content Area */}
      <div className="relative z-10 max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 flex flex-col gap-6 fade-in">
        {/* Page Header Banner (Transparent Glassmorphic Panel) */}
        <div className="rounded-2xl glass-panel p-5 sm:p-7 shadow-xl border border-border-light flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold mb-2.5 border border-emerald-500/30">
              <Sparkles size={14} />
              <span>{sp.badge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight m-0 mb-1.5">
              {sp.title}
            </h1>
            <p className="text-text-secondary text-xs sm:text-sm m-0 max-w-2xl leading-relaxed font-medium">
              {sp.subtitle}
            </p>
          </div>

          {/* Quick User Identity Badge */}
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-2xl glass-surface border border-border-light shadow-md">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md ring-2 ring-emerald-400/30 overflow-hidden">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username || 'User Profile'}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  (user.username || user.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div className="text-xs font-extrabold text-text-main truncate max-w-[170px]">
                  {user.username || sp.defaultFarmer}
                </div>
                <div className="text-[11px] text-text-muted truncate max-w-[170px] font-mono">
                  {user.phone_nun || user.phone_number || user.email}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider">
                {user.role || 'Farmer'}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Tabs Bar with URL query synchronization (?user-profile, ?security-password, ?language-theme, ?contacts) */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: 'user-profile' as SettingsTab, label: sp.tabUserProfile, icon: User },
            { id: 'security-password' as SettingsTab, label: sp.tabSecurity, icon: Lock },
            { id: 'language-theme' as SettingsTab, label: sp.tabLanguageTheme, icon: Palette },
            { id: 'contacts' as SettingsTab, label: sp.tabContacts, icon: Phone },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap shadow-md ${isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white keep-white shadow-emerald-500/30 scale-[1.02] border border-emerald-400/50'
                  : 'glass-panel text-text-secondary hover:text-text-main hover:bg-surface/60 border border-border-light backdrop-blur-xl'
                  }`}
              >
                <Icon size={17} className={isActive ? 'text-white keep-white' : 'text-emerald-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* SECTION 1: USER PROFILE & FARM LOCATION (Transparent Glass Card Design) */}
        {activeTab === 'user-profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Left Column: All User Details (except farm location) */}
            <div className="lg:col-span-1 h-full rounded-2xl glass-panel p-6 sm:p-7 flex flex-col shadow-xl border border-border-light relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent pointer-events-none" />

              {/* Avatar & Identity Header */}
              <div className="flex flex-col items-center text-center relative">
                {/* Hidden File Input for Avatar Upload */}
                <input
                  type="file"
                  ref={avatarFileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarFileChange}
                />

                <div className="relative mt-2 mb-3.5 group">
                  <div
                    onClick={() => !uploadingAvatar && avatarFileInputRef.current?.click()}
                    className={`w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-1 shadow-2xl shadow-emerald-500/25 cursor-pointer relative overflow-hidden group-hover:ring-4 group-hover:ring-emerald-400/40 transition-all ${uploadingAvatar ? 'opacity-70 pointer-events-none' : ''
                      }`}
                    title={sp.profile.changeAvatarTooltip}
                  >
                    <div className="w-full h-full rounded-full bg-slate-950/90 overflow-hidden flex items-center justify-center text-white text-2xl font-black relative">
                      {user?.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username || 'User Profile'}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span>{(user?.username || user?.email || 'U').charAt(0).toUpperCase()}</span>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-extrabold transition-opacity backdrop-blur-xs">
                        <Camera size={16} className="text-white mb-0.5" />
                        <span>{sp.profile.uploadBadge}</span>
                      </div>

                      {/* Loading Spinner */}
                      {uploadingAvatar && (
                        <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                          <span className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Camera Badge Button */}
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-400 border-2 border-slate-950 flex items-center justify-center text-slate-950 shadow-md cursor-pointer transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                    title={sp.profile.uploadPhotoTooltip}
                  >
                    <Camera size={13} className="text-slate-950" />
                  </button>
                </div>

                {user?.avatar_url && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={uploadingAvatar}
                    className="text-[11px] font-bold text-rose-400 hover:text-rose-300 -mt-1 mb-2 hover:underline cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {sp.profile.removePhotoBtn}
                  </button>
                )}

                <h2 className="text-lg font-black text-text-main m-0 mb-1">
                  {user?.username || (loadingUser ? 'Loading...' : 'User')}
                </h2>
                <p className="text-xs text-text-secondary font-semibold m-0 mb-3 flex items-center gap-1.5">
                  <Mail size={13} className="text-emerald-400" />
                  <span>{user?.email || '---'}</span>
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    {user?.role || 'Farmer'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold glass-surface text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                    <Activity size={12} />
                    <span>{user?.isactive !== false ? sp.profile.activeAccount : 'Inactive'}</span>
                  </span>
                </div>
              </div>

              {/* Editable User Account Details Form */}
              <form onSubmit={handleUpdateUserDetails} className="w-full flex-1 flex flex-col gap-4 pt-4 border-t border-border-subtle text-left">
                {/* Username / Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    {sp.profile.usernameLabel}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="Dr. M. Swaminathan"
                        readOnly={!isEditingUsername}
                        className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-inner pr-9 ${isEditingUsername
                          ? 'glass-input border-2 border-emerald-500 text-text-main focus:outline-none ring-2 ring-emerald-500/25'
                          : 'glass-surface border border-border-light text-text-main cursor-default select-all'
                          }`}
                        disabled={savingProfile || loadingUser}
                        autoFocus={isEditingUsername}
                      />
                      <User className="absolute right-3 top-2.5 text-text-secondary pointer-events-none" size={16} />
                    </div>

                    {!isEditingUsername ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingUsername(true)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white keep-white font-black text-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-md"
                      >
                        {sp.profile.change}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setUsernameInput(user?.username || '');
                          setIsEditingUsername(false);
                        }}
                        className="px-3 py-2 rounded-xl glass-surface border border-border-light text-text-secondary text-xs font-bold transition-all cursor-pointer active:scale-95 hover:text-text-main"
                      >
                        {sp.profile.cancel}
                      </button>
                    )}
                  </div>
                </div>

                {/* Registered Email Address */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    {sp.profile.emailLabel}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      className="w-full px-3.5 py-2 rounded-xl glass-surface border border-border-subtle text-text-main text-xs sm:text-sm font-mono cursor-pointer hover:border-emerald-500/50 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner pr-9"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      title={sp.profile.emailTooltip}
                    />
                    <Mail className="absolute right-3 top-2.5 text-text-secondary pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Mobile Phone Number */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    {sp.profile.phoneLabel}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      maxLength={10}
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2 rounded-xl glass-surface border border-border-light text-text-main text-xs sm:text-sm font-mono font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner pr-9"
                      disabled={savingProfile || loadingUser}
                    />
                    <Phone className="absolute right-3 top-2.5 text-text-secondary pointer-events-none" size={16} />
                  </div>
                  <span className="text-[11px] text-text-secondary font-medium mt-1 block">
                    {sp.profile.phoneHelp}
                  </span>
                </div>

                {/* Account Meta Summary (Non-Location) */}
                <div className="space-y-2.5 pt-3 border-t border-border-subtle">
                  <div className="flex justify-between items-center text-xs px-1">
                    <span className="text-text-secondary font-medium flex items-center gap-1.5">
                      <Calendar size={14} className="text-emerald-500 dark:text-emerald-400" />
                      <span>{sp.profile.joinedDate}</span>
                    </span>
                    <span className="font-extrabold text-text-main">
                      {formatMemberDate(user?.createdAt)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs px-1">
                    <span className="text-text-secondary font-medium flex items-center gap-1.5">
                      <Shield size={14} className="text-emerald-500 dark:text-emerald-400" />
                      <span>{sp.profile.accountStatus}</span>
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {sp.profile.verified}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs px-1">
                    <span className="text-text-secondary font-medium flex items-center gap-1.5">
                      <Globe size={14} className="text-emerald-500 dark:text-emerald-400" />
                      <span>{sp.profile.defaultLanguage}</span>
                    </span>
                    <span className="font-extrabold text-text-main uppercase">
                      {user?.language || locale}
                    </span>
                  </div>
                </div>

                {/* Save User Details Button (Enabled ONLY when fields differ from loaded API values) */}
                <div className="pt-2 mt-auto">
                  <button
                    type="submit"
                    disabled={!isUserDetailsDirty || savingProfile || loadingUser}
                    className={`w-full py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${isUserDetailsDirty && !savingProfile && !loadingUser
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white keep-white shadow-emerald-500/25 cursor-pointer active:scale-98'
                      : 'bg-slate-300/40 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50 shadow-none'
                      }`}
                    title={
                      !isUserDetailsDirty
                        ? sp.profile.noChanges
                        : ''
                    }
                  >
                    <Save size={16} />
                    <span>
                      {savingProfile
                        ? sp.profile.savingProfileBtn
                        : sp.profile.saveUserDetails}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Farm Location Only (Transparent Glass Panel) */}
            <div className="lg:col-span-2 h-full rounded-2xl glass-panel p-6 sm:p-8 flex flex-col gap-6 shadow-xl border border-border-light">
              <div className="border-b border-border-subtle pb-4">
                <h2 className="text-lg font-black text-text-main m-0 flex items-center gap-2">
                  <MapPin className="text-emerald-400" size={20} />
                  <span>{sp.location.headerTitle}</span>
                </h2>
                <p className="text-xs text-text-secondary font-medium mt-1 mb-0">
                  {sp.location.headerDesc}
                </p>
              </div>

              {profileFeedback && (
                <div
                  className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${profileFeedback.type === 'success'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-300'
                    }`}
                >
                  {profileFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{profileFeedback.message}</span>
                </div>
              )}

              <div className="flex-1 flex flex-col gap-6">
                <form onSubmit={handleUpdateFarmLocation} className="flex flex-col gap-6">
                  {/* Farm Location (State, District, City/Village via common LocationSelectorFields) */}
                  <LocationSelectorFields
                    location={location}
                    isTamil={isTamil}
                    disabled={savingProfile || loadingUser}
                  />

                  {/* Farm Street Address */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
                        {sp.location.fieldAddressLabel}
                      </label>
                      <span className="text-[11px] text-text-muted font-mono font-bold">
                        {addressInput.length}/40
                      </span>
                    </div>
                    <div className="relative">
                      <Input.TextArea
                        rows={2}
                        maxLength={40}
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value.slice(0, 40))}
                        placeholder={sp.location.fieldAddressPlaceholder}
                        className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold glass-surface border border-border-light text-text-main focus:border-emerald-500"
                        disabled={savingProfile || loadingUser}
                      />
                    </div>
                    <span className="text-[11px] text-text-secondary font-medium mt-1.5 block">
                      {sp.location.fieldAddressHelp}
                    </span>
                  </div>

                  {/* Submit / Save Farm Location Button (Enabled ONLY when fields differ from loaded API values) */}
                  <div className="pt-2 flex justify-start">
                    <button
                      type="submit"
                      disabled={!isLocationDirty || savingProfile || loadingUser}
                      className={`px-7 py-3 rounded-xl font-black text-sm flex items-center gap-2.5 shadow-xl transition-all ${isLocationDirty && !savingProfile && !loadingUser
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white keep-white shadow-emerald-500/25 cursor-pointer active:scale-98'
                        : 'bg-slate-300/40 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50 shadow-none'
                        }`}
                      title={
                        !isLocationDirty
                          ? sp.profile.noChanges
                          : ''
                      }
                    >
                      <Save size={17} />
                      <span>
                        {savingProfile
                          ? sp.location.savingLocationBtn
                          : sp.location.saveLocationBtn}
                      </span>
                    </button>
                  </div>
                </form>

                {/* Danger Zone: Delete Account */}
                <div className="mt-auto pt-6 border-t border-rose-500/25">
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] p-4 sm:p-5 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-black text-rose-600 dark:text-rose-400">
                          {sp.dangerZone.title}
                        </div>
                        <p className="text-xs text-text-secondary font-medium mt-1 mb-0 leading-relaxed">
                          {sp.dangerZone.descPrefix}{expectedDeletePhrase}{sp.dangerZone.descSuffix}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                      <input
                        type="text"
                        value={deleteConfirmInput}
                        onChange={(e) => setDeleteConfirmInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (deleteConfirmInput.trim() === expectedDeletePhrase && !loadingUser && !deletingAccount) {
                              setDeleteModalOpen(true);
                            }
                          }
                        }}
                        placeholder={expectedDeletePhrase}
                        disabled={loadingUser || deletingAccount}
                        className="flex-1 px-4 py-2.5 rounded-xl glass-surface border border-rose-500/30 text-text-main text-xs sm:text-sm font-mono focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
                      />
                      <HoldButton
                        doneLabel={sp.dangerZone.deleted}
                        icon={<Trash2 size={15} />}
                        backgroundColor="#b91c1c"
                        fillColor="#ef4444"
                        textColor="#ffffff"
                        fillTextColor="#ffffff"
                        size="md"
                        radius={14}
                        fillDirection="right"
                        holdTime={2000}
                        releaseTime={200}
                        pressScale={0.97}
                        wave
                        waveAmplitude={6}
                        glow
                        resetAfter={1200}
                        disabled={
                          loadingUser ||
                          deletingAccount ||
                          deleteConfirmInput.trim() !== expectedDeletePhrase
                        }
                        onHold={() => setDeleteModalOpen(true)}
                        onTap={() => message.info(sp.dangerZone.holdTapNotice)}
                        className="keep-white whitespace-nowrap shrink-0"
                      >
                        {sp.dangerZone.holdToDelete}
                      </HoldButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: CHANGE PASSWORD (Transparent Glass Card Design) */}
        {activeTab === 'security-password' && (
          <div className="max-w-3xl rounded-2xl glass-panel p-6 sm:p-8 flex flex-col gap-6 shadow-xl border border-border-light">
            <div className="border-b border-border-subtle pb-4">
              <h2 className="text-lg font-black text-text-main m-0 flex items-center gap-2">
                <KeyRound className="text-emerald-400" size={20} />
                <span>{sp.security.changePasswordTitle}</span>
              </h2>
              <p className="text-xs text-text-secondary font-medium mt-1 mb-0">
                {sp.security.changePasswordSubtitle}
              </p>
            </div>

            {passwordFeedback && (
              <div
                className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${passwordFeedback.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-300'
                  }`}
              >
                {passwordFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              {/* Current Password Field */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                  {sp.security.currentPassword}
                </label>
                <div className="relative max-w-md">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl glass-surface border border-border-light text-text-main text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-colors shadow-inner pr-11"
                    disabled={savingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3.5 top-3 text-text-secondary hover:text-text-main transition-colors cursor-pointer"
                    aria-label="Toggle Current Password Visibility"
                  >
                    {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password Field */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                  {sp.security.newPassword}
                </label>
                <div className="relative max-w-md">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl glass-surface border border-border-light text-text-main text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-colors shadow-inner pr-11"
                    disabled={savingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3.5 top-3 text-text-secondary hover:text-text-main transition-colors cursor-pointer"
                    aria-label="Toggle New Password Visibility"
                  >
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Field with Eye Icon */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                  {sp.security.confirmPassword}
                </label>
                <div className="relative max-w-md">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 rounded-xl glass-surface border border-border-light text-text-main text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-colors shadow-inner pr-11"
                    disabled={savingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3.5 top-3 text-text-secondary hover:text-text-main transition-colors cursor-pointer"
                    aria-label="Toggle Confirm Password Visibility"
                  >
                    {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 flex justify-start">
                <button
                  type="submit"
                  disabled={savingPassword || !currentPassword || !newPassword}
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white keep-white font-black text-sm flex items-center gap-2.5 shadow-xl shadow-emerald-500/25 transition-all cursor-pointer active:scale-98"
                >
                  <Lock size={17} />
                  <span>{savingPassword ? sp.security.updatingPasswordBtn : sp.security.changePasswordBtn}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SECTION 3: LANGUAGE AND THEME (Transparent Glass Card Design) */}
        {activeTab === 'language-theme' && (
          <div className="max-w-4xl rounded-2xl glass-panel p-6 sm:p-8 flex flex-col gap-8 shadow-xl border border-border-light">
            {/* Header: Language and Theme */}
            <div className="border-b border-border-subtle pb-4">
              <h2 className="text-lg font-black text-text-main m-0 flex items-center gap-2">
                <Palette className="text-emerald-400" size={20} />
                <span>{sp.preferences.themeAndLanguage}</span>
              </h2>
              <p className="text-xs text-text-secondary font-medium mt-1 mb-0">
                {sp.preferences.themeAndLanguageDesc}
              </p>
            </div>

            {/* Sub-section 1: Theme Selection */}
            <div>
              <div className="mb-3.5">
                <h3 className="text-sm font-bold text-text-main m-0 flex items-center gap-2">
                  <Sun className="text-emerald-400" size={16} />
                  <span>{sp.preferences.themeTitle}</span>
                </h3>
                <span className="text-xs text-text-secondary font-medium">
                  {sp.preferences.themeSubtitle}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                {/* Dark Theme Option */}
                <div
                  onClick={() => handleThemeChange('dark')}
                  className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${theme === 'dark'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                    : 'border-border-light glass-card hover:border-emerald-500/50 hover:bg-surface/60'
                    }`}
                >
                  {theme === 'dark' && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-md">
                      <Check size={14} />
                    </div>
                  )}

                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-950/80 text-cyan-400 flex items-center justify-center border border-white/10 shadow-inner">
                      <Moon size={24} />
                    </div>
                    <div>
                      <h4
                        className={`text-base font-black m-0 ${theme === 'dark' ? 'text-white' : 'text-text-main'
                          }`}
                      >
                        {sp.preferences.darkTheme}
                      </h4>
                      <span className="text-xs font-medium text-text-secondary">
                        {sp.preferences.darkThemeDesc}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Light Theme Option */}
                <div
                  onClick={() => handleThemeChange('light')}
                  className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${theme === 'light'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                    : 'border-border-light glass-card hover:border-emerald-500/50 hover:bg-surface/60'
                    }`}
                >
                  {theme === 'light' && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-md">
                      <Check size={14} />
                    </div>
                  )}

                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-amber-50/90 text-amber-500 flex items-center justify-center border border-amber-200 shadow-sm">
                      <Sun size={24} />
                    </div>
                    <div>
                      <h4
                        className={`text-base font-black m-0 ${theme === 'light' ? 'text-slate-950' : 'text-text-main'
                          }`}
                      >
                        {sp.preferences.lightTheme}
                      </h4>
                      <span className="text-xs font-medium text-text-secondary">
                        {sp.preferences.lightThemeDesc}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-section 2: Language Selection */}
            <div className="pt-6 border-t border-border-subtle">
              <div className="mb-3.5">
                <h3 className="text-sm font-bold text-text-main m-0 flex items-center gap-2">
                  <Globe className="text-emerald-400" size={16} />
                  <span>{sp.preferences.langTitle}</span>
                </h3>
                <span className="text-xs text-text-secondary font-medium">
                  {sp.preferences.langSubtitle}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                {/* English Option */}
                <div
                  onClick={() => handleLanguageChange('en')}
                  className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${locale === 'en'
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                    : 'border-border-light glass-card hover:border-emerald-500/50 hover:bg-surface/60'
                    }`}
                >
                  {locale === 'en' && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-md">
                      <Check size={14} />
                    </div>
                  )}

                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 font-black text-base flex items-center justify-center border border-cyan-500/30">
                      EN
                    </div>
                    <div>
                      <h4 className="text-base font-black text-text-main m-0">
                        {sp.preferences.englishLabel}
                      </h4>
                      <span className="text-xs text-text-secondary font-medium">
                        {sp.preferences.englishDesc}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tamil Option */}
                <div
                  onClick={() => handleLanguageChange('ta')}
                  className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${locale === 'ta'
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                    : 'border-border-light glass-card hover:border-emerald-500/50 hover:bg-surface/60'
                    }`}
                >
                  {locale === 'ta' && (
                    <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-black shadow-md">
                      <Check size={14} />
                    </div>
                  )}

                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 font-black text-base flex items-center justify-center border border-emerald-500/30">
                      தமிழ்
                    </div>
                    <div>
                      <h4 className="text-base font-black text-text-main m-0">
                        {sp.preferences.tamilLabel}
                      </h4>
                      <span className="text-xs text-text-secondary font-medium">
                        {sp.preferences.tamilDesc}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: OFFICIAL CONTACTS DIRECTORY */}
        {activeTab === 'contacts' && (
          <SettingsContactsSection />
        )}
      </div>

      {/* Change Password OTP Verification Modal Popup */}
      <OtpVerificationModal
        open={passOtpOpen}
        email={passOtpEmail}
        title={sp.security.otpModalTitle}
        subtitle={sp.security.otpModalSubtitle}
        confirmLabel={sp.security.otpModalConfirm}
        loading={passOtpLoading}
        resending={passOtpResending}
        errorMsg={passOtpError}
        secondsLeft={passOtpSeconds}
        status={passOtpStatus}
        onStatusChange={setPassOtpStatus}
        onVerify={handleVerifyPasswordOtp}
        onResend={handleResendPasswordOtp}
        onCancel={() => {
          setPassOtpOpen(false);
          setPassOtpError(null);
        }}
        isTamil={isTamil}
        previewUrl={passOtpPreviewUrl}
      />

      {/* Permanent Account Deletion Confirmation Popup */}
      <Modal
        open={deleteModalOpen}
        onCancel={() => {
          if (!deletingAccount) setDeleteModalOpen(false);
        }}
        onOk={handleDeleteAccount}
        confirmLoading={deletingAccount}
        centered
        title={
          <div className="flex items-center gap-2 text-rose-500 font-black">
            <AlertTriangle size={18} />
            <span>
              {sp.dangerZone.modalTitle}
            </span>
          </div>
        }
        okText={sp.dangerZone.modalOk}
        cancelText={sp.dangerZone.modalCancel}
        okButtonProps={{ danger: true, className: 'font-bold rounded-xl' }}
        cancelButtonProps={{ disabled: deletingAccount, className: 'font-bold rounded-xl' }}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 m-0 py-2 leading-relaxed">
          {sp.dangerZone.modalDesc}
        </p>
      </Modal>
    </div>
  );
}
