'use client';

import React, { useRef, useEffect } from 'react';
import { Select, Input, FloatButton, type InputRef } from 'antd';
import type { useLocationSelector } from '@/lib/hooks/useLocationSelector';
import { MapPin, Search, Compass, X } from 'lucide-react';

interface LocationSelectorFieldsProps {
  location: ReturnType<typeof useLocationSelector>;
  isTamil?: boolean;
  disabled?: boolean;
  hideSearch?: boolean;
}

export const LocationSelectorFields: React.FC<LocationSelectorFieldsProps> = ({
  location,
  isTamil = false,
  disabled = false,
  hideSearch = false,
}) => {
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<InputRef>(null);
  const manualPlaceInputRef = useRef<InputRef>(null);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        location.setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [location]);

  const handleFocusCityVillageInput = () => {
    location.setIsManualInput(true);
    if (!location.manualPlaceName) {
      location.setManualPlaceName(location.selectedPlace || '');
    }
    setTimeout(() => {
      (manualPlaceInputRef.current?.input || manualPlaceInputRef.current?.nativeElement)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      manualPlaceInputRef.current?.focus();
    }, 150);
  };

  const handleFocusSearchInput = () => {
    (searchInputRef.current?.input || searchInputRef.current?.nativeElement)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 150);
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Geodata Header & Live GPS Detect */}
      {!hideSearch && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl glass-surface border border-border-subtle">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-text-main flex items-center gap-1.5">
              <MapPin size={15} className="text-emerald-400" />
              <span>{isTamil ? 'நேரடி இருப்பிடம் (GPS)' : 'Live Location & Geodata'}</span>
            </span>

            {/* GPS Auto-Detect Button */}
            <button
              type="button"
              onClick={location.detectLiveLocation}
              disabled={location.detectingGps || disabled}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 active:scale-95"
            >
              <Compass size={13} className={location.detectingGps ? 'animate-spin' : ''} />
              <span>
                {location.detectingGps
                  ? isTamil
                    ? 'கண்டறியப்படுகிறது...'
                    : 'Locating...'
                  : isTamil
                  ? 'GPS கண்டறி'
                  : 'Use Live GPS'}
              </span>
            </button>
          </div>

          {/* GPS Status Message */}
          {location.gpsStatusMessage && (
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                location.gpsStatusError
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {location.gpsStatusMessage}
            </span>
          )}
        </div>
      )}

      {/* Dynamic Search Dropdown Input */}
      {!hideSearch && (
        <div ref={searchContainerRef} className="relative w-full max-w-md">
          <Input
            ref={searchInputRef}
            size="middle"
            prefix={<Search size={14} className="text-emerald-400 mr-1 shrink-0" />}
            suffix={
              <div className="flex items-center gap-1.5">
                {location.searching && (
                  <span className="text-[10px] text-emerald-400 animate-pulse font-bold whitespace-nowrap">
                    {isTamil ? 'தேடுகிறது...' : 'Searching...'}
                  </span>
                )}
                {location.searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      location.setSearchQuery('');
                      location.setShowSearchDropdown(false);
                    }}
                    className="text-text-muted hover:text-text-main text-xs p-0.5"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            }
            value={location.searchQuery}
            onChange={(e) => location.setSearchQuery(e.target.value)}
            onFocus={() => {
              if (location.searchQuery.trim().length >= 2) location.setShowSearchDropdown(true);
            }}
            placeholder={isTamil ? 'ஊர் / கிராமத்தை தேடுங்கள்...' : 'Search town, village or pincode...'}
            disabled={disabled}
            className="h-[38px] w-full rounded-xl text-xs font-medium"
          />

          {/* Autocomplete Dropdown List - 100% Solid & High Z-Index */}
          {location.showSearchDropdown && location.searchQuery.trim().length >= 2 && (
            <div className="absolute z-[999] left-0 right-0 mt-1.5 rounded-xl bg-slate-950 dark:bg-slate-950 bg-white border-2 border-emerald-500/60 shadow-[0_25px_60px_rgba(0,0,0,0.9)] max-h-64 overflow-y-auto divide-y divide-border-subtle animate-in fade-in">
              {location.searching ? (
                <div className="px-4 py-3 text-center text-xs text-emerald-400 flex items-center justify-center gap-2">
                  <Compass size={14} className="animate-spin" />
                  <span className="font-semibold">{isTamil ? 'இடங்கள் தேடப்படுகிறது...' : 'Locating places...'}</span>
                </div>
              ) : location.searchResults.length > 0 ? (
                location.searchResults.map((item, idx) => (
                  <button
                    key={`${item.place}-${item.district}-${idx}`}
                    type="button"
                    onClick={() => location.handleSelectSearchResult(item)}
                    className="w-full px-4 py-3 text-left text-xs hover:bg-emerald-500/20 transition-all flex items-center justify-between group cursor-pointer bg-slate-950 dark:bg-slate-950 bg-white"
                  >
                    <div>
                      <div className="font-bold text-white dark:text-white text-slate-900 group-hover:text-emerald-400 flex items-center gap-1.5 text-xs">
                        <MapPin size={13} className="text-emerald-400" />
                        <span>{item.place}</span>
                        {item.type && (
                          <span className="text-[10px] text-emerald-400 font-semibold">({item.type})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-300 dark:text-slate-300 text-slate-600 mt-0.5">
                        {item.district}, {item.state} {item.pincode ? `• PIN: ${item.pincode}` : ''}
                      </div>
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-400 opacity-90 group-hover:opacity-100 transition-opacity bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      {isTamil ? 'தேர்ந்தெடு' : 'Select'}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center space-y-1 bg-slate-950 dark:bg-slate-950 bg-white">
                  <p className="text-xs font-bold text-rose-400">
                    {isTamil ? 'இடம் கண்டறியப்படவில்லை' : 'Location Not Found'}
                  </p>
                  <p className="text-[11px] text-slate-300 dark:text-slate-300 text-slate-600 max-w-xs mx-auto">
                    {isTamil ? 'கீழே உள்ள உள்ளீட்டில் நேரடியாக தட்டச்சு செய்யலாம்' : 'You can enter your exact village/town manually below'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Row: State, District, City/Village in a 3-column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. State */}
        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
            {isTamil ? 'மாநிலம் (State)' : 'State'}
          </label>
          <Select
            size="middle"
            showSearch
            value={location.stateSearchText ? undefined : location.selectedStateCode || undefined}
            searchValue={location.stateSearchText}
            onChange={(code, opt: any) => location.handleSelectState(code, opt?.label || '')}
            onSearch={(val) => {
              location.setStateSearchText(val);
              location.setStateSearching(val.length > 0);
            }}
            onBlur={() => {
              location.setStateSearchText('');
              location.setStateSearching(false);
            }}
            placeholder={isTamil ? 'மாநிலத்தைத் தேர்ந்தெடுக்கவும்' : 'Select State'}
            className="w-full custom-antd-select"
            popupMatchSelectWidth={false}
            options={location.stateOptions}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            disabled={disabled}
          />
        </div>

        {/* 2. District */}
        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
            {isTamil ? 'மாவட்டம் (District)' : 'District'}
          </label>
          <Select
            size="middle"
            showSearch
            loading={location.loadingDistricts}
            value={location.districtSearchText ? undefined : location.selectedDistrictCode || undefined}
            searchValue={location.districtSearchText}
            onChange={(code, opt: any) => location.handleSelectDistrict(code, opt?.label || '')}
            onSearch={(val) => {
              location.setDistrictSearchText(val);
              location.setDistrictSearching(val.length > 0);
            }}
            onBlur={() => {
              location.setDistrictSearchText('');
              location.setDistrictSearching(false);
            }}
            disabled={!location.selectedStateCode || disabled}
            placeholder={
              !location.selectedStateCode
                ? isTamil
                  ? 'முதலில் மாநிலத்தைத் தேர்ந்தெடுக்கவும்'
                  : 'Select State First'
                : isTamil
                ? 'மாவட்டத்தைத் தேர்ந்தெடுக்கவும்'
                : 'Select District'
            }
            className="w-full custom-antd-select"
            popupMatchSelectWidth={false}
            options={location.districtOptions}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </div>

        {/* 3. City / Village */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider truncate">
              {isTamil ? 'கிராமம் / நகரம் (City)' : 'City / Village'}
            </label>
            <button
              type="button"
              onClick={() => {
                location.setIsManualInput(!location.isManualInput);
                if (!location.isManualInput && !location.manualPlaceName) {
                  location.setManualPlaceName(location.selectedPlace || '');
                }
              }}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {location.isManualInput
                ? isTamil
                  ? 'பட்டியலுக்கு திரும்பு'
                  : 'Choose from List'
                : isTamil
                ? 'தட்டச்சு செய்'
                : 'Enter Manually'}
            </button>
          </div>

          {!location.isManualInput ? (
            <Select
              size="middle"
              showSearch
              loading={location.loadingPlaces}
              value={location.placeSearchText ? undefined : location.selectedPlace || undefined}
              searchValue={location.placeSearchText}
              onChange={(val) => location.handleSelectPlace(val)}
              onSearch={(val) => {
                location.setPlaceSearchText(val);
                location.setPlaceSearching(val.length > 0);
              }}
              onBlur={() => {
                location.setPlaceSearchText('');
                location.setPlaceSearching(false);
              }}
              disabled={!location.selectedDistrictName || disabled}
              placeholder={
                !location.selectedDistrictName
                  ? isTamil
                    ? 'முதலில் மாவட்டத்தைத் தேர்ந்தெடுக்கவும்'
                    : 'Select District First'
                  : isTamil
                  ? 'ஊரைத் தேர்ந்தெடுக்கவும்'
                  : 'Select City/Village'
              }
              className="w-full custom-antd-select"
              popupMatchSelectWidth={false}
              options={location.uniquePlaceOptions}
              filterOption={(input, option: any) =>
                (option?.searchStr ?? '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={
                <div className="p-3 text-center">
                  <p className="text-xs text-text-muted mb-2">
                    {isTamil ? 'பட்டியலில் இடம் கிடைக்கவில்லை' : 'Place not found in list'}
                  </p>
                  <button
                    type="button"
                    onClick={handleFocusCityVillageInput}
                    className="px-3 py-1 text-xs font-bold text-white keep-white bg-emerald-500 rounded-lg hover:bg-emerald-400 transition-colors cursor-pointer"
                  >
                    {isTamil ? 'ஊர் பெயரை தட்டச்சு செய்' : 'Enter Exact Place'}
                  </button>
                </div>
              }
            />
          ) : (
            <div className="relative">
              <Input
                ref={manualPlaceInputRef}
                size="middle"
                value={location.manualPlaceName}
                onChange={(e) => {
                  location.setManualPlaceName(e.target.value);
                  location.setSelectedPlace(e.target.value);
                }}
                placeholder={isTamil ? 'ஊர் / கிராமப் பெயரை உள்ளிடவும்' : 'Enter city or village name'}
                allowClear
                className="h-[38px] w-full rounded-xl text-xs font-semibold text-text-main border-emerald-500/40"
                disabled={disabled}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

