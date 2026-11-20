export interface WeatherDistrict {
  id: string;
  District_Name: string;
  tamil_dist_name: string;
}

export interface WeatherBlock {
  block_id: string;
  block_name: string;
  block_reg_name: string;
}

export interface WeatherForecastDay {
  forecast_date: string;
  rainfall: string;
  humidity: string;
  humidity2: string;
  temperature_max: string;
  temperature_min: string;
  wind_speed: string;
  wind_direction: string;
  cloud_cover: string;
  is_today?: boolean;
  current_temperature?: string;
}

export interface WeatherAdvisoryItem {
  category_name: string;
  crop_name: string;
  weather_summary_eng?: string;
  weather_summary_reg?: string;
  general_advisory_eng?: string;
  general_advisory_reg?: string;
  advisory_eng?: string;
  advisory_reg?: string;
}

export interface WeatherDashboardData {
  status: string;
  district: {
    district_id: string;
    district_name: string;
    district_reg_name: string;
  };
  blocks: WeatherBlock[];
  block_id: string;
  forecast_issue_date?: string;
  forecast: WeatherForecastDay[];
  advisory_date?: string;
  advisory?: WeatherAdvisoryItem[];
  last_sync?: string;
}

export interface WeatherApiResponse {
  success: boolean;
  districts: WeatherDistrict[];
  dashboard: WeatherDashboardData | null;
  resolvedDistrictId: string;
  resolvedBlockId: string;
  fetchedAt: string;
  error?: string;
}

export interface SavedWeatherLocation {
  districtId?: string;
  blockId?: string;
  districtName?: string;
  blockName?: string;
}

export const WEATHER_LOCATION_STORAGE_KEY = 'farmhub_weather_location';
export const WEATHER_LOCATION_EVENT = 'farmhub_weather_location_updated';

const DISTRICT_ALIASES: Record<string, string> = {
  tuticorin: 'thoothukkudi',
  thoothukudi: 'thoothukkudi',
  trichy: 'tiruchirappalli',
  trichinopoly: 'tiruchirappalli',
  tiruchirapalli: 'tiruchirappalli',
  tanjore: 'thanjavur',
  kanyakumari: 'kanniyakumari',
  nilgiris: 'the-nilgiris',
  the_nilgiris: 'the-nilgiris',
  ooty: 'the-nilgiris',
  udhagamandalam: 'the-nilgiris',
  ranipet: 'ranippettai',
  tirupattur: 'tiruppattur',
  tiruppur: 'tiruppur',
  tirupur: 'tiruppur',
  viluppuram: 'villupuram',
  tiruvallur: 'thiruvallur',
  tiruvarur: 'thiruvarur',
  pondicherry: 'puducherry',
  sivagangai: 'sivaganga',
};

