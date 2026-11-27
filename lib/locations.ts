/**
 * Dynamic Location Service
 * All static data, hardcoded fallback arrays, and static pincodes/village names have been completely removed.
 * Data is retrieved 100% dynamically via API endpoints derived from official geodata.
 */

export interface LocationItem {
  code: string;
  name: string;
  type?: string;
}

export interface PanchayatItem {
  name: string;
  pincode: string;
  block: string;
  type: string;
}

export interface UlbItem {
  code: string;
  name: string;
  type: string;
}

export interface PlaceItem {
  name: string;
  type?: string;
  pincode?: string;
}

/**
 * Common district name discrepancies between India Post / Census and LGD official directory
 */
export const DISTRICT_ALIASES: Record<string, string[]> = {
  'thoothukkudi': ['tuticorin', 'thoothukudi', 'tuticorin (thoothukudi)'],
  'kancheepuram': ['kanchipuram'],
  'kanniyakumari': ['kanyakumari'],
  'tiruchirappalli': ['trichy', 'tiruchirapalli'],
  'viluppuram': ['villupuram'],
  'the nilgiris': ['nilgiris', 'ooty', 'udhagamandalam'],
  'tirunelveli': ['nellai'],
  'thiruvallur': ['tiruvallur'],
  'thiruvarur': ['tiruvarur'],
  'tirupathur': ['tirupattur'],
  'tiruppur': ['tirupur'],
  'bengaluru urban': ['bangalore', 'bengaluru'],
  'bengaluru rural': ['bangalore rural'],
  'mysuru': ['mysore'],
  'puducherry': ['pondicherry'],
  'prayagraj': ['allahabad'],
  'varanasi': ['banaras', 'benares'],
  'ayodhya': ['faizabad'],
  'chennai': ['madras'],
  'kolkata': ['calcutta'],
  'mumbai': ['bombay'],
  'visakhapatnam': ['vizag'],
  'gurugram': ['gurgaon'],
  'belagavi': ['belgaum'],
  'shivamogga': ['shimoga'],
  'kalaburagi': ['gulbarga'],
  'vijayapura': ['bijapur'],
  'ballari': ['bellary'],
  'kollam': ['quilon'],
  'alappuzha': ['alleppey'],
  'palakkad': ['palghat'],
  'thrissur': ['trichur'],
  'kozhikode': ['calicut'],
  'kannur': ['cannanore'],
  'chhatrapati sambhajinagar': ['aurangabad'],
  'dharashiv': ['osmanabad'],
};

/**
 * Smart district matching supporting aliases, bidirectional lookup, and normalized spelling
 */
export function matchDistrict(districts: LocationItem[], targetDistrict: string): LocationItem | null {
  if (!targetDistrict || !districts || districts.length === 0) return null;
  const cleanTarget = targetDistrict.trim().toLowerCase();

  // 1. Direct exact or substring match
  const directMatch = districts.find((d) => {
    const dLower = d.name.toLowerCase();
    return dLower === cleanTarget || dLower.includes(cleanTarget) || cleanTarget.includes(dLower);
  });
  if (directMatch) return directMatch;

  // 2. Check alias mapping in both directions
  for (const d of districts) {
    const dLower = d.name.toLowerCase();
    const dAliases = DISTRICT_ALIASES[dLower] || [];
    if (dAliases.some((a) => a === cleanTarget || cleanTarget.includes(a) || a.includes(cleanTarget))) {
      return d;
    }
  }

  for (const [canonical, aliases] of Object.entries(DISTRICT_ALIASES)) {
    if (cleanTarget === canonical || aliases.some((a) => a === cleanTarget || cleanTarget.includes(a) || a.includes(cleanTarget))) {
      const foundCanonical = districts.find((d) => {
        const dLower = d.name.toLowerCase();
        return dLower === canonical || aliases.includes(dLower);
      });
      if (foundCanonical) return foundCanonical;
    }
  }

  // 3. Normalized alphanumeric match
  const alphaTarget = cleanTarget.replace(/[^a-z0-9]/g, '');
  const alphaMatch = districts.find((d) => {
    const alphaD = d.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return alphaD === alphaTarget || alphaD.includes(alphaTarget) || alphaTarget.includes(alphaD);
  });
  if (alphaMatch) return alphaMatch;

  return null;
}

// ─────────────────────────────────────────────────────────────
// In-Flight Request Deduplication & Memory Caching
// ─────────────────────────────────────────────────────────────
let statesCache: LocationItem[] | null = null;
let statesInFlight: Promise<LocationItem[]> | null = null;

