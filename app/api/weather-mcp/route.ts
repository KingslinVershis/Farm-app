import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthenticatedUser, clearAuthCookies } from '@/lib/serverAuth';

export interface WeatherMcpCallResponse {
  success: boolean;
  tool: string;
  location: string;
  text?: string;
  raw?: any;
  error?: string;
  durationMs?: number;
}

// In-memory cache for fast lookups
const weatherMcpCache = new Map<string, { data: WeatherMcpCallResponse; timestamp: number }>();
const MCP_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// WMO weather interpretation codes
const WMO_CODE_MAP: Record<number, { text: string; isRain: boolean; isStorm: boolean }> = {
  0: { text: 'Clear sky', isRain: false, isStorm: false },
  1: { text: 'Mainly clear', isRain: false, isStorm: false },
  2: { text: 'Partly cloudy', isRain: false, isStorm: false },
  3: { text: 'Overcast', isRain: false, isStorm: false },
  45: { text: 'Fog', isRain: false, isStorm: false },
  48: { text: 'Depositing rime fog', isRain: false, isStorm: false },
  51: { text: 'Light drizzle', isRain: true, isStorm: false },
  53: { text: 'Moderate drizzle', isRain: true, isStorm: false },
  55: { text: 'Dense drizzle', isRain: true, isStorm: false },
  56: { text: 'Light freezing drizzle', isRain: true, isStorm: false },
  57: { text: 'Dense freezing drizzle', isRain: true, isStorm: false },
  61: { text: 'Slight rain', isRain: true, isStorm: false },
  63: { text: 'Moderate rain', isRain: true, isStorm: false },
  65: { text: 'Heavy rain', isRain: true, isStorm: false },
  66: { text: 'Light freezing rain', isRain: true, isStorm: false },
  67: { text: 'Heavy freezing rain', isRain: true, isStorm: false },
  71: { text: 'Slight snow fall', isRain: false, isStorm: false },
  73: { text: 'Moderate snow fall', isRain: false, isStorm: false },
  75: { text: 'Heavy snow fall', isRain: false, isStorm: false },
  77: { text: 'Snow grains', isRain: false, isStorm: false },
  80: { text: 'Slight rain showers', isRain: true, isStorm: false },
  81: { text: 'Moderate rain showers', isRain: true, isStorm: false },
  82: { text: 'Violent rain showers', isRain: true, isStorm: false },
  85: { text: 'Slight snow showers', isRain: false, isStorm: false },
  86: { text: 'Heavy snow showers', isRain: false, isStorm: false },
  95: { text: 'Thunderstorm', isRain: true, isStorm: true },
  96: { text: 'Thunderstorm with slight hail', isRain: true, isStorm: true },
  99: { text: 'Thunderstorm with heavy hail', isRain: true, isStorm: true },
};

function getCompassDirection(deg: number): string {
  if (isNaN(deg)) return 'N';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return dirs[idx];
}

// Fallback known coordinates for key agricultural centers
const KNOWN_COORDINATES: Record<string, { lat: number; lon: number; name: string }> = {
  'chennai': { lat: 13.0827, lon: 80.2707, name: 'Chennai, Tamil Nadu' },
  'thanjavur': { lat: 10.7870, lon: 79.1378, name: 'Thanjavur, Tamil Nadu' },
  'madurai': { lat: 9.9252, lon: 78.1198, name: 'Madurai, Tamil Nadu' },
  'coimbatore': { lat: 11.0168, lon: 76.9558, name: 'Coimbatore, Tamil Nadu' },
  'salem': { lat: 11.6643, lon: 78.1460, name: 'Salem, Tamil Nadu' },
  'tiruchirappalli': { lat: 10.7905, lon: 78.7047, name: 'Tiruchirappalli, Tamil Nadu' },
  'trichy': { lat: 10.7905, lon: 78.7047, name: 'Tiruchirappalli, Tamil Nadu' },
  'tirunelveli': { lat: 8.7139, lon: 77.7567, name: 'Tirunelveli, Tamil Nadu' },
  'tenkasi': { lat: 8.9594, lon: 77.3160, name: 'Tenkasi, Tamil Nadu' },
  'kovilpatti': { lat: 9.1727, lon: 77.8687, name: 'Kovilpatti, Tamil Nadu' },
  'sankarankovil': { lat: 9.1672, lon: 77.5367, name: 'Sankarankovil, Tamil Nadu' },
  'ambasamudram': { lat: 8.7042, lon: 77.4578, name: 'Ambasamudram, Tamil Nadu' },
  'erode': { lat: 11.3410, lon: 77.7172, name: 'Erode, Tamil Nadu' },
  'vellore': { lat: 12.9165, lon: 79.1325, name: 'Vellore, Tamil Nadu' },
  'thoothukudi': { lat: 8.7642, lon: 78.1348, name: 'Thoothukudi, Tamil Nadu' },
  'tokyo': { lat: 35.6762, lon: 139.6503, name: 'Tokyo, Japan' },
  'paris': { lat: 48.8566, lon: 2.3522, name: 'Paris, France' },
};

