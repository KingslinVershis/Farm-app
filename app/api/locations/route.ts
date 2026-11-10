import { NextRequest, NextResponse } from 'next/server';

/**
 * ═════════════════════════════════════════════════════════════════════
 * PREVIOUS LOCATION LOGIC (COMMENTED OUT AS REQUESTED BY USER)
 * ═════════════════════════════════════════════════════════════════════
 * import { State, City } from 'country-state-city';
 * 
 * const cache = new Map<string, { data: string[]; timestamp: number }>();
 * const CACHE_TTL_MS = 60 * 60 * 1000;
 * 
 * function resolveStateIso(stateInput: string): string {
 *   if (!stateInput) return 'TN';
 *   const trimmed = stateInput.trim().toLowerCase();
 *   const states = State.getStatesOfCountry('IN');
 *   const matched = states.find(
 *     (s) => s.name.toLowerCase() === trimmed || s.isoCode.toLowerCase() === trimmed
 *   );
 *   return matched ? matched.isoCode : 'TN';
 * }
 * 
 * async function fetchPostalData(query: string): Promise<any[]> {
 *   try {
 *     const controller = new AbortController();
 *     const timer = setTimeout(() => controller.abort(), 3500);
 *     const res = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(query)}`, {
 *       signal: controller.signal,
 *       headers: { Accept: 'application/json', 'User-Agent': 'FarmHub/1.0' },
 *       next: { revalidate: 3600 },
 *     });
 *     clearTimeout(timer);
 *     if (!res.ok) return [];
 *     const json = await res.json();
 *     if (Array.isArray(json) && json[0]?.Status === 'Success' && Array.isArray(json[0]?.PostOffice)) {
 *       return json[0].PostOffice;
 *     }
 *   } catch (err) {}
 *   return [];
 * }
 * ═════════════════════════════════════════════════════════════════════
 */

// LGD API Base URL (derived from Government of India's Local Government Directory)
// GitHub: https://github.com/kalyangupta12/indian-cities-data
const LGD_API_BASE = 'https://lgd-json-api.vercel.app/api';

// In-memory cache for dynamic API responses (to prevent rate limits and ensure fast UX)
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Helper to query LGD API dynamically
async function fetchLgdApi(endpoint: string): Promise<any> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(`${LGD_API_BASE}${endpoint}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

// Helper to query India Postal live API dynamically (zero static pincodes or village names)
async function fetchPostalDynamic(query: string): Promise<any[]> {
  const trimmed = (query || '').trim();
  if (!trimmed) return [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const isPincode = /^\d{6}$/.test(trimmed);
    const url = isPincode
      ? `https://api.postalpincode.in/pincode/${encodeURIComponent(trimmed)}`
      : `https://api.postalpincode.in/postoffice/${encodeURIComponent(trimmed)}`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json) && json[0]?.Status === 'Success' && Array.isArray(json[0]?.PostOffice)) {
      return json[0].PostOffice;
    }
  } catch (err) { }
  return [];
}

// In-memory cache for raw LGD CSV files to ensure instantaneous sub-millisecond parsing
let cachedMunicipalDirText: string | null = null;
let cachedBlocksText: string | null = null;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}


async function getMunicipalDirectoryText(): Promise<string> {
  if (cachedMunicipalDirText) return cachedMunicipalDirText;
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/planemad/india-local-government-directory/main/municipal-directory.csv',
      { headers: { Accept: 'text/plain' }, next: { revalidate: 86400 } }
    );
    if (res.ok) {
      cachedMunicipalDirText = await res.text();
      return cachedMunicipalDirText;
    }
  } catch (err) { }
  return '';
}