export function normalizeLocationToken(val: string | undefined | null): string {
  return String(val || '')
    .toLowerCase()
    .replace(/\bdistrict\b|\btaluk\b|\bblock\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function matchDistrictFromList(
  districts: WeatherDistrict[],
  districtName?: string,
  districtId?: string
): WeatherDistrict | undefined {
  if (!Array.isArray(districts) || districts.length === 0) return undefined;

  if (districtId) {
    const byId = districts.find((d) => String(d.id) === String(districtId));
    if (byId) return byId;
  }

  if (districtName) {
    const rawNorm = normalizeLocationToken(districtName);
    const aliasNorm = DISTRICT_ALIASES[rawNorm]
      ? normalizeLocationToken(DISTRICT_ALIASES[rawNorm])
      : rawNorm;

    const exact = districts.find((d) => {
      const n = normalizeLocationToken(d.District_Name);
      return n === rawNorm || n === aliasNorm;
    });
    if (exact) return exact;

    const partial = districts.find((d) => {
      const n = normalizeLocationToken(d.District_Name);
      return (rawNorm.length >= 4 && (n.includes(rawNorm) || rawNorm.includes(n))) ||
        (aliasNorm.length >= 4 && (n.includes(aliasNorm) || aliasNorm.includes(n)));
    });
    if (partial) return partial;
  }

  // Default fallback: Thanjavur (620) if available, otherwise first item
  return (
    districts.find((d) => String(d.id) === '620') ||
    districts.find((d) => normalizeLocationToken(d.District_Name) === 'thanjavur') ||
    districts[0]
  );
}

export function matchBlockFromList(
  blocks: WeatherBlock[],
  blockName?: string,
  blockId?: string
): WeatherBlock | undefined {
  if (!Array.isArray(blocks) || blocks.length === 0) return undefined;

  if (blockId) {
    const byId = blocks.find((b) => String(b.block_id) === String(blockId));
    if (byId) return byId;
  }

  if (blockName) {
    const target = normalizeLocationToken(blockName);
    if (target.length >= 3) {
      const exact = blocks.find((b) => normalizeLocationToken(b.block_name) === target);
      if (exact) return exact;

      const partial = blocks.find((b) => {
        const bNorm = normalizeLocationToken(b.block_name);
        return bNorm.includes(target) || target.includes(bNorm);
      });
      if (partial) return partial;
    }
  }

  return undefined;
}

export function getCompassDirection(degInput: string | number | undefined): string {
  const deg = Number(degInput);
  if (!Number.isFinite(deg)) return 'N';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[idx];
}

export interface WeatherConditionInfo {
  emoji: string;
  labelEn: string;
  labelTa: string;
}

export function normalizeWeatherConditionText(
  rawCondition: string,
  precipMm: number = 0,
  chancePct: number = 0,
  cloudCoverPct: number = 50
): string {
  const cond = (rawCondition || '').trim();
  const lower = cond.toLowerCase();

  // 1. Thunderstorm / Severe
  if (/thunder|storm|cyclone|squall|tornado|lightning/i.test(lower)) {
    return 'Thunderstorm';
  }

  // 2. Heavy continuous rain (precip >= 5mm or torrential)
  if (/heavy rain|torrential/i.test(lower) || precipMm >= 5.0) {
    return 'Heavy Rain';
  }

  // 3. Moderate rain (precip >= 2.5mm and chance >= 60%)
  if (/moderate rain/i.test(lower) || (precipMm >= 2.5 && chancePct >= 60)) {
    return 'Moderate Rain';
  }

  // 4. Drizzle Rain / Light Drizzle (Open-Meteo WMO 51, 53, 55 or MCP "Light drizzle")
  if (/drizzle/i.test(lower)) {
    // If there is actual drizzle/precipitation (>= 0.5mm or rain chance >= 50%)
    if (precipMm >= 0.5 || chancePct >= 50) {
      return 'Drizzle Rain';
    }
    // If it's merely a trace (< 0.5mm) with low chance, categorize by sky cover
    if (cloudCoverPct >= 75) return 'Overcast';
    if (cloudCoverPct >= 40) return 'Cloudy';
    return 'Partly Sunny';
  }

  // 5. Patchy rain / light rain showers / slight rain (WMO 61, 80)
  if (/patchy rain|slight rain|light rain|passing shower/i.test(lower)) {
    if (precipMm >= 1.5 || (precipMm >= 0.5 && chancePct >= 55)) {
      return 'Light Rain';
    }
    // Low precipitation: show dominant sky cover
    if (cloudCoverPct >= 75) return 'Cloudy';
    if (cloudCoverPct >= 35) return 'Partly Sunny';
    return 'Mostly Sunny';
  }

  // 6. Fog / Mist / Haze
  if (/fog/i.test(lower)) return 'Fog';
  if (/mist/i.test(lower)) return 'Mist';
  if (/haze|smoke/i.test(lower)) return cloudCoverPct < 40 ? 'Hazy Sunshine' : 'Hazy';

  // 7. Sky Cover: Overcast / Cloudy / Partly Cloudy / Sunny / Clear Sky
  if (/overcast/i.test(lower)) return 'Overcast';
  if (/partly/i.test(lower)) return 'Partly Sunny';
  if (/cloudy/i.test(lower)) return 'Cloudy';
  if (/mainly clear|mostly sunny/i.test(lower)) return 'Mostly Sunny';
  if (/clear|sunny/i.test(lower)) return 'Clear / Sunny';

  return cond || 'Partly Sunny';
}

export function getWeatherCondition(
  rainfallInput: string | number,
  cloudInput: string | number,
  conditionTextInput?: string
): WeatherConditionInfo {
  const rain = Number(rainfallInput) || 0;
  const cloud = Number(cloudInput) || 0;
  const condText = (conditionTextInput || '').toLowerCase();

  // If condition text is explicitly provided from MCP weather, prioritize it
  if (condText) {
    if (/thunder|storm|squall|cyclone/i.test(condText)) {
      return { emoji: '⛈️', labelEn: 'Thunderstorm', labelTa: 'இடி மின்னலுடன் கூடிய மழை' };
    }
    if (/heavy rain/i.test(condText) || rain >= 10) {
      return { emoji: '⛈️', labelEn: 'Heavy Rain', labelTa: 'பலத்த மழை' };
    }
    if (/moderate rain/i.test(condText) || rain >= 3.0) {
      return { emoji: '🌧️', labelEn: 'Moderate Rain', labelTa: 'மிதமான மழை' };
    }
    if (/drizzle/i.test(condText)) {
      return { emoji: '🌦️', labelEn: 'Drizzle Rain', labelTa: 'தூறல் மழை' };
    }
    if (/light rain|shower/i.test(condText) && (rain >= 1.0 || rain === 0)) {
      return { emoji: '🌦️', labelEn: 'Light Rain', labelTa: 'லேசான மழை' };
    }
    if (/overcast/i.test(condText)) {
      return { emoji: '☁️', labelEn: 'Overcast', labelTa: 'அடர் மேகமூட்டம்' };
    }
    if (/partly sunny|partly cloudy/i.test(condText)) {
      return { emoji: '⛅', labelEn: 'Partly Sunny', labelTa: 'பகுதி வெயில் / மேகமூட்டம்' };
    }
    if (/cloudy/i.test(condText)) {
      return { emoji: '☁️', labelEn: 'Cloudy', labelTa: 'மேகமூட்டம்' };
    }
    if (/sunny|clear/i.test(condText)) {
      return { emoji: '☀️', labelEn: 'Clear / Sunny', labelTa: 'வெயில் / தெளிவான வானம்' };
    }
    if (/haze|mist|fog/i.test(condText)) {
      return { emoji: '🌫️', labelEn: 'Haze / Mist', labelTa: 'மூடுபனி' };
    }
  }

  // Numeric fallback with realistic thresholds
  if (rain >= 12) {
    return { emoji: '⛈️', labelEn: 'Heavy Rain', labelTa: 'பலத்த மழை' };
  }
  if (rain >= 3.0) {
    return { emoji: '🌧️', labelEn: 'Moderate Rain', labelTa: 'மிதமான மழை' };
  }
  if (rain >= 1.0) {
    return { emoji: '🌦️', labelEn: 'Drizzle Rain', labelTa: 'தூறல் மழை' };
  }
  if (cloud >= 7) {
    return { emoji: '☁️', labelEn: 'Overcast', labelTa: 'மேகமூட்டம்' };
  }
  if (cloud >= 3) {
    return { emoji: '⛅', labelEn: 'Partly Sunny', labelTa: 'பகுதி வெயில்' };
  }
  return { emoji: '☀️', labelEn: 'Clear / Sunny', labelTa: 'வெயில் / தெளிவான வானம்' };
}

export function cleanAdvisoryLines(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .replace(/\uf076|\u2022|•|/g, '\n• ')
    .replace(/\t+/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-*]+/, '').trim())
    .filter(Boolean);
}

