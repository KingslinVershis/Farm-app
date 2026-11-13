'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Trash2,
  AlertTriangle,
  Camera,
  Upload,
} from '@/components/icons/FlaticonIcons';
import { Input, Modal, message } from 'antd';
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
  isactive: boolean;
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

  const resetFnRef = useRef<() => void>(() => {});
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

  // Avatar upload logic via backend API /api/user/avatar
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      message.error(isTamil ? 'படக் கோப்புகளை மட்டுமே பதிவேற்ற முடியும்' : 'Only image files are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      message.error(isTamil ? 'படத்தின் அளவு 5MBக்கு குறைவாக இருக்க வேண்டும்' : 'Image size must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    const hideLoading = message.loading(isTamil ? 'படம் பதிவேற்றப்படுகிறது...' : 'Uploading avatar...', 0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to upload avatar');
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
      } catch {}

      message.success(
        isTamil
          ? 'சுயவிவரப் படம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!'
          : 'Profile picture updated successfully!'
      );
    } catch (err: any) {
      console.error('[Settings] Avatar upload error:', err);
      message.error(err?.message || (isTamil ? 'படத்தை பதிவேற்ற முடியவில்லை' : 'Failed to upload avatar'));
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
    const hideLoading = message.loading(isTamil ? 'படம் நீக்கப்படுகிறது...' : 'Removing avatar...', 0);
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
      } catch {}

      message.success(isTamil ? 'சுயவிவரப் படம் நீக்கப்பட்டது' : 'Avatar removed successfully');
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
        message: isTamil ? 'பயனர் பெயரை உள்ளிடவும்' : 'Please enter a valid username',
      });
      return;
    }

    if (usernameInput.trim().length < 2) {
      setProfileFeedback({
        type: 'error',
        message: isTamil
          ? 'பயனர் பெயர் குறைந்தபட்சம் 2 எழுத்துகள் இருக்க வேண்டும்'
          : 'Username must be at least 2 characters',
      });
      return;
    }

    const cleanPhone = phoneInput.replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 10) {
      setProfileFeedback({
        type: 'error',
        message: isTamil
          ? 'செல்லுபடியாகும் 10 இலக்க தொலைபேசி எண்ணை உள்ளிடவும்'
          : 'Please enter a valid 10-digit phone number',
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
        throw new Error(data?.error || 'Failed to update user details');
      }

      const updatedUser: UserProfile = {
        ...user!,
        ...(data?.user || payload),
      };

      setUser(updatedUser);

      try {
        localStorage.setItem('farmhub_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('farmhub_user_updated', { detail: updatedUser }));
      } catch {}

      setProfileFeedback({
        type: 'success',
        message: isTamil
          ? 'பயனர் விவரங்கள் வெற்றிகரமாக சேமிக்கப்பட்டன!'
          : 'User details saved successfully!',
      });
      message.success(
        isTamil
          ? 'பயனர் விவரங்கள் சேமிக்கப்பட்டன!'
          : 'User details saved successfully!'
      );
      setIsEditingUsername(false);
      setTimeout(() => setProfileFeedback(null), 4000);
    } catch (err: any) {
      setProfileFeedback({
        type: 'error',
        message: err?.message || 'Error updating user details',
      });
      message.error(err?.message || (isTamil ? 'சுயவிவரத்தை புதுப்பிக்க முடியவில்லை' : 'Failed to update profile'));
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
        throw new Error(data?.error || 'Failed to update farm location');
      }

      const updatedUser: UserProfile = {
        ...user!,
        ...(data?.user || payload),
      };

      setUser(updatedUser);

      try {
        localStorage.setItem('farmhub_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('farmhub_user_updated', { detail: updatedUser }));
      } catch {}

      setProfileFeedback({
        type: 'success',
        message: isTamil
          ? 'பண்ணை இருப்பிட விவரங்கள் வெற்றிகரமாக சேமிக்கப்பட்டன!'
          : 'Farm location details saved successfully!',
      });
      message.success(
        isTamil
          ? 'பண்ணை இருப்பிடம் சேமிக்கப்பட்டது!'
          : 'Farm location saved successfully!'
      );
      setTimeout(() => setProfileFeedback(null), 4000);
    } catch (err: any) {
      setProfileFeedback({
        type: 'error',
        message: err?.message || 'Error updating farm location',
      });
      message.error(err?.message || (isTamil ? 'இருப்பிடத்தை புதுப்பிக்க முடியவில்லை' : 'Failed to update location'));
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
      message.error(isTamil ? 'தற்போதைய கடவுச்சொல்லை உள்ளிடவும்' : 'Please enter your current password');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({
        type: 'error',
        message: isTamil
          ? 'புதிய கடவுச்சொல் குறைந்தபட்சம் 6 எழுத்துகள் இருக்க வேண்டும்'
          : 'New password must be at least 6 characters',
      });
      message.error(
        isTamil
          ? 'புதிய கடவுச்சொல் குறைந்தபட்சம் 6 எழுத்துகள் இருக்க வேண்டும்'
          : 'New password must be at least 6 characters'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: isTamil ? 'புதிய கடவுச்சொற்கள் பொருந்தவில்லை' : 'New passwords do not match',
      });
      message.error(isTamil ? 'புதிய கடவுச்சொற்கள் பொருந்தவில்லை' : 'New passwords do not match');
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

      if (data?.otpRequired) {
        setPassOtpEmail(data.email || user?.email || '');
        setPassOtpSeconds(data.expiresInSeconds || 300);
        setPassOtpPreviewUrl(data.previewUrl || null);
        setPassOtpError(null);
        setPassOtpStatus('idle');
        setPassOtpOpen(true);
        message.success(
          isTamil
            ? '6 இலக்க சரிபார்ப்பு குறியீடு உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்டது!'
            : '6-digit verification code sent to your registered email!'
        );
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({
        type: 'success',
        message: isTamil ? 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!' : 'Password changed successfully!',
      });
      message.success(
        isTamil ? 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!' : 'Password changed successfully!'
      );
      setTimeout(() => setPasswordFeedback(null), 4000);
    } catch (err: any) {
      setPasswordFeedback({
        type: 'error',
        message: err?.message || 'Error updating password',
      });
      message.error(err?.message || (isTamil ? 'கடவுச்சொல்லை மாற்ற முடியவில்லை' : 'Error updating password'));
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
      message.success(
        isTamil
          ? 'புதிய 6 இலக்க குறியீடு உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்டது!'
          : 'A new 6-digit verification code was sent!'
      );
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
        setPassOtpError(
          data?.error ||
            (isTamil ? 'தவறான சரிபார்ப்பு குறியீடு.' : 'Invalid verification code.')
        );
        return;
      }

      setPassOtpStatus('success');
      const okMsg = isTamil
        ? 'கடவுச்சொல் மாற்றப்பட்டது! பாதுகாப்பு காரணத்திற்காக அனைத்து சாதனங்களிலிருந்தும் வெளியேற்றப்பட்டீர்கள்.'
        : 'Password updated! All logged-in sessions were signed out for security purposes.';
      message.success(okMsg, 4);

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
        throw new Error(data?.error || 'Failed to delete account');
      }

      setDeleteModalOpen(false);
      message.success(
        isTamil
          ? 'உங்கள் கணக்கு நிரந்தரமாக நீக்கப்பட்டது.'
          : 'Your account has been permanently deleted.',
        3
      );
      clearClientSessionStorage();
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/signin';
        }
      }, 900);
    } catch (err: any) {
      message.error(err?.message || (isTamil ? 'கணக்கை நீக்க முடியவில்லை' : 'Failed to delete account'));
    } finally {
      setDeletingAccount(false);
    }
  };

  // 5. Handle Theme update (persisted via ThemeProvider -> /api/user/theme)
  const handleThemeChange = (newTheme: Theme) => {
    if (theme === newTheme && user?.theme === newTheme) return;

    setTheme(newTheme);
    setUser((prev) => (prev ? { ...prev, theme: newTheme } : null));
    message.success(
      isTamil
        ? `${newTheme === 'dark' ? 'இருண்ட தீம் (Dark Theme)' : 'ஒளிர் தீம் (Light Theme)'} சேமிக்கப்பட்டது!`
        : `${newTheme === 'dark' ? 'Dark Theme' : 'Light Theme'} applied & saved to account!`
    );
  };

  // 6. Handle Language update (persisted via LanguageProvider -> /api/user/language)
  const handleLanguageChange = (newLang: 'en' | 'ta') => {
    if (locale === newLang && user?.language === newLang) return;

    setLocale(newLang);
    setUser((prev) => (prev ? { ...prev, language: newLang } : null));
    message.success(
      newLang === 'ta'
        ? 'மொழி வெற்றிகரமாக தமிழாக மாற்றப்பட்டது!'
        : 'Language successfully updated to English!'
    );
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
      {/* Main Content Area */}
      <div className="relative z-10 max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 flex flex-col gap-6 fade-in">
        {/* Page Header Banner (Transparent Glassmorphic Panel) */}
        <div className="rounded-2xl glass-panel p-5 sm:p-7 shadow-xl border border-border-light flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold mb-2.5 border border-emerald-500/30">
              <Sparkles size={14} />
              <span>{isTamil ? 'பயனர் கணக்கு & பண்ணை மேலாண்மை' : 'User Account & Farm Preferences'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-main tracking-tight m-0 mb-1.5">
              {isTamil ? 'கணக்கு அமைப்புகள் & விருப்பத்தேர்வுகள்' : 'Account Settings & Preferences'}
            </h1>
            <p className="text-text-secondary text-xs sm:text-sm m-0 max-w-2xl leading-relaxed font-medium">
              {isTamil
                ? 'உங்கள் சுயவிவர விவரங்களை நிர்வகிக்கவும், பண்ணை இருப்பிடத்தை அமைக்கவும், கடவுச்சொல்லை மாற்றவும் மற்றும் காட்சி தீமை அமைக்கவும்.'
                : 'Manage your profile details, farm location, contact number, update password, and customize UI theme & language.'}
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
                  {user.username || (isTamil ? 'விவசாயி' : 'Farmer')}
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
            { id: 'user-profile' as SettingsTab, label: isTamil ? 'சுயவிவரம் & இருப்பிடம்' : 'User Profile & Farm Location', icon: User },
            { id: 'security-password' as SettingsTab, label: isTamil ? 'கடவுச்சொல் & பாதுகாப்பு' : 'Security & Password', icon: Lock },
            { id: 'language-theme' as SettingsTab, label: isTamil ? 'மொழி மற்றும் தீம்' : 'Language and Theme', icon: Palette },
            { id: 'contacts' as SettingsTab, label: isTamil ? 'அதிகாரப்பூர்வ தொடர்புகள்' : 'Official Contacts', icon: Phone },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap shadow-md ${
                  isActive
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
                    className={`w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-1 shadow-2xl shadow-emerald-500/25 cursor-pointer relative overflow-hidden group-hover:ring-4 group-hover:ring-emerald-400/40 transition-all ${
                      uploadingAvatar ? 'opacity-70 pointer-events-none' : ''
                    }`}
                    title={isTamil ? 'சுயவிவரப் படத்தை மாற்ற கிளிக் செய்யவும்' : 'Click to upload or change profile picture'}
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
                        <span>{isTamil ? 'மாற்று' : 'Upload'}</span>
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
                    title={isTamil ? 'படம் பதிவேற்று' : 'Upload photo'}
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
                    {isTamil ? 'படத்தை நீக்கு' : 'Remove photo'}
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
                    <span>{user?.isactive !== false ? (isTamil ? 'செயலில் உள்ளது' : 'Active Account') : 'Inactive'}</span>
                  </span>
                </div>
              </div>

              {/* Editable User Account Details Form */}
              <form onSubmit={handleUpdateUserDetails} className="w-full flex-1 flex flex-col gap-4 pt-4 border-t border-border-subtle text-left">
                {/* Username / Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
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
                        className={`w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-inner pr-9 ${
                          isEditingUsername
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
                        {isTamil ? 'மாற்று' : 'Change'}
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
                        {isTamil ? 'ரத்து' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Registered Email Address */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    {isTamil ? 'மின்னஞ்சல் முகவரி' : 'Registered Email Address'}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      className="w-full px-3.5 py-2 rounded-xl glass-surface border border-border-subtle text-text-main text-xs sm:text-sm font-mono cursor-pointer hover:border-emerald-500/50 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner pr-9"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      title={isTamil ? 'மின்னஞ்சலைத் தேர்ந்தெடுக்க கிளிக் செய்யவும்' : 'Click to select or copy email'}
                    />
                    <Mail className="absolute right-3 top-2.5 text-text-secondary pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Mobile Phone Number */}
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    {isTamil ? 'தொலைபேசி எண் (Mobile Number)' : 'Mobile Phone Number'}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      maxLength={10}
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder={isTamil ? 'எ.கா. 9876543210' : 'e.g. 9876543210'}
                      className="w-full px-3.5 py-2 rounded-xl glass-surface border border-border-light text-text-main text-xs sm:text-sm font-mono font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner pr-9"
                      disabled={savingProfile || loadingUser}
                    />
                    <Phone className="absolute right-3 top-2.5 text-text-secondary pointer-events-none" size={16} />
                  </div>
                  <span className="text-[11px] text-text-secondary font-medium mt-1 block">
                    {isTamil
                      ? '10 இலக்க மொபைல் எண் (SMS அறிவிப்புகளுக்கு).'
                      : '10-digit mobile number for SMS advisory alerts.'}
                  </span>
                </div>

                {/* Account Meta Summary (Non-Location) */}
                <div className="space-y-2.5 pt-3 border-t border-border-subtle">
                  <div className="flex justify-between items-center text-xs px-1">
                    <span className="text-text-secondary font-medium flex items-center gap-1.5">
                      <Calendar size={14} className="text-emerald-500 dark:text-emerald-400" />
                      <span>{isTamil ? 'பதிவு செய்த நாள்' : 'Joined Date'}</span>
                    </span>
                    <span className="font-extrabold text-text-main">
                      {formatMemberDate(user?.createdAt)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs px-1">
                    <span className="text-text-secondary font-medium flex items-center gap-1.5">
                      <Shield size={14} className="text-emerald-500 dark:text-emerald-400" />
                      <span>{isTamil ? 'கணக்கு நிலை' : 'Account Status'}</span>
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {isTamil ? 'சரிபார்க்கப்பட்டது' : 'Verified'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs px-1">
                    <span className="text-text-secondary font-medium flex items-center gap-1.5">
                      <Globe size={14} className="text-emerald-500 dark:text-emerald-400" />
                      <span>{isTamil ? 'இயல்பு மொழி' : 'Default Language'}</span>
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
                    className={`w-full py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                      isUserDetailsDirty && !savingProfile && !loadingUser
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white keep-white shadow-emerald-500/25 cursor-pointer active:scale-98'
                        : 'bg-slate-300/40 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50 shadow-none'
                    }`}
                    title={
                      !isUserDetailsDirty
                        ? (isTamil ? 'மாற்றங்கள் எதுவும் இல்லை' : 'No changes made')
                        : ''
                    }
                  >
                    <Save size={16} />
                    <span>
                      {savingProfile
                        ? isTamil
                          ? 'சேமிக்கப்படுகிறது...'
                          : 'Saving...'
                        : isTamil
                        ? 'பயனர் விவரங்களைச் சேமி'
                        : 'Save User Details'}
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
                  <span>{isTamil ? 'பண்ணை இருப்பிட விவரங்கள்' : 'Farm Location Details'}</span>
                </h2>
                <p className="text-xs text-text-secondary font-medium mt-1 mb-0">
                  {isTamil
                    ? 'உங்கள் பண்ணையின் மாநிலம், மாவட்டம், கிராமம் மற்றும் தெரு முகவரியை அமைக்கவும்.'
                    : 'Manage your official farm location (State, District, City / Village & Street Address).'}
                </p>
              </div>

              {profileFeedback && (
                <div
                  className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${
                    profileFeedback.type === 'success'
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
                      {isTamil ? 'பண்ணை முகவரி (Farm Address)' : 'Farm Street Address'}
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
                      placeholder={
                        isTamil
                          ? 'எ.கா. 14, வடக்கு தெரு, கோவில்பட்டி'
                          : 'e.g. 14, North Street, Kovilpatti'
                      }
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold glass-surface border border-border-light text-text-main focus:border-emerald-500"
                      disabled={savingProfile || loadingUser}
                    />
                  </div>
                  <span className="text-[11px] text-text-secondary font-medium mt-1.5 block">
                    {isTamil
                      ? 'அதிகபட்சம் 40 எழுத்துகள் (கள முகவரி).'
                      : 'Maximum 40 characters for field location / mailing delivery.'}
                  </span>
                </div>

                {/* Submit / Save Farm Location Button (Enabled ONLY when fields differ from loaded API values) */}
                <div className="pt-2 flex justify-start">
                  <button
                    type="submit"
                    disabled={!isLocationDirty || savingProfile || loadingUser}
                    className={`px-7 py-3 rounded-xl font-black text-sm flex items-center gap-2.5 shadow-xl transition-all ${
                      isLocationDirty && !savingProfile && !loadingUser
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white keep-white shadow-emerald-500/25 cursor-pointer active:scale-98'
                        : 'bg-slate-300/40 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50 shadow-none'
                    }`}
                    title={
                      !isLocationDirty
                        ? (isTamil ? 'மாற்றங்கள் எதுவும் இல்லை' : 'No changes made')
                        : ''
                    }
                  >
                    <Save size={17} />
                    <span>
                      {savingProfile
                        ? isTamil
                          ? 'சேமிக்கப்படுகிறது...'
                          : 'Saving Location...'
                        : isTamil
                        ? 'இருப்பிடத்தைச் சேமி'
                        : 'Save Farm Location'}
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
                        {isTamil ? 'கணக்கை நிரந்தரமாக நீக்கு (Delete Account)' : 'Delete Account'}
                      </div>
                      <p className="text-xs text-text-secondary font-medium mt-1 mb-0 leading-relaxed">
                        {isTamil
                          ? `உங்கள் கணக்கு மற்றும் சேமிக்கப்பட்ட சாகுபடி திட்டங்களை நிரந்தரமாக நீக்க, கீழே "${expectedDeletePhrase}" என தட்டச்சு செய்யவும்.`
                          : `Once deleted, your account and all saved cultivation plans cannot be recovered. Type "${expectedDeletePhrase}" below to enable account deletion.`}
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
                      doneLabel={isTamil ? 'நீக்கப்பட்டது' : 'Deleted'}
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
                      onTap={() =>
                        message.info(
                          isTamil
                            ? 'கணக்கை நீக்க 2 வினாடிகள் அழுத்திப் பிடிக்கவும்.'
                            : 'Press and hold for 2 seconds to delete your account.'
                        )
                      }
                      className="keep-white whitespace-nowrap shrink-0"
                    >
                      {isTamil ? 'நீக்க அழுத்திப் பிடிக்கவும்' : 'Hold to delete'}
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
                <span>{isTamil ? 'கடவுச்சொல்லை மாற்றவும்' : 'Change Password'}</span>
              </h2>
              <p className="text-xs text-text-secondary font-medium mt-1 mb-0">
                {isTamil
                  ? 'உங்கள் தற்போதைய கடவுச்சொல்லை உள்ளிட்ட பின் புதிய வலுவான கடவுச்சொல்லை அமைக்கவும்.'
                  : 'Enter your current password followed by your new password to ensure maximum security.'}
              </p>
            </div>

            {passwordFeedback && (
              <div
                className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2.5 animate-fade-in ${
                  passwordFeedback.type === 'success'
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
                  {isTamil ? 'தற்போதைய கடவுச்சொல்' : 'Current Password'}
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
                  {isTamil ? 'புதிய கடவுச்சொல் (குறைந்தபட்சம் 6 எழுத்துகள்)' : 'New Password (min 6 characters)'}
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
                  {isTamil ? 'புதிய கடவுச்சொல்லை மீண்டும் உள்ளிடவும்' : 'Confirm New Password'}
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
                  <span>{savingPassword ? (isTamil ? 'மாற்றப்படுகிறது...' : 'Updating...') : isTamil ? 'கடவுச்சொல்லை மாற்று' : 'Update Password'}</span>
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
                <span>{isTamil ? 'மொழி மற்றும் தீம்' : 'Language and Theme'}</span>
              </h2>
              <p className="text-xs text-text-secondary font-medium mt-1 mb-0">
                {isTamil
                  ? 'உங்கள் காட்சி தீம் மற்றும் மொழியைத் தேர்ந்தெடுக்கவும். இவை உங்கள் கணக்கில் நேரடியாக சேமிக்கப்படும்.'
                  : 'Customize your visual theme and preferred system language. Preferences are instantly synced to your account.'}
              </p>
            </div>

            {/* Sub-section 1: Theme Selection */}
            <div>
              <div className="mb-3.5">
                <h3 className="text-sm font-bold text-text-main m-0 flex items-center gap-2">
                  <Sun className="text-emerald-400" size={16} />
                  <span>{isTamil ? 'தீம் தேர்வு (Theme Preferences)' : 'Theme Selection'}</span>
                </h3>
                <span className="text-xs text-text-secondary font-medium">
                  {isTamil ? 'இருண்ட அல்லது ஒளிர் இடைமுகத்தைத் தேர்ந்தெடுக்கவும்' : 'Switch between Dark Cosmos and Daylight crisp theme'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                {/* Dark Theme Option */}
                <div
                  onClick={() => handleThemeChange('dark')}
                  className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    theme === 'dark'
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
                        className={`text-base font-black m-0 ${
                          theme === 'dark' ? 'text-white' : 'text-text-main'
                        }`}
                      >
                        {isTamil ? 'இருண்ட தீம் (Dark Theme)' : 'Dark Cosmos Theme'}
                      </h4>
                      <span className="text-xs font-medium text-text-secondary">
                        {isTamil ? 'குறைந்த ஒளி, ஒளிரும் பச்சை நிறங்கள்' : 'Deep obsidian slate & emerald accents'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Light Theme Option */}
                <div
                  onClick={() => handleThemeChange('light')}
                  className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    theme === 'light'
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
                        className={`text-base font-black m-0 ${
                          theme === 'light' ? 'text-slate-950' : 'text-text-main'
                        }`}
                      >
                        {isTamil ? 'ஒளிர் தீம் (Light Theme)' : 'Daylight Emerald Theme'}
                      </h4>
                      <span className="text-xs font-medium text-text-secondary">
                        {isTamil ? 'பகல் நேர தெளிவான பார்வை' : 'Clean daytime high-contrast clarity'}
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
                  <span>{isTamil ? 'மொழி விருப்பத்தேர்வு (Language Selection)' : 'Language Selection'}</span>
                </h3>
                <span className="text-xs text-text-secondary font-medium">
                  {isTamil
                    ? 'முழு அமைப்பின் மொழியைத் தேர்ந்தெடுக்கவும் (தமிழ் அல்லது ஆங்கிலம்)'
                    : 'Choose your application language. All modules, reports, and alerts will reflect this language.'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                {/* English Option */}
                <div
                  onClick={() => handleLanguageChange('en')}
                  className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    locale === 'en'
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
                        English (Global)
                      </h4>
                      <span className="text-xs text-text-secondary font-medium">
                        Default international agricultural & agronomic terminology
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tamil Option */}
                <div
                  onClick={() => handleLanguageChange('ta')}
                  className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between overflow-hidden group ${
                    locale === 'ta'
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
                        தமிழ் (Tamil)
                      </h4>
                      <span className="text-xs text-text-secondary font-medium">
                        காவிரி டெல்டா மற்றும் தமிழ்நாடு விவசாயிகளுக்கான நேரடி தமிழ் பதிப்பு
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
        title={isTamil ? 'கடவுச்சொல் மாற்றத்தை உறுதிப்படுத்து' : 'Confirm Password Change'}
        subtitle={
          isTamil
            ? 'பாதுகாப்பு உறுதிப்படுத்தலுக்கு, உங்கள் பதிவுசெய்த மின்னஞ்சலுக்கு அனுப்பப்பட்ட 6 இலக்க குறியீட்டை உள்ளிடவும்.'
            : 'For your security, enter the 6-digit verification code sent to your email address to apply your new password.'
        }
        confirmLabel={isTamil ? 'சரிபார்த்து கடவுச்சொல்லை மாற்று' : 'Verify & Update Password'}
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
              {isTamil ? 'கணக்கை நிரந்தரமாக நீக்கவா?' : 'Confirm Permanent Account Deletion'}
            </span>
          </div>
        }
        okText={isTamil ? 'ஆம், கணக்கை நீக்கு' : 'Yes, Delete Permanently'}
        cancelText={isTamil ? 'ரத்து' : 'Cancel'}
        okButtonProps={{ danger: true, className: 'font-bold rounded-xl' }}
        cancelButtonProps={{ disabled: deletingAccount, className: 'font-bold rounded-xl' }}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 m-0 py-2 leading-relaxed">
          {isTamil
            ? 'இந்த செயலைத் திரும்பப் பெற முடியாது. உங்கள் சுயவிவரம், சாகுபடி திட்டங்கள் மற்றும் அனைத்து செயலில் உள்ள அமர்வுகளும் நிரந்தரமாக நீக்கப்படும்.'
            : 'This action cannot be undone. Your user profile, saved cultivation plans, and all active sessions will be permanently deleted.'}
        </p>
      </Modal>
    </div>
  );
}
