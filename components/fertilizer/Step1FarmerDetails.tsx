'use client';

import React, { useState, useEffect, useRef, useMemo, type SyntheticEvent } from 'react';
import type { UserDetails } from '@/lib/fertilizer/types';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Select, FloatButton, Input, type InputRef } from 'antd';
import {
  fetchLgdStates,
  fetchLgdDistricts,
  fetchDistrictPlaces,
  reverseGeocodeGps,
  searchLocations,
  matchDistrict,
  type LocationItem,
  type PlaceItem,
  type SearchLocationResult,
} from '@/lib/locations';

interface Step1FarmerDetailsProps {
  userDetails: UserDetails;
  setUserDetails: (details: UserDetails) => void;
  errors: Partial<Record<keyof UserDetails, string>>;
  onSubmit: (e?: SyntheticEvent) => void;
  onJumpToStep3: () => void;
  onClearError?: (field: keyof UserDetails) => void;
}

export const Step1FarmerDetails: React.FC<Step1FarmerDetailsProps> = ({
  userDetails,
  setUserDetails,
  errors,
  onSubmit,
  onJumpToStep3,
  onClearError,
}) => {
  const { messages } = useLanguage();
  const t = messages.fertilizer;

  // 1. Country & Base Geodata
  const country = 'India';
  const [selectedStateCode, setSelectedStateCode] = useState<string>('');
  const [selectedStateName, setSelectedStateName] = useState<string>(userDetails.state || '');

  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>('');
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>(userDetails.district || '');

  // 2. All Cities & Villages of the District (Combined Dynamic List)
  const [placesList, setPlacesList] = useState<PlaceItem[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<string>(userDetails.village || userDetails.city || '');
  const [loadingPlaces, setLoadingPlaces] = useState<boolean>(false);

  // 3. Separate Input Field for custom/manual village or city name
  const [isManualInput, setIsManualInput] = useState<boolean>(false);
  const [manualPlaceName, setManualPlaceName] = useState<string>('');

  // Dropdown lists
  const [statesList, setStatesList] = useState<LocationItem[]>([]);
  const [districtsList, setDistrictsList] = useState<LocationItem[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(false);

  // 4. Live GPS Detection State
  const [detectingGps, setDetectingGps] = useState<boolean>(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);
  const [gpsStatusError, setGpsStatusError] = useState<boolean>(false);

  // 5. Dynamic Global Search State for Town/Village
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchLocationResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<InputRef>(null);
  const manualPlaceInputRef = useRef<InputRef>(null);

  // Controlled search text states for dropdowns
  const [stateSearchText, setStateSearchText] = useState<string>('');
  const [districtSearchText, setDistrictSearchText] = useState<string>('');
  const [placeSearchText, setPlaceSearchText] = useState<string>('');
  const [stateSearching, setStateSearching] = useState<boolean>(false);
  const [districtSearching, setDistrictSearching] = useState<boolean>(false);
  const [placeSearching, setPlaceSearching] = useState<boolean>(false);

  const updateField = (field: keyof UserDetails, value: any) => {
    setUserDetails({ ...userDetails, [field]: value });
    if (onClearError) onClearError(field as any);
  };

  // Focus Handlers for "Not in list?" options
  const handleFocusCityVillageInput = () => {
    setIsManualInput(true);
    if (!manualPlaceName) {
      setManualPlaceName(selectedPlace || '');
    }
    setTimeout(() => {
      (manualPlaceInputRef.current?.input || manualPlaceInputRef.current?.nativeElement)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      manualPlaceInputRef.current?.focus();
    }, 150);
  };

  const handleFocusSearchInput = () => {
    (searchInputRef.current?.input || searchInputRef.current?.nativeElement)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  };

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamically apply a selected location (from search results or live GPS)
  const applyDynamicLocation = async (stateName: string, districtName: string, placeName: string) => {
    let targetState = statesList.find(
      (s) => s.name.toLowerCase() === stateName.toLowerCase() ||
        s.name.toLowerCase().includes(stateName.toLowerCase()) ||
        stateName.toLowerCase().includes(s.name.toLowerCase())
    ) || statesList[0];

    if (targetState) {
      setSelectedStateCode(targetState.code);
      setSelectedStateName(targetState.name);
      setLoadingDistricts(true);
      const dists = await fetchLgdDistricts(targetState.code);
      setDistrictsList(dists);
      setLoadingDistricts(false);

      const targetDist = matchDistrict(dists, districtName);
      const finalDistName = targetDist ? targetDist.name : districtName;
      const finalDistCode = targetDist ? targetDist.code : districtName;

      // Ensure the district is visible in the dropdown
      if (!dists.some((d) => d.name.toLowerCase() === finalDistName.toLowerCase())) {
        setDistrictsList([{ code: finalDistCode, name: finalDistName }, ...dists]);
      }

      setSelectedDistrictCode(finalDistCode);
      setSelectedDistrictName(finalDistName);
      setLoadingPlaces(true);
      const places = await fetchDistrictPlaces(targetState.code, finalDistCode, finalDistName);
      setPlacesList(places);
      setLoadingPlaces(false);

      const targetPl = places.find(
        (p) => p.name.toLowerCase() === placeName.toLowerCase() ||
          p.name.toLowerCase().includes(placeName.toLowerCase()) ||
          placeName.toLowerCase().includes(p.name.toLowerCase())
      );

      const finalPlaceName = targetPl ? targetPl.name : placeName;

      if (targetPl) {
        setSelectedPlace(targetPl.name);
        setIsManualInput(false);
        setManualPlaceName('');
      } else if (placeName) {
        setSelectedPlace(placeName);
        setIsManualInput(true);
        setManualPlaceName(placeName);
      }

      setUserDetails({
        ...userDetails,
        state: targetState.name,
        district: finalDistName,
        village: finalPlaceName,
        city: finalPlaceName,
      });
    }

    try {
      const locData = JSON.stringify({
        state: stateName,
        district: districtName,
        place: placeName,
      });
      localStorage.setItem('farmhub_farmer_location', locData);
      localStorage.setItem('farmhub_farmer_location', locData);
      localStorage.setItem('agripulse_farmer_location', locData);
    } catch { }

    setGpsStatusError(false);
    setGpsStatusMessage(`${t.step1.gpsSelectedPrefix} ${placeName}, ${districtName}`);
    if (onClearError) onClearError('location');
  };

  // Live search debounce (100% dynamic search across Postal API & OSM)
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      setShowSearchDropdown(true);
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSearchResult = (item: SearchLocationResult) => {
    applyDynamicLocation(item.state, item.district, item.place);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  // Live GPS Location Detection via Browser Geolocation & OpenStreetMap Nominatim (100% dynamic)
  const detectLiveLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsStatusError(true);
      setGpsStatusMessage(t.step1.gpsUnsupported);
      return;
    }

    setDetectingGps(true);
    setGpsStatusError(false);
    setGpsStatusMessage(t.step1.gpsAcquiring);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsStatusMessage(t.step1.gpsResolving);

        try {
          const geoData = await reverseGeocodeGps(latitude, longitude);

          if (!geoData || (!geoData.district && !geoData.place)) {
            setGpsStatusError(true);
            setGpsStatusMessage(t.step1.gpsUnableToResolve);
            setDetectingGps(false);
            return;
          }

          // 1. Match and Set State
          let matchedState = statesList.find(
            (s) => s.name.toLowerCase() === geoData.state.toLowerCase() ||
              geoData.state.toLowerCase().includes(s.name.toLowerCase()) ||
              s.name.toLowerCase().includes(geoData.state.toLowerCase())
          );
          if (!matchedState && statesList.length > 0) {
            matchedState = statesList.find((s) => s.name.toLowerCase().includes('tamil')) || statesList[0];
          }

          if (matchedState) {
            setSelectedStateCode(matchedState.code);
            setSelectedStateName(matchedState.name);

            // 2. Fetch and Match District
            const districts = await fetchLgdDistricts(matchedState.code);
            setDistrictsList(districts);

            const matchedDistrict = matchDistrict(districts, geoData.district);
            const finalDist = matchedDistrict || (geoData.district ? { code: geoData.district, name: geoData.district } : districts[0]);

            if (finalDist) {
              setSelectedDistrictCode(finalDist.code);
              setSelectedDistrictName(finalDist.name);

              // 3. Fetch Places for the district and match Place
              const places = await fetchDistrictPlaces(matchedState.code, finalDist.code, finalDist.name);
              setPlacesList(places);

              const placeTarget = (geoData.place || geoData.taluk || '').trim();
              const matchedPlace = places.find(
                (p) => p.name.toLowerCase() === placeTarget.toLowerCase() ||
                  p.name.toLowerCase().includes(placeTarget.toLowerCase()) ||
                  placeTarget.toLowerCase().includes(p.name.toLowerCase())
              );

              if (matchedPlace) {
                setSelectedPlace(matchedPlace.name);
                setIsManualInput(false);
                setManualPlaceName('');
              } else if (placeTarget) {
                setIsManualInput(true);
                setManualPlaceName(placeTarget);
                setSelectedPlace(placeTarget);
              }

              // Pre-fill address if currently empty
              if (!userDetails.address && geoData.displayName) {
                const shortAddr = geoData.displayName.split(',').slice(0, 4).join(', ').trim();
                setUserDetails({
                  ...userDetails,
                  address: shortAddr,
                });
                if (onClearError) onClearError('address');
              }
            }
          }

          setGpsStatusError(false);
          const detectedSummary = [geoData?.place || geoData?.taluk, geoData?.district || geoData?.state].filter(Boolean).join(', ');
          setGpsStatusMessage(`${t.step1.gpsDetectedPrefix} ${detectedSummary}`);
          if (onClearError) onClearError('location');
        } catch (err: any) {
          setGpsStatusError(true);
          setGpsStatusMessage(t.step1.gpsFailed);
        } finally {
          setDetectingGps(false);
        }
      },
      (err) => {
        setDetectingGps(false);
        setGpsStatusError(true);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatusMessage(t.step1.gpsPermissionDenied);
        } else {
          setGpsStatusMessage(t.step1.gpsTimeout);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // 1. Load States dynamically
  useEffect(() => {
    fetchLgdStates().then((res) => {
      setStatesList(res);
      if (res.length > 0) {
        let savedState = '';
        try {
          const saved = localStorage.getItem('farmhub_farmer_location') || localStorage.getItem('agripulse_farmer_location');
          if (saved) savedState = JSON.parse(saved).state || '';
        } catch { }

        const targetStateName = savedState || userDetails.state;
        const found = targetStateName
          ? res.find((s) => s.name.toLowerCase() === targetStateName.toLowerCase() || s.name.toLowerCase().includes(targetStateName.toLowerCase()))
          : res.find((s) => s.name.toLowerCase().includes('tamil')) || res[0];

        if (found) {
          setSelectedStateCode(found.code);
          setSelectedStateName(found.name);
        }
      }
    });
  }, []);

  // 2. Load Districts dynamically when state changes (100% dynamic from LGD API)
  useEffect(() => {
    if (!selectedStateCode) {
      setDistrictsList([]);
      return;
    }
    setLoadingDistricts(true);
    fetchLgdDistricts(selectedStateCode).then((res) => {
      setDistrictsList(res);
      setLoadingDistricts(false);
      if (res.length > 0) {
        let savedDistrict = '';
        try {
          const saved = localStorage.getItem('farmhub_farmer_location') || localStorage.getItem('agripulse_farmer_location');
          if (saved) {
            const parsed = JSON.parse(saved);
            savedDistrict = parsed.district || '';
          }
        } catch { }

        const targetDistName = savedDistrict || userDetails.district;
        const found = targetDistName ? matchDistrict(res, targetDistName) : null;

        if (found) {
          setSelectedDistrictCode(found.code);
          setSelectedDistrictName(found.name);
        } else if (targetDistName) {
          setSelectedDistrictCode(targetDistName);
          setSelectedDistrictName(targetDistName);
        } else if (res[0]) {
          setSelectedDistrictCode(res[0].code);
          setSelectedDistrictName(res[0].name);
        }
      }
    });
  }, [selectedStateCode]);

  // 3. Load All Cities and Villages for the selected District dynamically (100% dynamic)
  useEffect(() => {
    if (!selectedDistrictName) {
      setPlacesList([]);
      return;
    }
    setLoadingPlaces(true);
    fetchDistrictPlaces(selectedStateCode, selectedDistrictCode, selectedDistrictName).then((res) => {
      setPlacesList(res);
      setLoadingPlaces(false);
      if (res.length > 0) {
        let savedPlace = '';
        try {
          const saved = localStorage.getItem('farmhub_farmer_location') || localStorage.getItem('agripulse_farmer_location');
          if (saved) {
            const parsed = JSON.parse(saved);
            savedPlace = parsed.place || '';
          }
        } catch { }

        const currentName = savedPlace || manualPlaceName || selectedPlace;
        const found = currentName ? res.find((p) => p.name.toLowerCase() === currentName.toLowerCase()) : null;

        if (found) {
          setSelectedPlace(found.name);
        } else if (!isManualInput && !manualPlaceName) {
          setSelectedPlace(res[0].name);
        }
      }
    });
  }, [selectedStateCode, selectedDistrictCode, selectedDistrictName]);

  // Memoized state options (always includes selected state)
  const stateOptions = useMemo(() => {
    const opts = statesList.map((s) => ({ value: s.code, label: s.name }));
    if (selectedStateCode && selectedStateName && !opts.some((o) => o.value === selectedStateCode)) {
      opts.unshift({ value: selectedStateCode, label: selectedStateName });
    }
    return opts;
  }, [statesList, selectedStateCode, selectedStateName]);

  // Memoized district options (always includes selected district)
  const districtOptions = useMemo(() => {
    const opts = districtsList.map((d) => ({ value: d.code, label: d.name }));
    if (selectedDistrictCode && selectedDistrictName && !opts.some((o) => o.value === selectedDistrictCode)) {
      opts.unshift({ value: selectedDistrictCode, label: selectedDistrictName });
    }
    return opts;
  }, [districtsList, selectedDistrictCode, selectedDistrictName]);

  // Memoized unique place options (strictly unique by place name)
  const uniquePlaceOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string; searchStr: string }[] = [];
    if (selectedPlace) {
      const key = selectedPlace.trim().toLowerCase();
      seen.add(key);
      options.push({
        value: selectedPlace,
        label: selectedPlace,
        searchStr: key,
      });
    }
    for (const p of placesList) {
      const key = p.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        options.push({
          value: p.name,
          label: `${p.name}${p.type ? ` (${p.type})` : ''}${p.pincode ? ` - ${p.pincode}` : ''}`,
          searchStr: `${p.name} ${p.type || ''} ${p.pincode || ''}`.toLowerCase(),
        });
      }
    }
    return options;
  }, [placesList, selectedPlace]);

  // Synchronize full location string with userDetails
  useEffect(() => {
    const activePlace = isManualInput && manualPlaceName ? manualPlaceName.trim() : selectedPlace;
    const parts = [activePlace, selectedDistrictName, selectedStateName].filter(Boolean);
    const formattedLocation = parts.join(', ');

    setUserDetails({
      ...userDetails,
      country: 'India',
      state: selectedStateName,
      district: selectedDistrictName,
      village: activePlace,
      city: activePlace,
      location: formattedLocation,
    });

    if (errors.location && onClearError) {
      onClearError('location');
    }
  }, [selectedStateName, selectedDistrictName, selectedPlace, isManualInput, manualPlaceName]);

  return (
    <div className="rounded-2xl glass-panel p-5 sm:p-7 shadow-xl border border-border-light space-y-6">
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
            <span>📋</span> {t.step1.title}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{t.step1.description}</p>
        </div>

        {/* Action Buttons at Top of Form */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            id="btn-top-all-records"
            onClick={() => onJumpToStep3()}
            className="inline-flex items-center gap-1.5 rounded-xl glass-surface px-3.5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all cursor-pointer"
          >
            📋 All Records
          </button>
        </div>
      </div>

      <form id="form-step1" onSubmit={onSubmit} className="space-y-5">
        {/* Core Farmer Details: Farmer Name, Mobile Number, and Land Size all in a single row with identical heights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Farmer Name */}
          <div>
            <div className="h-6 flex items-center mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {t.step1.nameLabel} <span className="text-rose-400">*</span>
              </label>
            </div>
            <Input
              size="large"
              value={userDetails.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder={t.step1.namePlaceholder}
              className={`h-[42px] w-full rounded-xl text-sm font-medium ${errors.name ? 'border-rose-500' : ''
                }`}
            />
            {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name}</p>}
          </div>

          {/* 2. Mobile Phone Number */}
          <div>
            <div className="h-6 flex items-center mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {t.step1.phoneLabel} <span className="text-rose-400">*</span>
              </label>
            </div>
            <Input
              size="large"
              maxLength={10}
              value={userDetails.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder={t.step1.phonePlaceholder}
              className={`h-[42px] w-full rounded-xl text-sm font-medium ${errors.phone ? 'border-rose-500' : ''
                }`}
            />
            {errors.phone && <p className="mt-1 text-xs text-rose-400">{errors.phone}</p>}
          </div>

          {/* 3. Land Cultivation Size (in Cents) */}
          <div>
            <div className="h-6 flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {t.step1.landSizeLabel} <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-1">
                {[50, 100, 250, 500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => updateField('landSize', preset)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${userDetails.landSize === preset
                      ? 'bg-emerald-500 text-slate-950'
                      : 'glass-surface text-text-muted hover:text-text-main'
                      }`}
                  >
                    {preset}c
                  </button>
                ))}
              </div>
            </div>
            <Input
              size="large"
              type="number"
              min="1"
              step="1"
              value={userDetails.landSize || ''}
              onChange={(e) => updateField('landSize', parseFloat(e.target.value) || 0)}
              placeholder={t.step1.landSizePlaceholder}
              suffix={<span className="text-xs font-bold text-text-muted">{messages.common.cents}</span>}
              className={`h-[42px] w-full rounded-xl text-sm font-bold text-emerald-400 ${errors.landSize ? 'border-rose-500' : ''
                }`}
            />
            {errors.landSize && <p className="mt-1 text-xs text-rose-400">{errors.landSize}</p>}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FARM LOCATION SECTION (State, District, All Cities & Villages in one row) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="pt-3 border-t border-border-subtle space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">📍</span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-text-main">
                {t.step1.farmLocationHeading}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border dark:border-emerald-500/30">
                Live Dynamic
              </span>

              {/* 📍 GPS Auto-Detect Button */}
              <button
                type="button"
                onClick={detectLiveLocation}
                disabled={detectingGps}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 dark:border-emerald-500/40 border border-emerald-600/50 px-3 py-1 text-xs font-black transition-all cursor-pointer shadow-sm disabled:opacity-50 active:scale-95 ml-1"
                title={t.step1.gpsTooltip}
              >
                {detectingGps ? (
                  <>
                    <span className="animate-spin text-xs">🧭</span>
                    <span>{t.step1.detectingGps}</span>
                  </>
                ) : (
                  <>
                    <span>📍</span>
                    <span>{t.step1.useLiveLocation}</span>
                  </>
                )}
              </button>
            </div>

            {/* Resolved Location Badge or GPS Status Message */}
            <div className="flex flex-wrap items-center gap-2">
              {gpsStatusMessage && (
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${gpsStatusError
                    ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300'
                    }`}
                >
                  {gpsStatusMessage}
                </span>
              )}

              {userDetails.location && !gpsStatusMessage && (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 px-3 py-1 rounded-xl border dark:border-emerald-500/30 shadow-sm">
                  <span>📍</span>
                  <span>{userDetails.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Village / Town Search Bar (Purely live dynamic with reduced width & unified styling) */}
          <div ref={searchContainerRef} className="relative w-full max-w-lg">
            <Input
              ref={searchInputRef}
              size="middle"
              prefix={<span className="text-emerald-400 text-xs shrink-0 mr-1">🔍</span>}
              suffix={
                <div className="flex items-center gap-1.5">
                  {searching && (
                    <span className="text-[10px] text-emerald-400 animate-pulse font-bold whitespace-nowrap">
                      {t.step1.searching || 'Searching...'}
                    </span>
                  )}
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setShowSearchDropdown(false);
                      }}
                      className="text-text-muted hover:text-text-main text-xs p-0.5"
                    >
                      ✕
                    </button>
                  )}
                </div>
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setShowSearchDropdown(true);
              }}
              placeholder={t.step1.searchPlaceholder}
              className="h-[42px] w-full rounded-xl text-xs font-medium"
            />

            {/* Dynamic Autocomplete Search Dropdown */}
            {showSearchDropdown && searchQuery.trim().length >= 2 && (
              <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl bg-card border border-emerald-500/30 shadow-2xl max-h-64 overflow-y-auto divide-y divide-border-subtle animate-in fade-in">
                {searching ? (
                  <div className="px-4 py-3.5 text-center text-xs text-emerald-400 flex items-center justify-center gap-2">
                    <span className="animate-spin text-sm">🧭</span>
                    <span className="font-semibold">{t.step1.searchingPlaces}</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((item, idx) => (
                    <button
                      key={`${item.place}-${item.district}-${idx}`}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full px-4 py-2.5 text-left text-xs hover:bg-emerald-500/15 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-text-main group-hover:text-emerald-500 flex items-center gap-1.5">
                          <span>📍</span>
                          <span>{item.place}</span>
                          {item.type && (
                            <span className="text-[10px] text-emerald-400/80 font-normal">({item.type})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5">
                          {item.district}, {item.state} {item.pincode ? `• PIN: ${item.pincode}` : ''}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t.step1.searchSelectBtn}
                      </span>
                    </button>
                  ))
                ) : (
                  /* No results found panel */
                  <div className="p-4 text-center space-y-1.5">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-500/15 text-rose-400 text-sm mb-0.5">
                      ⚠️
                    </div>
                    <p className="text-xs font-bold text-rose-300">
                      {t.step1.placeNotFound}
                    </p>
                    <p className="text-[11px] text-text-muted max-w-xs mx-auto">
                      {t.step1.placeNotFoundDesc}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Row: State, District, All Cities & Villages */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. State */}
            <div>
              <div className="h-6 flex items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  {t.step1.stateLabel} <span className="text-rose-400">*</span>
                </label>
              </div>
              <Select
                size="large"
                showSearch
                value={stateSearchText ? undefined : (selectedStateCode || undefined)}
                searchValue={stateSearchText}
                onChange={(code, opt: any) => {
                  setSelectedStateCode(code);
                  setSelectedStateName(opt.label);
                  setSelectedDistrictCode('');
                  setSelectedDistrictName('');
                  setSelectedPlace('');
                  setManualPlaceName('');
                  setStateSearchText('');
                  setStateSearching(false);
                }}
                onSearch={(val) => {
                  setStateSearchText(val);
                  setStateSearching(val.length > 0);
                }}
                onBlur={() => {
                  setStateSearchText('');
                  setStateSearching(false);
                }}
                onSelect={(code, opt: any) => {
                  setSelectedStateCode(code);
                  setSelectedStateName(opt.label);
                  setSelectedDistrictCode('');
                  setSelectedDistrictName('');
                  setSelectedPlace('');
                  setManualPlaceName('');
                  setStateSearchText('');
                  setStateSearching(false);
                }}
                onDropdownVisibleChange={(open) => {
                  if (!open) {
                    setStateSearchText('');
                    setStateSearching(false);
                  }
                }}
                placeholder={t.step1.selectStatePlaceholder}
                className={`w-full custom-antd-select ${stateSearching ? 'is-searching' : ''}`}
                popupMatchSelectWidth={false}
                options={stateOptions}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </div>

            {/* 2. District */}
            <div>
              <div className="h-6 flex items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  {t.step1.districtLabel} <span className="text-rose-400">*</span>
                </label>
              </div>
              <Select
                size="large"
                showSearch
                loading={loadingDistricts}
                value={districtSearchText ? undefined : (selectedDistrictCode || undefined)}
                searchValue={districtSearchText}
                onChange={(code, opt: any) => {
                  setSelectedDistrictCode(code);
                  setSelectedDistrictName(opt.label);
                  setSelectedPlace('');
                  setManualPlaceName('');
                  setDistrictSearchText('');
                  setDistrictSearching(false);
                }}
                onSearch={(val) => {
                  setDistrictSearchText(val);
                  setDistrictSearching(val.length > 0);
                }}
                onBlur={() => {
                  setDistrictSearchText('');
                  setDistrictSearching(false);
                }}
                onSelect={(code, opt: any) => {
                  setSelectedDistrictCode(code);
                  setSelectedDistrictName(opt.label);
                  setSelectedPlace('');
                  setManualPlaceName('');
                  setDistrictSearchText('');
                  setDistrictSearching(false);
                }}
                onDropdownVisibleChange={(open) => {
                  if (!open) {
                    setDistrictSearchText('');
                    setDistrictSearching(false);
                  }
                }}
                disabled={!selectedStateCode}
                placeholder={!selectedStateCode ? t.step1.selectDistrictFirst : t.step1.selectDistrictPlaceholder}
                className={`w-full custom-antd-select ${districtSearching ? 'is-searching' : ''}`}
                popupMatchSelectWidth={false}
                options={districtOptions}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </div>

            {/* 3. All Cities & Villages of the District */}
            <div>
              <div className="h-6 flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary truncate">
                  {t.step1.cityVillageLabel}{' '}
                  {uniquePlaceOptions.length > 0 && !isManualInput && (
                    <span className="text-[10px] text-text-muted font-normal">({uniquePlaceOptions.length})</span>
                  )}
                  <span className="text-rose-400 ml-0.5">*</span>
                </label>
                <FloatButton.Group
                  trigger="click"
                  type="primary"
                  className="mini-float-btn-group"
                  style={{ position: 'relative', right: 'auto', bottom: 'auto', inset: 'auto' }}
                  icon={<span className="text-[11px] leading-none">✍️</span>}
                  tooltip={{
                    title: t.step1.notInListTooltip,
                    placement: 'left',
                  }}
                >
                  <FloatButton
                    icon={<span className="text-[11px] leading-none">🔍</span>}
                    tooltip={{
                      title: t.step1.searchInLocationField,
                      placement: 'left',
                    }}
                    onClick={handleFocusSearchInput}
                  />
                  <FloatButton
                    icon={<span className="text-[11px] leading-none">✍️</span>}
                    tooltip={{
                      title: t.step1.typeCityVillage,
                      placement: 'left',
                    }}
                    onClick={handleFocusCityVillageInput}
                  />
                  {isManualInput && (
                    <FloatButton
                      icon={<span className="text-[11px] leading-none">📋</span>}
                      tooltip={{
                        title: t.step1.switchBackToList,
                        placement: 'left',
                      }}
                      onClick={() => setIsManualInput(false)}
                    />
                  )}
                </FloatButton.Group>
              </div>

              {!isManualInput ? (
                <Select
                  size="large"
                  showSearch
                  loading={loadingPlaces}
                  value={placeSearchText ? undefined : (selectedPlace || undefined)}
                  searchValue={placeSearchText}
                  onChange={(val) => {
                    setSelectedPlace(val);
                    setManualPlaceName('');
                    setPlaceSearchText('');
                    setPlaceSearching(false);
                  }}
                  onSearch={(val) => {
                    setPlaceSearchText(val);
                    setPlaceSearching(val.length > 0);
                  }}
                  onBlur={() => {
                    setPlaceSearchText('');
                    setPlaceSearching(false);
                  }}
                  onSelect={(val) => {
                    setSelectedPlace(val);
                    setManualPlaceName('');
                    setPlaceSearchText('');
                    setPlaceSearching(false);
                  }}
                  onDropdownVisibleChange={(open) => {
                    if (!open) {
                      setPlaceSearchText('');
                      setPlaceSearching(false);
                    }
                  }}
                  disabled={!selectedDistrictName}
                  placeholder={
                    !selectedDistrictName
                      ? t.step1.selectPlaceFirst
                      : t.step1.selectPlacePlaceholder
                  }
                  className={`w-full custom-antd-select ${placeSearching ? 'is-searching' : ''}`}
                  popupMatchSelectWidth={false}
                  options={uniquePlaceOptions}
                  filterOption={(input, option: any) =>
                    (option?.searchStr ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  notFoundContent={
                    <div className="p-3 text-center">
                      <p className="text-xs text-text-muted mb-2">{t.step1.noPlaceFound}</p>
                      <button
                        type="button"
                        onClick={handleFocusCityVillageInput}
                        className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-emerald-500 rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer"
                      >
                        {t.step1.enterExactPlaceBtn}
                      </button>
                    </div>
                  }
                />
              ) : (
                <div className="relative">
                  <Input
                    ref={manualPlaceInputRef}
                    size="large"
                    value={manualPlaceName}
                    onChange={(e) => setManualPlaceName(e.target.value)}
                    placeholder={t.step1.manualPlacePlaceholder}
                    allowClear
                    className="h-[42px] w-full rounded-xl text-sm font-bold text-text-main border-emerald-500/40"
                  />
                </div>
              )}
            </div>
          </div>

          {errors.location && <p className="mt-1 text-xs text-rose-400">{errors.location}</p>}
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
            {t.step1.addressLabel} <span className="text-rose-400">*</span>
          </label>
          <Input.TextArea
            rows={2}
            value={userDetails.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder={t.step1.addressPlaceholder}
            className={`w-full rounded-xl px-3.5 py-2.5 text-sm font-medium text-text-main ${errors.address ? 'border-rose-500' : ''
              }`}
          />
          {errors.address && <p className="mt-1 text-xs text-rose-400">{errors.address}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <span className="text-xs text-text-muted">
            {t.step1.scalingHint}
          </span>
          <button
            type="submit"
            id="btn-continue-step1"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-extrabold text-slate-950 shadow-glow transition-all hover:bg-emerald-400 active:scale-95 cursor-pointer"
          >
            {t.step1.submitBtn} →
          </button>
        </div>
      </form>

      {/* Floating button has been moved into the City/Village header */}
    </div>
  );
};
