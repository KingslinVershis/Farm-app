import { NextRequest, NextResponse } from 'next/server';
import { City } from 'country-state-city';
import { getServerAuthenticatedUser, clearAuthCookies } from '@/lib/serverAuth';
import {
  matchDistrictFromList,
  matchBlockFromList,
  normalizeLocationToken,
  type WeatherDistrict,
  type WeatherDashboardData,
  type WeatherForecastDay,
  type WeatherApiResponse,
} from '@/lib/weather';

const DISTRICTS_API_URL = 'https://www.tnagrisnet.tn.gov.in/weather/get_districts';
const DASHBOARD_API_URL = 'https://www.tnagrisnet.tn.gov.in/weather/dashboard_data';
const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Coordinates fallback map for all TNAGRISNET districts (in case a district or block isn't listed directly)
const TN_DISTRICT_COORDS: Record<string, { lat: number; lon: number }> = {
  ariyalur: { lat: 11.1401, lon: 79.0786 },
  chengalpattu: { lat: 12.6819, lon: 79.9888 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  coimbatore: { lat: 11.0168, lon: 76.9558 },
  cuddalore: { lat: 11.748, lon: 79.7714 },
  dharmapuri: { lat: 12.1211, lon: 78.1582 },
  dindigul: { lat: 10.3673, lon: 77.9803 },
  erode: { lat: 11.341, lon: 77.7172 },
  kallakkurichi: { lat: 11.7384, lon: 78.9639 },
  kanchipuram: { lat: 12.8342, lon: 79.7036 },
  kanniyakumari: { lat: 8.0883, lon: 77.5385 },
  karaikal: { lat: 10.9254, lon: 79.838 },
  karur: { lat: 10.9601, lon: 78.0766 },
  krishnagiri: { lat: 12.5186, lon: 78.2137 },
  madurai: { lat: 9.9252, lon: 78.1198 },
  mahe: { lat: 11.7016, lon: 75.5364 },
  mayiladuthurai: { lat: 11.102, lon: 79.655 },
  nagapattinam: { lat: 10.7672, lon: 79.8449 },
  namakkal: { lat: 11.2189, lon: 78.1674 },
  perambalur: { lat: 11.2324, lon: 78.8803 },
  puducherry: { lat: 11.9416, lon: 79.8083 },
  pudukkottai: { lat: 10.3833, lon: 78.8001 },
  ramanathapuram: { lat: 9.3639, lon: 78.8395 },
  ranippettai: { lat: 12.9277, lon: 79.3193 },
  salem: { lat: 11.6643, lon: 78.146 },
  sivaganga: { lat: 9.8433, lon: 78.4809 },
  tenkasi: { lat: 8.9591, lon: 77.3152 },
  thanjavur: { lat: 10.787, lon: 79.1378 },
  thenilgiris: { lat: 11.4916, lon: 76.7337 },
  theni: { lat: 10.0104, lon: 77.4768 },
  thiruvallur: { lat: 13.1231, lon: 79.912 },
  thiruvarur: { lat: 10.7661, lon: 79.6344 },
  thoothukkudi: { lat: 8.7642, lon: 78.1348 },
  tiruchirappalli: { lat: 10.7905, lon: 78.7047 },
  tirunelveli: { lat: 8.7139, lon: 77.7567 },
  tiruppattur: { lat: 12.495, lon: 78.5678 },
  tiruppur: { lat: 11.1085, lon: 77.3411 },
  tiruvannamalai: { lat: 12.2253, lon: 79.0747 },
  vellore: { lat: 12.9165, lon: 79.1325 },
  villupuram: { lat: 11.9401, lon: 79.4861 },
  virudhunagar: { lat: 9.568, lon: 77.9624 },
  yanam: { lat: 16.7333, lon: 82.2167 },
};

let cachedRegionalCities: ReturnType<typeof City.getCitiesOfState> | null = null;
function getRegionalCities() {
  if (!cachedRegionalCities) {
    cachedRegionalCities = [
      ...City.getCitiesOfState('IN', 'TN'),
      ...City.getCitiesOfState('IN', 'PY'),
    ];
  }
  return cachedRegionalCities;
}

function findCityCoords(name: string | undefined): { lat: number; lon: number } | null {
  if (!name) return null;
  const target = normalizeLocationToken(name);
  if (target.length < 3) return null;

  const cities = getRegionalCities();
  const match = cities.find((c) => {
    const cNorm = normalizeLocationToken(c.name);
    return cNorm === target || cNorm === `${target}s` || `${cNorm}s` === target;
  });

  if (match && match.latitude && match.longitude) {
    const lat = Number(match.latitude);
    const lon = Number(match.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon };
    }
  }
  return null;
}

function resolveLocationCoords(
  blockName?: string,
  districtName?: string
): { lat: number; lon: number } {
  const fromBlock = findCityCoords(blockName);
  if (fromBlock) return fromBlock;

  const distNorm = normalizeLocationToken(districtName);
  if (distNorm && TN_DISTRICT_COORDS[distNorm]) {
    return TN_DISTRICT_COORDS[distNorm];
  }

  const fromDistrict = findCityCoords(districtName);
  if (fromDistrict) return fromDistrict;

  return TN_DISTRICT_COORDS.thanjavur;
}

function getTodayIstDateStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function fetchTodayForecastEntry(
  lat: number,
  lon: number,
  todayDate: string
): Promise<WeatherForecastDay | null> {
  try {
    const url =
      `${OPEN_METEO_FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,rain,cloud_cover,wind_speed_10m,wind_direction_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,rain_sum,relative_humidity_2m_max,relative_humidity_2m_min,wind_speed_10m_max,wind_direction_10m_dominant,cloud_cover_mean` +
      `&timezone=Asia%2FKolkata&forecast_days=1`;

    const om = await fetchWithTimeout<any>(url, 300);
    const cur = om?.current || {};
    const daily = om?.daily || {};

    const tempMax = Number(daily.temperature_2m_max?.[0] ?? cur.temperature_2m);
    const tempMin = Number(daily.temperature_2m_min?.[0] ?? cur.temperature_2m);
    const curTemp = Number(cur.temperature_2m ?? tempMax);
    if (!Number.isFinite(tempMax) || !Number.isFinite(tempMin)) return null;

    const humMax = Math.round(Number(daily.relative_humidity_2m_max?.[0] ?? cur.relative_humidity_2m ?? 75));
    const humMin = Math.round(Number(daily.relative_humidity_2m_min?.[0] ?? cur.relative_humidity_2m ?? 50));
    const rainVal = Number(daily.rain_sum?.[0] ?? cur.rain ?? 0);
    const windSpeed = Number(cur.wind_speed_10m ?? daily.wind_speed_10m_max?.[0] ?? 0);
    const windDir = Math.round(Number(cur.wind_direction_10m ?? daily.wind_direction_10m_dominant?.[0] ?? 0));
    const cloudPct = Number(cur.cloud_cover ?? daily.cloud_cover_mean?.[0] ?? 0);
    const cloudOktas = Math.min(8, Math.max(0, Math.round((cloudPct / 100) * 8)));

    return {
      forecast_date: todayDate,
      rainfall: rainVal.toFixed(1),
      humidity: String(humMax),
      humidity2: String(humMin),
      temperature_max: tempMax.toFixed(1),
      temperature_min: tempMin.toFixed(1),
      wind_speed: windSpeed.toFixed(1),
      wind_direction: String(windDir),
      cloud_cover: String(cloudOktas),
      is_today: true,
      current_temperature: Number.isFinite(curTemp) ? curTemp.toFixed(1) : undefined,
    };
  } catch (err) {
    console.warn('[API /api/weather] Today Open-Meteo lookup skipped:', err);
    return null;
  }
}

async function fetchWithTimeout<T>(url: string, revalidateSeconds: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: REQUEST_HEADERS,
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) {
      throw new Error(`API responded with status ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const authUser = await getServerAuthenticatedUser(request);
  if (!authUser?.id) {
    const res = NextResponse.json(
      { success: false, error: 'Session invalidated or expired', code: 'SESSION_INVALIDATED' },
      { status: 401 }
    );
    clearAuthCookies(res);
    return res;
  }

  const { searchParams } = new URL(request.url);
  const districtIdParam = searchParams.get('district_id')?.trim();
  const blockIdParam = searchParams.get('block_id')?.trim();
  const districtNameParam = searchParams.get('district_name')?.trim();
  const blockNameParam = searchParams.get('block_name')?.trim();
  const modeParam = searchParams.get('mode')?.trim();

  try {
    // 1. Fetch official TN districts list (cached 1 hour)
    const districtsRaw = await fetchWithTimeout<WeatherDistrict[]>(DISTRICTS_API_URL, 3600);
    const districts = Array.isArray(districtsRaw) ? districtsRaw : [];

    if (modeParam === 'districts') {
      return NextResponse.json({
        success: true,
        districts,
        dashboard: null,
        resolvedDistrictId: '',
        resolvedBlockId: '',
        fetchedAt: new Date().toISOString(),
      } satisfies WeatherApiResponse);
    }

    // 2. Resolve target district_id (explicit ID > district_name match > default Thanjavur 620)
    const matchedDistrict = matchDistrictFromList(
      districts,
      districtNameParam,
      districtIdParam
    );
    const resolvedDistrictId = matchedDistrict?.id || districtIdParam || '620';

    // 3. Fetch weather dashboard data (with block_id if explicitly provided)
    const initialDashUrl = blockIdParam
      ? `${DASHBOARD_API_URL}?district_id=${encodeURIComponent(resolvedDistrictId)}&block_id=${encodeURIComponent(blockIdParam)}`
      : `${DASHBOARD_API_URL}?district_id=${encodeURIComponent(resolvedDistrictId)}`;

    let dashboard = await fetchWithTimeout<WeatherDashboardData>(initialDashUrl, 300);

    // 4. If no explicit block_id was provided, try matching block_name against returned blocks
    if (!blockIdParam && blockNameParam && Array.isArray(dashboard?.blocks)) {
      const matchedBlock = matchBlockFromList(dashboard.blocks, blockNameParam);
      if (matchedBlock && String(matchedBlock.block_id) !== String(dashboard.block_id)) {
        const blockDashUrl = `${DASHBOARD_API_URL}?district_id=${encodeURIComponent(resolvedDistrictId)}&block_id=${encodeURIComponent(matchedBlock.block_id)}`;
        dashboard = await fetchWithTimeout<WeatherDashboardData>(blockDashUrl, 300);
      }
    }

    // 5. Ensure Today's weather is included when TNAGRISNET starts from tomorrow
    if (dashboard && Array.isArray(dashboard.forecast)) {
      const todayIso = getTodayIstDateStr();
      const existingTodayIdx = dashboard.forecast.findIndex((f) => f.forecast_date === todayIso);
      if (existingTodayIdx === -1) {
        const activeBlock = dashboard.blocks?.find(
          (b) => String(b.block_id) === String(dashboard.block_id)
        );
        const coords = resolveLocationCoords(
          activeBlock?.block_name,
          dashboard.district?.district_name
        );
        const todayEntry = await fetchTodayForecastEntry(coords.lat, coords.lon, todayIso);
        if (todayEntry) {
          dashboard = {
            ...dashboard,
            forecast: [todayEntry, ...dashboard.forecast],
          };
        }
      } else if (existingTodayIdx >= 0) {
        dashboard.forecast[existingTodayIdx] = {
          ...dashboard.forecast[existingTodayIdx],
          is_today: true,
        };
      }
    }

    const payload: WeatherApiResponse = {
      success: true,
      districts,
      dashboard,
      resolvedDistrictId,
      resolvedBlockId: String(dashboard?.block_id || blockIdParam || ''),
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('[API /api/weather error]:', error);
    return NextResponse.json(
      {
        success: false,
        districts: [],
        dashboard: null,
        resolvedDistrictId: districtIdParam || '',
        resolvedBlockId: blockIdParam || '',
        fetchedAt: new Date().toISOString(),
        error: error?.message || 'Unable to fetch live agro-weather telemetry from TNAGRISNET.',
      } satisfies WeatherApiResponse,
      { status: 500 }
    );
  }
}