const districtsCache = new Map<string, LocationItem[]>();
const districtsInFlight = new Map<string, Promise<LocationItem[]>>();

const subdistrictsCache = new Map<string, LocationItem[]>();
const subdistrictsInFlight = new Map<string, Promise<LocationItem[]>>();

const panchayatsCache = new Map<string, PanchayatItem[]>();
const panchayatsInFlight = new Map<string, Promise<PanchayatItem[]>>();

const ulbCache = new Map<string, UlbItem[]>();
const ulbInFlight = new Map<string, Promise<UlbItem[]>>();

const placesCache = new Map<string, PlaceItem[]>();
const placesInFlight = new Map<string, Promise<PlaceItem[]>>();

/**
 * 1. Fetch States from LGD API dynamically (deduplicated & cached)
 */
export async function fetchLgdStates(): Promise<LocationItem[]> {
  if (statesCache && statesCache.length > 0) return statesCache;
  if (statesInFlight) return statesInFlight;

  statesInFlight = (async () => {
    try {
      const res = await fetch('/api/locations?type=lgd-states');
      if (!res.ok) throw new Error('Failed to fetch states');
      const json = await res.json();
      statesCache = json.data || [];
      return statesCache!;
    } catch {
      return [];
    } finally {
      statesInFlight = null;
    }
  })();

  return statesInFlight;
}

/**
 * 2. Fetch Districts for State from LGD API dynamically (deduplicated & cached)
 */
export async function fetchLgdDistricts(stateCode: string): Promise<LocationItem[]> {
  if (!stateCode) return [];
  if (districtsCache.has(stateCode)) return districtsCache.get(stateCode)!;
  if (districtsInFlight.has(stateCode)) return districtsInFlight.get(stateCode)!;

  const promise = (async () => {
    try {
      const res = await fetch(`/api/locations?type=lgd-districts&stateCode=${encodeURIComponent(stateCode)}`);
      if (!res.ok) throw new Error('Failed to fetch districts');
      const json = await res.json();
      const data: LocationItem[] = json.data || [];
      districtsCache.set(stateCode, data);
      return data;
    } catch {
      return [];
    } finally {
      districtsInFlight.delete(stateCode);
    }
  })();

  districtsInFlight.set(stateCode, promise);
  return promise;
}

/**
 * 3. RURAL PATHWAY: Fetch Subdistricts (Taluks / Blocks) from LGD API dynamically (deduplicated & cached)
 */
export async function fetchLgdSubdistricts(districtCode: string, districtName?: string): Promise<LocationItem[]> {
  if (!districtCode && !districtName) return [];
  const key = `${districtCode}_${districtName || ''}`;
  if (subdistrictsCache.has(key)) return subdistrictsCache.get(key)!;
  if (subdistrictsInFlight.has(key)) return subdistrictsInFlight.get(key)!;

  const promise = (async () => {
    try {
      const res = await fetch(
        `/api/locations?type=lgd-subdistricts&districtCode=${encodeURIComponent(districtCode || '')}&district=${encodeURIComponent(
          districtName || ''
        )}`
      );
      if (!res.ok) throw new Error('Failed to fetch subdistricts');
      const json = await res.json();
      const data: LocationItem[] = json.data || [];
      subdistrictsCache.set(key, data);
      return data;
    } catch {
      return [];
    } finally {
      subdistrictsInFlight.delete(key);
    }
  })();

  subdistrictsInFlight.set(key, promise);
  return promise;
}

/**
 * 4. RURAL PATHWAY: Fetch Gram Panchayats / Villages dynamically from live Postal API (deduplicated & cached)
 */
export async function fetchLgdPanchayats(talukName: string, districtName: string): Promise<PanchayatItem[]> {
  if (!talukName && !districtName) return [];
  const key = `${talukName}_${districtName}`;
  if (panchayatsCache.has(key)) return panchayatsCache.get(key)!;
  if (panchayatsInFlight.has(key)) return panchayatsInFlight.get(key)!;

  const promise = (async () => {
    try {
      const res = await fetch(
        `/api/locations?type=lgd-panchayats&taluk=${encodeURIComponent(talukName || '')}&district=${encodeURIComponent(
          districtName || ''
        )}`
      );
      if (!res.ok) throw new Error('Failed to fetch panchayats');
      const json = await res.json();
      const data: PanchayatItem[] = json.data || [];
      panchayatsCache.set(key, data);
      return data;
    } catch {
      return [];
    } finally {
      panchayatsInFlight.delete(key);
    }
  })();

  panchayatsInFlight.set(key, promise);
  return promise;
}