export function readSavedWeatherLocation(): SavedWeatherLocation {
  if (typeof window === 'undefined') return {};

  try {
    const weatherSaved = localStorage.getItem(WEATHER_LOCATION_STORAGE_KEY);
    if (weatherSaved) {
      const parsed = JSON.parse(weatherSaved);
      if (parsed && (parsed.districtId || parsed.districtName)) {
        return {
          districtId: parsed.districtId ? String(parsed.districtId) : undefined,
          blockId: parsed.blockId ? String(parsed.blockId) : undefined,
          districtName: parsed.districtName ? String(parsed.districtName) : undefined,
          blockName: parsed.blockName ? String(parsed.blockName) : undefined,
        };
      }
    }

    const farmerLoc =
      localStorage.getItem('farmhub_farmer_location') ||
      localStorage.getItem('agripulse_farmer_location');
    if (farmerLoc) {
      const parsed = JSON.parse(farmerLoc);
      if (parsed && (parsed.district || parsed.place)) {
        return {
          districtName: parsed.district ? String(parsed.district) : undefined,
          blockName: parsed.place ? String(parsed.place) : undefined,
        };
      }
    }

    const userStr =
      localStorage.getItem('farmhub_user') ||
      localStorage.getItem('agripulse_user');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u && (u.district || u.city)) {
        return {
          districtName: u.district ? String(u.district) : undefined,
          blockName: u.city ? String(u.city) : undefined,
        };
      }
    }
  } catch {
    // Ignore malformed localStorage entries
  }

  return {};
}

export function persistWeatherLocation(loc: SavedWeatherLocation): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WEATHER_LOCATION_STORAGE_KEY, JSON.stringify(loc));
    window.dispatchEvent(new CustomEvent(WEATHER_LOCATION_EVENT, { detail: loc }));
  } catch {
    // Ignore storage quota errors
  }
}

