'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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

export interface UseLocationSelectorProps {
  initialState?: string;
  initialDistrict?: string;
  initialCity?: string;
  onLocationChange?: (location: {
    state: string;
    district: string;
    city: string;
    formatted: string;
  }) => void;
  messages?: {
    detectingGps?: string;
    gpsSuccess?: string;
    gpsTimeout?: string;
    gpsDenied?: string;
    gpsUnavailable?: string;
  };
}

export function useLocationSelector(props?: UseLocationSelectorProps) {
  const {
    initialState = '',
    initialDistrict = '',
    initialCity = '',
    onLocationChange,
    messages,
  } = props || {};

  // 1. Core Selection States
  const [selectedStateCode, setSelectedStateCode] = useState<string>('');
  const [selectedStateName, setSelectedStateName] = useState<string>(initialState);

  const [selectedDistrictCode, setSelectedDistrictCode] = useState<string>('');
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>(initialDistrict);

  const [selectedPlace, setSelectedPlace] = useState<string>(initialCity);
  const [manualPlaceName, setManualPlaceName] = useState<string>('');
  const [isManualInput, setIsManualInput] = useState<boolean>(false);

  // 2. Data Lists
  const [statesList, setStatesList] = useState<LocationItem[]>([]);
  const [districtsList, setDistrictsList] = useState<LocationItem[]>([]);
  const [placesList, setPlacesList] = useState<PlaceItem[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(false);
  const [loadingPlaces, setLoadingPlaces] = useState<boolean>(false);

  // 3. Live GPS States
  const [detectingGps, setDetectingGps] = useState<boolean>(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string | null>(null);
  const [gpsStatusError, setGpsStatusError] = useState<boolean>(false);

  // 4. Dynamic Location Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchLocationResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);

  // 5. Select Search Query States
  const [stateSearchText, setStateSearchText] = useState<string>('');
  const [districtSearchText, setDistrictSearchText] = useState<string>('');
  const [placeSearchText, setPlaceSearchText] = useState<string>('');
  const [stateSearching, setStateSearching] = useState<boolean>(false);
  const [districtSearching, setDistrictSearching] = useState<boolean>(false);
  const [placeSearching, setPlaceSearching] = useState<boolean>(false);

  // Debounce ref for search query
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update initial values if they arrive asynchronously
  useEffect(() => {
    if (initialState && !selectedStateName) {
      setSelectedStateName(initialState);
    }
  }, [initialState]);

  useEffect(() => {
    if (initialDistrict && !selectedDistrictName) {
      setSelectedDistrictName(initialDistrict);
    }
  }, [initialDistrict]);

  useEffect(() => {
    if (initialCity && !selectedPlace && !manualPlaceName) {
      setSelectedPlace(initialCity);
    }
  }, [initialCity]);

  // Apply location dynamically (e.g. from GPS or search result)
  const applyDynamicLocation = async (stateName: string, districtName: string, placeName: string) => {
    let targetState =
      statesList.find(
        (s) =>
          s.name.toLowerCase() === stateName.toLowerCase() ||
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

      if (!dists.some((d) => d.name.toLowerCase() === finalDistName.toLowerCase())) {
        setDistrictsList([{ code: finalDistCode, name: finalDistName }, ...dists]);
      }

      setSelectedDistrictCode(finalDistCode);
      setSelectedDistrictName(finalDistName);
      setLoadingPlaces(true);
      const places = await fetchDistrictPlaces(targetState.code, finalDistCode, finalDistName);
      setPlacesList(places);
      setLoadingPlaces(false);

      if (placeName) {
        const foundPlace = places.find(
          (p) =>
            p.name.toLowerCase() === placeName.toLowerCase() ||
            p.name.toLowerCase().includes(placeName.toLowerCase()) ||
            placeName.toLowerCase().includes(p.name.toLowerCase())
        );
        if (foundPlace) {
          setSelectedPlace(foundPlace.name);
          setIsManualInput(false);
          setManualPlaceName('');
        } else {
          setIsManualInput(true);
          setManualPlaceName(placeName);
          setSelectedPlace(placeName);
        }
      }
    }
  };

  // Search places debounce
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchLocations(searchQuery);
        setSearchResults(results);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('[SearchLocations Error]:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // Handle select search result
  const handleSelectSearchResult = async (item: SearchLocationResult) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    setGpsStatusMessage(`Resolved: ${item.place}, ${item.district}`);
    setGpsStatusError(false);
    await applyDynamicLocation(item.state, item.district, item.place);
  };

  // Detect Live GPS
  const detectLiveLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatusMessage(messages?.gpsUnavailable || 'Geolocation is not supported by your browser.');
      setGpsStatusError(true);
      return;
    }

    setDetectingGps(true);
    setGpsStatusMessage(messages?.detectingGps || 'Locking GPS satellites...');
    setGpsStatusError(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const resolved = await reverseGeocodeGps(latitude, longitude);

          if (resolved) {
            setDetectingGps(false);
            setGpsStatusError(false);
            setGpsStatusMessage(
              `${messages?.gpsSuccess || 'GPS Locked'}: ${resolved.place}, ${resolved.district}`
            );
            await applyDynamicLocation(resolved.state, resolved.district, resolved.place);
          } else {
            setDetectingGps(false);
            setGpsStatusError(true);
            setGpsStatusMessage('Location could not be resolved from GPS coordinates.');
          }
        } catch {
          setDetectingGps(false);
          setGpsStatusError(true);
          setGpsStatusMessage('Failed to reverse-geocode coordinates.');
        }
      },
      (err) => {
        setDetectingGps(false);
        setGpsStatusError(true);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatusMessage(messages?.gpsDenied || 'GPS Permission denied.');
        } else {
          setGpsStatusMessage(messages?.gpsTimeout || 'GPS Location timed out.');
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
          const saved =
            localStorage.getItem('farmhub_farmer_location') ||
            localStorage.getItem('agripulse_farmer_location');
          if (saved) savedState = JSON.parse(saved).state || '';
        } catch {}

        const targetStateName = savedState || selectedStateName || initialState;
        const found = targetStateName
          ? res.find(
              (s) =>
                s.name.toLowerCase() === targetStateName.toLowerCase() ||
                s.name.toLowerCase().includes(targetStateName.toLowerCase())
            )
          : res.find((s) => s.name.toLowerCase().includes('tamil')) || res[0];

        if (found) {
          setSelectedStateCode(found.code);
          setSelectedStateName(found.name);
        }
      }
    });
  }, []);

  // 2. Load Districts dynamically when state changes
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
          const saved =
            localStorage.getItem('farmhub_farmer_location') ||
            localStorage.getItem('agripulse_farmer_location');
          if (saved) savedDistrict = JSON.parse(saved).district || '';
        } catch {}

        const targetDistName = savedDistrict || selectedDistrictName || initialDistrict;
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

  // 3. Load Cities & Villages when district changes
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
          const saved =
            localStorage.getItem('farmhub_farmer_location') ||
            localStorage.getItem('agripulse_farmer_location');
          if (saved) savedPlace = JSON.parse(saved).place || '';
        } catch {}

        const currentName = savedPlace || manualPlaceName || selectedPlace || initialCity;
        const found = currentName
          ? res.find((p) => p.name.toLowerCase() === currentName.toLowerCase())
          : null;

        if (found) {
          setSelectedPlace(found.name);
        } else if (!isManualInput && !manualPlaceName) {
          if (currentName) {
            setSelectedPlace(currentName);
          } else {
            setSelectedPlace(res[0].name);
          }
        }
      }
    });
  }, [selectedStateCode, selectedDistrictCode, selectedDistrictName]);

  // Memoized state options
  const stateOptions = useMemo(() => {
    const opts = statesList.map((s) => ({ value: s.code, label: s.name }));
    if (selectedStateCode && selectedStateName && !opts.some((o) => o.value === selectedStateCode)) {
      opts.unshift({ value: selectedStateCode, label: selectedStateName });
    }
    return opts;
  }, [statesList, selectedStateCode, selectedStateName]);

  // Memoized district options
  const districtOptions = useMemo(() => {
    const opts = districtsList.map((d) => ({ value: d.code, label: d.name }));
    if (
      selectedDistrictCode &&
      selectedDistrictName &&
      !opts.some((o) => o.value === selectedDistrictCode)
    ) {
      opts.unshift({ value: selectedDistrictCode, label: selectedDistrictName });
    }
    return opts;
  }, [districtsList, selectedDistrictCode, selectedDistrictName]);

  // Memoized unique place options
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

  // Synchronize onLocationChange callback
  useEffect(() => {
    const activePlace = isManualInput && manualPlaceName ? manualPlaceName.trim() : selectedPlace;
    const parts = [activePlace, selectedDistrictName, selectedStateName].filter(Boolean);
    const formatted = parts.join(', ');

    if (onLocationChange) {
      onLocationChange({
        state: selectedStateName,
        district: selectedDistrictName,
        city: activePlace,
        formatted,
      });
    }
  }, [selectedStateName, selectedDistrictName, selectedPlace, isManualInput, manualPlaceName]);

  // Handlers for state, district, place change
  const handleSelectState = (code: string, label: string) => {
    setSelectedStateCode(code);
    setSelectedStateName(label);
    setSelectedDistrictCode('');
    setSelectedDistrictName('');
    setSelectedPlace('');
    setManualPlaceName('');
    setStateSearchText('');
    setStateSearching(false);
  };

  const handleSelectDistrict = (code: string, label: string) => {
    setSelectedDistrictCode(code);
    setSelectedDistrictName(label);
    setSelectedPlace('');
    setManualPlaceName('');
    setDistrictSearchText('');
    setDistrictSearching(false);
  };

  const handleSelectPlace = (place: string) => {
    setSelectedPlace(place);
    setManualPlaceName('');
    setPlaceSearchText('');
    setPlaceSearching(false);
  };

  return {
    // Selection state
    selectedStateCode,
    selectedStateName,
    selectedDistrictCode,
    selectedDistrictName,
    selectedPlace,
    isManualInput,
    manualPlaceName,
    // Setters
    setSelectedStateCode,
    setSelectedStateName,
    setSelectedDistrictCode,
    setSelectedDistrictName,
    setSelectedPlace,
    setIsManualInput,
    setManualPlaceName,
    // Loading & GPS states
    loadingDistricts,
    loadingPlaces,
    detectingGps,
    gpsStatusMessage,
    gpsStatusError,
    // Search states
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    showSearchDropdown,
    setShowSearchDropdown,
    // Select dropdown search states
    stateSearchText,
    setStateSearchText,
    districtSearchText,
    setDistrictSearchText,
    placeSearchText,
    setPlaceSearchText,
    stateSearching,
    setStateSearching,
    districtSearching,
    setDistrictSearching,
    placeSearching,
    setPlaceSearching,
    // Memoized options
    stateOptions,
    districtOptions,
    uniquePlaceOptions,
    // Actions
    detectLiveLocation,
    applyDynamicLocation,
    handleSelectSearchResult,
    handleSelectState,
    handleSelectDistrict,
    handleSelectPlace,
  };
}