/**
 * 5. URBAN PATHWAY: Fetch Urban Local Bodies dynamically (deduplicated & cached)
 */
export async function fetchLgdUlb(stateCode: string, districtName: string, category: string): Promise<UlbItem[]> {
  if (!stateCode) return [];
  const key = `${stateCode}_${districtName}_${category}`;
  if (ulbCache.has(key)) return ulbCache.get(key)!;
  if (ulbInFlight.has(key)) return ulbInFlight.get(key)!;

  const promise = (async () => {
    try {
      const res = await fetch(
        `/api/locations?type=lgd-ulb&stateCode=${encodeURIComponent(stateCode)}&district=${encodeURIComponent(
          districtName || ''
        )}&category=${encodeURIComponent(category || '')}`
      );
      if (!res.ok) throw new Error('Failed to fetch ULB');
      const json = await res.json();
      const data: UlbItem[] = json.data || [];
      ulbCache.set(key, data);
      return data;
    } catch {
      return [];
    } finally {
      ulbInFlight.delete(key);
    }
  })();

  ulbInFlight.set(key, promise);
  return promise;
}

/**
 * 6. Fetch Wards dynamically
 */
export async function fetchLgdWards(panchayatOrUlb: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/locations?type=lgd-wards&panchayat=${encodeURIComponent(panchayatOrUlb || '')}`);
    if (!res.ok) throw new Error('Failed to fetch wards');
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

/**
 * 7. Fetch All Cities & Villages of the District dynamically (deduplicated & cached)
 */
export async function fetchDistrictPlaces(
  stateCode: string,
  districtCode: string,
  districtName: string
): Promise<PlaceItem[]> {
  if (!districtName && !districtCode) return [];
  const cacheKey = `${stateCode || '33'}_${districtCode || ''}_${districtName || ''}`.toLowerCase();
  if (placesCache.has(cacheKey)) return placesCache.get(cacheKey)!;
  if (placesInFlight.has(cacheKey)) return placesInFlight.get(cacheKey)!;

  const inFlight = (async () => {
    try {
      const res = await fetch(
        `/api/locations?type=places&stateCode=${encodeURIComponent(stateCode || '33')}&districtCode=${encodeURIComponent(
          districtCode || ''
        )}&district=${encodeURIComponent(districtName || '')}`
      );
      if (!res.ok) throw new Error('Failed to fetch district places');
      const json = await res.json();
      const data = json.data || [];
      placesCache.set(cacheKey, data);
      return data;
    } catch {
      return [];
    } finally {
      placesInFlight.delete(cacheKey);
    }
  })();

  placesInFlight.set(cacheKey, inFlight);
  return inFlight;
}

// ─────────────────────────────────────────────────────────────
// Compatibility Aliases for any existing callers (100% dynamic)
// ─────────────────────────────────────────────────────────────
export async function fetchStates() {
  const list = await fetchLgdStates();
  return list.map((s) => ({ name: s.name, code: s.code }));
}

export async function fetchDistricts(state: string) {
  const list = await fetchLgdDistricts(state);
  return list.map((d) => d.name);
}

export async function fetchCities(state: string, district: string) {
  const list = await fetchLgdSubdistricts('', district);
  return list.map((s) => s.name);
}

export async function fetchVillages(district: string, city: string) {
  const list = await fetchLgdPanchayats(city, district);
  return list.map((p) => p.name);
}

export function getIndianStates(): LocationItem[] {
  return [];
}

export interface ReverseGeocodeResult {
  state: string;
  district: string;
  place: string;
  taluk?: string;
  pincode?: string;
  displayName: string;
  lat: string;
  lng: string;
}

/**
 * 8. Reverse Geocode live GPS coordinates to State, District, Village/City, and Pincode
 */
export async function reverseGeocodeGps(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  try {
    const res = await fetch(`/api/locations?type=reverse-geocode&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`);
    if (!res.ok) throw new Error('Failed to reverse geocode');
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export interface SearchLocationResult {
  place: string;
  district: string;
  state: string;
  pincode?: string;
  type?: string;
  lat?: string;
  lng?: string;
}

/**
 * 9. Search any village, town, or city across Tamil Nadu / India dynamically
 */
export async function searchLocations(query: string): Promise<SearchLocationResult[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`/api/locations?type=search&q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