async function getBlocksText(): Promise<string> {
  if (cachedBlocksText) return cachedBlocksText;
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/planemad/india-local-government-directory/main/administrative/blocks.csv',
      { headers: { Accept: 'text/plain' }, next: { revalidate: 86400 } }
    );
    if (res.ok) {
      cachedBlocksText = await res.text();
      return cachedBlocksText;
    }
  } catch (err) { }
  return '';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'states';
  const stateCode = searchParams.get('stateCode') || '33'; // Default 33 (Tamil Nadu)
  let districtCode = searchParams.get('districtCode') || '';
  const districtName = searchParams.get('district')?.trim() || '';
  const talukName = searchParams.get('taluk')?.trim() || '';
  const ulbCategory = searchParams.get('category')?.trim() || ''; // corporation | municipality | town_panchayat
  const panchayatName = searchParams.get('panchayat')?.trim() || '';
  const searchQuery = searchParams.get('q')?.trim() || '';

  const cacheKey = `${type}:${stateCode}:${districtCode}:${districtName}:${talukName}:${ulbCategory}:${panchayatName}:${searchQuery}`.toLowerCase();
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, type, data: cached.data });
  }

  // 0. LIVE REVERSE GEOCODING FROM LAT/LNG (OpenStreetMap Nominatim)
  if (type === 'reverse-geocode' || type === 'gps') {
    const lat = searchParams.get('lat')?.trim();
    const lng = searchParams.get('lng')?.trim() || searchParams.get('lon')?.trim();

    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const gpsCacheKey = `reverse-geocode:${lat}:${lng}`.toLowerCase();
    const gpsCached = memoryCache.get(gpsCacheKey);
    if (gpsCached && Date.now() - gpsCached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, type, data: gpsCached.data });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
          lat
        )}&lon=${encodeURIComponent(lng)}&addressdetails=1`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'FarmHub-FarmOS/1.0 (Farm Management OS; contact@farmhub.farm)',
            Accept: 'application/json',
            'Accept-Language': 'en-IN,en;q=0.9',
          },
        }
      );

      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const address = json?.address || {};

        const rawState = address.state || address.region || '';
        let rawDistrict =
          address.state_district || address.district || address.county || '';
        rawDistrict = rawDistrict.replace(/\s+District$/i, '').trim();

        const rawPlace =
          address.village ||
          address.town ||
          address.city ||
          address.suburb ||
          address.hamlet ||
          address.municipality ||
          address.neighbourhood ||
          '';

        const rawTaluk = (
          address.taluk ||
          address.tehsil ||
          address.subdistrict ||
          ''
        )
          .replace(/\s+(Taluk|Tehsil)$/i, '')
          .trim();

        const pincode = address.postcode || '';

        const locationData = {
          state: rawState,
          district: rawDistrict,
          place: rawPlace,
          taluk: rawTaluk,
          pincode,
          displayName: json.display_name || '',
          lat,
          lng,
        };

        memoryCache.set(gpsCacheKey, { data: locationData, timestamp: Date.now() });
        return NextResponse.json({ success: true, type, data: locationData });
      }
    } catch (err: any) {
      console.warn('Reverse geocoding error:', err?.message);
    }

    return NextResponse.json(
      { success: false, error: 'Unable to resolve GPS location' },
      { status: 500 }
    );
  }

  // 0.5 GLOBAL PLACE & VILLAGE SEARCH (Auto-resolves Kovilpatti, Tenkasi, etc.)
  if (type === 'search' || type === 'quick-search') {
    const query = (searchParams.get('q') || searchQuery).trim();
    if (!query) {
      return NextResponse.json({ success: true, type, data: [] });
    }

    const searchCacheKey = `search:${query}`.toLowerCase();
    const cachedSearch = memoryCache.get(searchCacheKey);
    if (cachedSearch && Date.now() - cachedSearch.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, type, data: cachedSearch.data });
    }

    try {
      const matches: any[] = [];
      const seen = new Set<string>();

      // 1. Direct Postal Lookup (100% dynamic across all postal circles in India)
      const postalResults = await fetchPostalDynamic(query);
      for (const p of postalResults) {
        const placeName = p.Name;
        const district = (p.District || '').trim();
        const state = (p.State || '').trim();
        const pincode = p.Pincode || '';
        const key = `${placeName}:${district}:${state}`.toLowerCase();

        if (!seen.has(key)) {
          seen.add(key);
          matches.push({
            place: placeName,
            district,
            state,
            pincode,
            type: p.BranchType || 'Post Office Village',
          });
        }
      }

      // 2. OpenStreetMap Search fallback or complement (100% dynamic)
      if (matches.length < 5) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const osmRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              query
            )}&countrycodes=in&addressdetails=1&limit=8`,
            {
              signal: controller.signal,
              headers: {
                'User-Agent': 'FarmHub-FarmOS/1.0 (Farm Management OS; contact@farmhub.farm)',
                Accept: 'application/json',
              },
            }
          );
          clearTimeout(timeout);
          if (osmRes.ok) {
            const osmJson = await osmRes.json();
            for (const item of osmJson) {
              const addr = item.address || {};
              const placeName = item.name || addr.village || addr.town || addr.city || '';
              let district = addr.state_district || addr.district || addr.county || '';
              district = district.replace(/\s+District$/i, '').trim();
              const state = (addr.state || '').trim();
              const key = `${placeName}:${district}:${state}`.toLowerCase();
              if (placeName && !seen.has(key)) {
                seen.add(key);
                matches.push({
                  place: placeName,
                  district,
                  state,
                  pincode: addr.postcode || '',
                  type: item.type ? `${item.type.charAt(0).toUpperCase() + item.type.slice(1)}` : 'Town',
                  lat: item.lat,
                  lng: item.lon,
                });
              }
            }
          }
        } catch {}
      }

      memoryCache.set(searchCacheKey, { data: matches, timestamp: Date.now() });
      return NextResponse.json({ success: true, type, data: matches });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err?.message || 'Search error' }, { status: 500 });
    }
  }

  // 1. DYNAMIC STATES ENDPOINT (Purely from LGD API)
  if (type === 'states' || type === 'lgd-states') {
    const json = await fetchLgdApi('/states?limit=50');
    const rawList = json?.data || [];
    const states = rawList.map((s: any) => ({
      code: String(s.code),
      name: s.name,
      type: s.type,
    })).sort((a: any, b: any) => a.name.localeCompare(b.name));

    memoryCache.set(cacheKey, { data: states, timestamp: Date.now() });
    return NextResponse.json({ success: true, type, data: states });
  }

  // 2. DYNAMIC DISTRICTS ENDPOINT (Purely from LGD API)
  if (type === 'districts' || type === 'lgd-districts') {
    const code = stateCode || '33';
    const json = await fetchLgdApi(`/districts?stateCode=${code}&limit=100`);
    const rawList = json?.data || [];
    const districts = rawList.map((d: any) => ({
      code: String(d.code),
      name: d.name,
      stateCode: String(d.stateCode || code),
    })).sort((a: any, b: any) => a.name.localeCompare(b.name));

    memoryCache.set(cacheKey, { data: districts, timestamp: Date.now() });
    return NextResponse.json({ success: true, type, data: districts });
  }

  // 3. RURAL PATHWAY: SUBDISTRICTS (Taluks / Blocks purely from LGD API)
  if (type === 'subdistricts' || type === 'taluks' || type === 'lgd-subdistricts') {
    // If districtCode is missing but districtName is provided, query LGD dynamically to find districtCode
    if (!districtCode && districtName) {
      const distSearch = await fetchLgdApi(`/districts?q=${encodeURIComponent(districtName)}`);
      const matched = distSearch?.data?.find(
        (d: any) => d.name.toLowerCase() === districtName.toLowerCase()
      ) || distSearch?.data?.[0];
      if (matched?.code) {
        districtCode = String(matched.code);
      }
    }

    let subdistricts: any[] = [];
    if (districtCode) {
      const json = await fetchLgdApi(`/subdistricts?districtCode=${districtCode}&limit=100`);
      subdistricts = json?.data || [];
    }

    const result = subdistricts.map((s: any) => ({
      code: String(s.code),
      name: s.name,
    })).sort((a: any, b: any) => a.name.localeCompare(b.name));

    memoryCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json({ success: true, type, data: result });
  }

  // 4. RURAL PATHWAY: GRAM PANCHAYATS / VILLAGES (Purely dynamic from live Postal API)
  if (type === 'panchayats' || type === 'villages' || type === 'lgd-panchayats') {
    const query = searchQuery || talukName || districtName;
    let allRecords = await fetchPostalDynamic(query);

    // If query by taluk returned empty and districtName exists, try querying by district
    if (allRecords.length === 0 && districtName && districtName.toLowerCase() !== query.toLowerCase()) {
      allRecords = await fetchPostalDynamic(districtName);
    }

    const uniqueMap = new Map<string, any>();
    for (const p of allRecords) {
      const name = (p.Name || '').trim();
      if (!name) continue;

      // Filter out if name equals district name
      if (districtName && name.toLowerCase() === districtName.toLowerCase()) continue;

      if (!uniqueMap.has(name)) {
        uniqueMap.set(name, {
          name,
          pincode: p.Pincode || '',
          block: p.Block || p.Taluk || talukName || '',
          type: p.BranchType || 'Gram Panchayat',
        });
      }
    }

    const result = Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    memoryCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json({ success: true, type, data: result });
  }

  // 5. URBAN PATHWAY: URBAN LOCAL BODIES (Purely dynamic from LGD Cities API)
  if (type === 'ulb' || type === 'cities' || type === 'lgd-ulb') {
    const code = stateCode || '33';
    let cities: any[] = [];

    // Query LGD cities
    const json = await fetchLgdApi(`/cities?stateCode=${code}&limit=100`);
    cities = json?.data || [];

    // Filter dynamically by category if requested
    // typeCode '1' | '3' = Corporation, '5' = Municipality, '7' = Town Panchayat
    if (ulbCategory === 'corporation') {
      cities = cities.filter((c: any) => c.typeCode === '1' || c.typeCode === '3');
    } else if (ulbCategory === 'municipality') {
      cities = cities.filter((c: any) => c.typeCode === '5');
    } else if (ulbCategory === 'town_panchayat') {
      cities = cities.filter((c: any) => c.typeCode === '7');
    }

    const result = cities.map((c: any) => ({
      code: String(c.code),
      name: c.name,
      type: c.type || (c.typeCode === '5' ? 'Municipality' : c.typeCode === '7' ? 'Town Panchayat' : 'Corporation'),
    })).sort((a: any, b: any) => a.name.localeCompare(b.name));

    memoryCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json({ success: true, type, data: result });
  }

  // 6. WARDS ENDPOINT (Purely dynamic sequence)
  if (type === 'wards' || type === 'lgd-wards') {
    const wards = Array.from({ length: 20 }, (_, i) => `Ward ${i + 1}`);
    return NextResponse.json({ success: true, type, data: wards });
  }

  // 7. ALL CITIES & VILLAGES OF THE DISTRICT (Strictly filtered to the selected district only)
  if (type === 'places' || type === 'cities-and-villages') {
    // 1. Resolve districtCode if missing, with alias mapping support
    if (!districtCode && districtName) {
      let queryDistrict = districtName;
      const lower = districtName.toLowerCase().trim();
      if (lower === 'tuticorin' || lower.includes('tuticorin')) {
        queryDistrict = 'Thoothukkudi';
      } else if (lower.includes('trichy')) {
        queryDistrict = 'Tiruchirappalli';
      } else if (lower.includes('kanchipuram')) {
        queryDistrict = 'Kancheepuram';
      } else if (lower.includes('kanyakumari')) {
        queryDistrict = 'Kanniyakumari';
      } else if (lower.includes('villupuram')) {
        queryDistrict = 'Viluppuram';
      } else if (lower.includes('nellai')) {
        queryDistrict = 'Tirunelveli';
      } else if (lower === 'bangalore' || lower.includes('bangalore')) {
        queryDistrict = 'Bengaluru Urban';
      }

      const distSearch = await fetchLgdApi(`/districts?q=${encodeURIComponent(queryDistrict)}`);
      const matched = distSearch?.data?.find(
        (d: any) => d.name.toLowerCase() === queryDistrict.toLowerCase() ||
                    d.name.toLowerCase().includes(queryDistrict.toLowerCase())
      ) || distSearch?.data?.[0];
      if (matched?.code) {
        districtCode = String(matched.code);
      }
    }

    interface PlaceRecord {
      name: string;
      type: string;
      pincode?: string;
    }

    // Simple deduplication by exact lowercased name — no transliteration or canonicalization
    const uniquePlaces = new Map<string, PlaceRecord>();

    const addPlace = (rawName: string, type: string, pincode?: string) => {
      if (!rawName || !rawName.trim()) return;
      const name = rawName.trim();
      const key = name.toLowerCase();

      // Skip if the place name equals the district name itself
      if (districtName && key === districtName.toLowerCase()) return;

      if (!uniquePlaces.has(key)) {
        uniquePlaces.set(key, { name, type, pincode });
      } else {
        const existing = uniquePlaces.get(key)!;
        // Prefer higher-rank type
        const isHigherType =
          (type.includes('Town') || type.includes('Municipality') || type.includes('Taluk') || type.includes('Tehsil')) &&
          !existing.type.includes('Town') &&
          !existing.type.includes('Municipality') &&
          !existing.type.includes('Taluk');
        if (isHigherType) existing.type = type;
        if (pincode && !existing.pincode) existing.pincode = pincode;
      }
    }

    // 2. Fetch LGD subdistricts (taluks / tehsils) strictly for this districtCode
    if (districtCode) {
      const subJson = await fetchLgdApi(`/subdistricts?districtCode=${districtCode}&limit=100`);
      if (subJson?.data) {
        for (const s of subJson.data) {
          addPlace(s.name, 'Taluk / Tehsil');
        }
      }
    }

    // 3. Fetch LGD Municipal Directory (Cities, Municipalities, Towns, Villages) strictly for this districtCode
    if (districtCode) {
      const muniCsv = await getMunicipalDirectoryText();
      if (muniCsv) {
        const lines = muniCsv.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const cols = parseCSVLine(line);
          if (cols[5] === districtCode) {
            addPlace(cols[3], 'Town / Municipality');
            addPlace(cols[8], 'Taluk');
            addPlace(cols[10], 'Village');
          }
        }
      }
    }

    // 4. Fetch LGD Community Development Blocks strictly for this districtCode
    if (districtCode) {
      const blocksCsv = await getBlocksText();
      if (blocksCsv) {
        const lines = blocksCsv.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          const cols = line.split(',');
          // S.No.,State Code,State Name,District Code,District Name,Block Code,Block Version,Block Name
          if (cols[3] === districtCode) {
            addPlace(cols[7], 'Community Block');
          }
        }
      }
    }

    // 5. Postal records strictly matching the selected district
    if (districtName) {
      const postalRecords = await fetchPostalDynamic(districtName);
      for (const p of postalRecords) {
        const pDistrict = (p.District || '').toLowerCase().trim();
        const dName = districtName.toLowerCase().trim();
        const isDistrictMatch =
          pDistrict === dName ||
          pDistrict.includes(dName) ||
          (dName.includes('tenkasi') && pDistrict.includes('tirunelveli')) ||
          (dName.includes('chengalpattu') && pDistrict.includes('kancheepuram')) ||
          (dName.includes('ranipet') && pDistrict.includes('vellore')) ||
          (dName.includes('tirupathur') && pDistrict.includes('vellore')) ||
          (dName.includes('kallakurichi') && pDistrict.includes('viluppuram'));

        if (isDistrictMatch) {
          addPlace(p.Name, p.BranchType || 'Post Office Village', p.Pincode || undefined);
        }
      }
    }

    const result = Array.from(uniquePlaces.values()).sort((a, b) => a.name.localeCompare(b.name));
    memoryCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json({ success: true, type, data: result });
  }

  return NextResponse.json({ success: false, error: 'Invalid location type' }, { status: 400 });
}