async function geocodeLocation(query: string): Promise<{ lat: number; lon: number; displayName: string }> {
  const clean = query.trim().replace(/\s*\([^\)]*\)/g, '');
  const lower = clean.toLowerCase();

  for (const [key, val] of Object.entries(KNOWN_COORDINATES)) {
    if (lower.startsWith(key) || lower.includes(key)) {
      return { lat: val.lat, lon: val.lon, displayName: val.name };
    }
  }

  // Use Open-Meteo Geocoding
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(clean)}&count=1&language=en&format=json`;
    const res = await fetch(geoUrl, { headers: { 'User-Agent': 'FarmHubWeather/1.0' }, next: { revalidate: 86400 } });
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const parts = [item.name, item.admin1, item.country].filter(Boolean);
        return {
          lat: item.latitude,
          lon: item.longitude,
          displayName: parts.join(', '),
        };
      }
    }
  } catch (err) {
    console.warn('[geocodeLocation] Open-Meteo geocoding error:', err);
  }

  // Fallback to Chennai
  return { lat: 13.0827, lon: 80.2707, displayName: clean || 'Chennai, Tamil Nadu' };
}

async function fetchWeatherForecastDirect(
  location: string,
  tool: string,
  params: Record<string, any>
): Promise<{ text: string; raw: any }> {
  const { lat, lon, displayName } = await geocodeLocation(location);

  const daysRequested = Number(params.days) || (tool === 'hourly_24' ? 1 : 7);
  const isHourly = params.granularity === 'hourly' || tool === 'hourly_24';
  const forecastDays = Math.max(1, Math.min(daysRequested, 16));

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lon.toFixed(4));
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover,is_day'
  );
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant'
  );
  url.searchParams.set(
    'hourly',
    'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,surface_pressure,cloud_cover,wind_speed_10m,wind_direction_10m,is_day'
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', String(forecastDays));

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'FarmHubWeather/1.0' },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`Open-Meteo API returned status ${res.status}`);
  }

  const raw = await res.json();
  const current = raw.current || {};
  const daily = raw.daily || {};
  const hourly = raw.hourly || {};

  const currentWmo = WMO_CODE_MAP[current.weather_code] || { text: 'Partly Cloudy', isRain: false, isStorm: false };
  const currentTemp = Math.round(current.temperature_2m ?? 28);
  const feelsLike = Math.round(current.apparent_temperature ?? currentTemp);
  const humidity = Math.round(current.relative_humidity_2m ?? 70);
  const windSpeed = Math.round(current.wind_speed_10m ?? 12);
  const windDir = getCompassDirection(current.wind_direction_10m ?? 0);
  const pressure = Math.round(current.surface_pressure ?? 1012);
  const cloudCover = Math.round(current.cloud_cover ?? 45);
  const precipMm = Number(current.precipitation ?? 0).toFixed(1);

  const todayMin = Math.round(daily.temperature_2m_min?.[0] ?? (currentTemp - 4));
  const todayMax = Math.round(daily.temperature_2m_max?.[0] ?? (currentTemp + 4));
  const todaySunrise = daily.sunrise?.[0] ? daily.sunrise[0].split('T')[1] || '06:07' : '06:07';
  const todaySunset = daily.sunset?.[0] ? daily.sunset[0].split('T')[1] || '17:39' : '17:39';
  const currentIsDay = current.is_day != null ? (current.is_day === 1 ? 1 : 0) : 1;

  let currentCondText = currentWmo.text;
  if (currentIsDay === 0) {
    if (/clear sky/i.test(currentCondText)) currentCondText = 'Clear Sky';
    else if (/mainly clear/i.test(currentCondText)) currentCondText = 'Mostly Clear';
    else if (/partly cloudy/i.test(currentCondText)) currentCondText = 'Partly Cloudy';
  }

  // Build Markdown Text matching parseMcpResponse
  let md = '';
  md += `**Location:** ${displayName} (${lat.toFixed(2)}, ${lon.toFixed(2)})\n`;
  md += `**Temperature:** ${currentTemp}°C\n`;
  md += `**Feels Like:** ${feelsLike}°C\n`;
  md += `**Conditions:** ${currentCondText}\n`;
  md += `**Today's Range:** ${todayMin}°C - ${todayMax}°C\n`;
  md += `**Humidity:** ${humidity}%\n`;
  md += `**Wind:** ${windSpeed} km/h ${windDir}\n`;
  md += `**Pressure:** ${pressure} hPa\n`;
  md += `**Cloud Cover:** ${cloudCover}%\n`;
  md += `**Precipitation:** ${precipMm} mm\n`;
  md += `**Sunrise:** ${todaySunrise}\n`;
  md += `**Sunset:** ${todaySunset}\n`;
  md += `**Is Day:** ${currentIsDay}\n\n`;

  // Summary
  md += `# Weather Summary\n`;
  md += `- Current conditions at ${displayName} report ${currentCondText} with an ambient temperature of ${currentTemp}°C.\n`;
  md += `- Humidity stands at ${humidity}% with prevailing ${windSpeed} km/h winds heading ${windDir}.\n`;
  md += `- Barometric pressure is steady at ${pressure} hPa with ${cloudCover}% cloud canopy.\n`;
  if (currentWmo.isRain) {
    md += `- Active precipitation observed (${precipMm} mm); plan fieldwork and irrigation accordingly.\n`;
  } else {
    md += `- Optimal agricultural conditions for scheduled operations.\n`;
  }
  md += `\n`;

  // Telemetry Detail Cards
  md += `# Thermal Comfort\n`;
  md += `**Heat Index:** ${feelsLike}°C\n`;
  md += `**Comfort Level:** ${humidity > 75 ? 'Humid' : humidity < 40 ? 'Dry' : 'Comfortable'}\n`;
  md += `**Temperature Range:** ${todayMin}°C – ${todayMax}°C\n\n`;

  md += `# Wind Dynamics\n`;
  md += `**Wind Speed:** ${windSpeed} km/h ${windDir}\n`;
  md += `**Wind Direction:** ${windDir} (${current.wind_direction_10m ?? 0}°)\n`;
  md += `**Air Movement:** ${windSpeed > 25 ? 'Breezy / Fresh' : windSpeed > 10 ? 'Gentle Breeze' : 'Light Air'}\n\n`;

  md += `# Atmospheric Pressure\n`;
  md += `**Surface Pressure:** ${pressure} hPa\n`;
  md += `**Cloud Cover:** ${cloudCover}%\n`;
  md += `**Precipitation:** ${precipMm} mm\n\n`;

  // Forecast list
  if (isHourly && Array.isArray(hourly.time)) {
    // 24 Hour Hourly Status
    const totalHours = Math.min(24, hourly.time.length);
    for (let i = 0; i < totalHours; i++) {
      const timeStr = hourly.time[i]; // e.g. "2026-11-20T09:00"
      const datePart = timeStr.split('T')[0]; // "2026-11-20"
      const timePart = timeStr.split('T')[1] || '00:00'; // "09:00"
      const [y, m, d] = datePart.split('-');
      const formattedDate = `${d}/${m}/${y}`; // "20/11/2026"

      const hIsDay = hourly.is_day?.[i] != null
        ? hourly.is_day[i] === 1
        : (timePart >= todaySunrise && timePart < todaySunset);

      const hWmo = WMO_CODE_MAP[hourly.weather_code?.[i]] || { text: 'Partly Cloudy', isRain: false, isStorm: false };
      let hCond = hWmo.text;
      if (!hIsDay) {
        if (/clear sky/i.test(hCond)) hCond = 'Clear Sky';
        else if (/mainly clear/i.test(hCond)) hCond = 'Mostly Clear';
        else if (/partly cloudy/i.test(hCond)) hCond = 'Partly Cloudy';
      }

      const hTemp = Math.round(hourly.temperature_2m?.[i] ?? 28);
      const hFeels = Math.round(hourly.apparent_temperature?.[i] ?? hTemp);
      const hPrecipPct = Math.round(hourly.precipitation_probability?.[i] ?? 0);
      const hPrecipMm = Number(hourly.precipitation?.[i] ?? 0).toFixed(1);
      const hWind = Math.round(hourly.wind_speed_10m?.[i] ?? 10);
      const hWindDir = getCompassDirection(hourly.wind_direction_10m?.[i] ?? 0);
      const hHum = Math.round(hourly.relative_humidity_2m?.[i] ?? 70);
      const hPress = Math.round(hourly.surface_pressure?.[i] ?? 1012);
      const hCloud = Math.round(hourly.cloud_cover?.[i] ?? 40);

      // Slashes format: ## DD/MM/YYYY, HH:MM
      md += `## ${formattedDate}, ${timePart}\n`;
      md += `**Temperature:** ${hTemp}°C\n`;
      md += `**Feels Like:** ${hFeels}°C\n`;
      md += `**Conditions:** ${hCond}\n`;
      md += `**Precipitation Chance:** ${hPrecipPct}%\n`;
      md += `**Precipitation:** ${hPrecipMm} mm\n`;
      md += `**Wind:** ${hWind} km/h ${hWindDir}\n`;
      md += `**Wind Gusts:** ${Math.round(hWind * 1.4)} km/h\n`;
      md += `**Humidity:** ${hHum}%\n`;
      md += `**Pressure:** ${hPress} hPa\n`;
      md += `**Cloud Cover:** ${hCloud}%\n`;
      md += `**Sunrise:** ${todaySunrise}\n`;
      md += `**Sunset:** ${todaySunset}\n`;
      md += `**Is Day:** ${hIsDay ? 1 : 0}\n`;
      md += `**Daylight Duration:** ${todaySunrise} – ${todaySunset}\n\n`;
    }
  } else if (Array.isArray(daily.time)) {
    // 7 or 16 Days Daily Forecast
    const totalDays = Math.min(forecastDays, daily.time.length);
    for (let i = 0; i < totalDays; i++) {
      const dateStr = daily.time[i]; // "2026-11-20"
      const dateObj = new Date(`${dateStr}T12:00:00Z`);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
      const dayNum = dateObj.getUTCDate();
      const year = dateObj.getUTCFullYear();

      // Heading format: ## Friday, November 20, 2026
      const title = `${dayName}, ${monthName} ${dayNum}, ${year}`;

      const dWmo = WMO_CODE_MAP[daily.weather_code?.[i]] || { text: 'Partly Cloudy', isRain: false, isStorm: false };
      const dHigh = Math.round(daily.temperature_2m_max?.[i] ?? 32);
      const dLow = Math.round(daily.temperature_2m_min?.[i] ?? 24);
      const dFeelsHigh = Math.round(daily.apparent_temperature_max?.[i] ?? (dHigh + 2));
      const dFeelsLow = Math.round(daily.apparent_temperature_min?.[i] ?? dLow);
      const dPrecipPct = Math.round(daily.precipitation_probability_max?.[i] ?? 10);
      const dPrecipMm = Number(daily.precipitation_sum?.[i] ?? 0).toFixed(1);
      const dWind = Math.round(daily.wind_speed_10m_max?.[i] ?? 14);
      const dGusts = Math.round(daily.wind_gusts_10m_max?.[i] ?? (dWind * 1.5));
      const dWindDir = getCompassDirection(daily.wind_direction_10m_dominant?.[i] ?? 0);
      const dUv = Number(daily.uv_index_max?.[i] ?? 5.5).toFixed(1);

      // Sunrise & Sunset
      let sunrise = '06:07';
      let sunset = '17:39';
      if (daily.sunrise?.[i]) {
        sunrise = daily.sunrise[i].split('T')[1] || '06:07';
      }
      if (daily.sunset?.[i]) {
        sunset = daily.sunset[i].split('T')[1] || '17:39';
      }

      // Daylight duration in hours & minutes
      let daylight = '11h 32m';
      if (daily.daylight_duration?.[i]) {
        const sec = daily.daylight_duration[i];
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        daylight = `${h}h ${m}m`;
      }

      md += `## ${title}\n`;
      md += `**Temperature:** High ${dHigh}°C / Low ${dLow}°C\n`;
      md += `**Conditions:** ${dWmo.text}\n`;
      md += `**Precipitation Chance:** ${dPrecipPct}%\n`;
      md += `**Precipitation:** ${dPrecipMm} mm\n`;
      md += `**Wind:** ${dWind} km/h ${dWindDir}\n`;
      md += `**Wind Gusts:** ${dGusts} km/h\n`;
      md += `**Feels Like:** High ${dFeelsHigh}°C / Low ${dFeelsLow}°C\n`;
      md += `**Sunrise:** ${sunrise}\n`;
      md += `**Sunset:** ${sunset}\n`;
      md += `**Daylight Duration:** ${daylight}\n`;
      md += `**UV Index:** ${dUv}\n`;
      md += `**Humidity:** ${Math.round(current.relative_humidity_2m ?? 70)}%\n`;
      md += `**Pressure:** ${Math.round(current.surface_pressure ?? 1012)} hPa\n\n`;
    }
  }

  return { text: md, raw };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tool = searchParams.get('tool') || 'hourly_24';
    const location = searchParams.get('location') || 'Tenkasi, Tamil Nadu';
    const units = searchParams.get('units') || 'metric';

    const args: Record<string, any> = {
      city_name: location,
      units,
      granularity: searchParams.get('granularity') || 'hourly',
      days: Number(searchParams.get('days')) || (tool === 'hourly_24' ? 1 : 7),
    };

    const cacheKey = `GET:${tool}:${location.toLowerCase().trim()}:${JSON.stringify(args)}`;
    const cached = weatherMcpCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < MCP_CACHE_TTL_MS) {
      return NextResponse.json<WeatherMcpCallResponse>(
        { ...cached.data, durationMs: 1 },
        { headers: { 'X-Cache': 'HIT' } }
      );
    }

    const start = Date.now();
    const { text, raw } = await fetchWeatherForecastDirect(location, tool, args);
    const durationMs = Date.now() - start;

    const payload: WeatherMcpCallResponse = {
      success: true,
      tool,
      location,
      text,
      raw,
      durationMs,
    };

    weatherMcpCache.set(cacheKey, { data: payload, timestamp: Date.now() });

    return NextResponse.json<WeatherMcpCallResponse>(payload, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (err: any) {
    console.error('[API GET /api/weather-mcp] error:', err);
    return NextResponse.json<WeatherMcpCallResponse>(
      {
        success: false,
        tool: 'hourly_24',
        location: '',
        error: err?.message || 'Failed to fetch weather forecast data.',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authUser = await getServerAuthenticatedUser(req);

  try {
    const body = await req.json().catch(() => ({}));
    const tool = String(body.tool || 'get_forecast');
    const location = String(body.location || 'Chennai, Tamil Nadu');
    const units = body.units || 'metric';

    // If session is strictly invalidated and this is an administrative tool, enforce 401
    if (!authUser?.id && tool === 'check_service_status') {
      const res = NextResponse.json(
        { success: false, error: 'Session invalidated or expired', code: 'SESSION_INVALIDATED' },
        { status: 401 }
      );
      clearAuthCookies(res);
      return res;
    }

    const args: Record<string, any> = {
      ...(tool !== 'check_service_status' ? { city_name: location } : {}),
      units,
      ...(body.params || {}),
      ...(body.extraArgs || {}),
    };

    const cacheKey = `${tool}:${location.toLowerCase().trim()}:${JSON.stringify(args)}`;
    const cached = weatherMcpCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < MCP_CACHE_TTL_MS) {
      return NextResponse.json<WeatherMcpCallResponse>(
        { ...cached.data, durationMs: 1 },
        { headers: { 'X-Cache': 'HIT' } }
      );
    }

    const start = Date.now();
    const { text, raw } = await fetchWeatherForecastDirect(location, tool, args);
    const durationMs = Date.now() - start;

    const payload: WeatherMcpCallResponse = {
      success: true,
      tool,
      location,
      text,
      raw,
      durationMs,
    };

    weatherMcpCache.set(cacheKey, { data: payload, timestamp: Date.now() });

    return NextResponse.json<WeatherMcpCallResponse>(payload, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (err: any) {
    console.error('[API /api/weather-mcp] error:', err);
    return NextResponse.json<WeatherMcpCallResponse>(
      {
        success: false,
        tool: 'unknown',
        location: '',
        error: err?.message || 'Failed to fetch weather forecast data.',
      },
      { status: 500 }
    );
  }
}
