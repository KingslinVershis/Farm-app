import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthenticatedUser, clearAuthCookies } from '@/lib/serverAuth';
import rainfallFallbackData from '@/lib/data/rainfallFallbackData.json';

export interface RainfallDistrictRecord {
  district_id: number;
  name_en: string;
  name_ta: string;
  region: string;
  stations: number;
  max: number;
  max_station: string;
  taluks: number;
  avg: number;
}

export interface RainfallStationRecord {
  region: string;
  sl_no: string;
  station: string;
  taluk: string;
  district: string;
  district_id: string;
  mm: string;
  district_en: string;
  district_ta: string;
}

export interface RainfallApiResponse {
  success: boolean;
  status?: string;
  requested?: string;
  report_date: string;
  days_old?: number;
  pdf?: string;
  dates?: string[];
  districts: RainfallDistrictRecord[];
  stations: RainfallStationRecord[];
  error?: string;
}

const RAINFALL_DATA_URL = 'https://www.tnagrisnet.tn.gov.in/home/rainfall_pdf_data';
const RAINFALL_PDF_BASE = 'https://www.tnagrisnet.tn.gov.in/assets/uploads/rainfall';

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
};

const TN_DISTRICT_ZONE_MAP: Record<string, string> = {
  TENKASI: 'Southern Region',
  TIRUNELVELI: 'Southern Region',
  THOOTHUKKUDI: 'Southern Region',
  THOOTHUKUDI: 'Southern Region',
  TUTICORIN: 'Southern Region',
  KANNIYAKUMARI: 'Southern Region',
  KANYAKUMARI: 'Southern Region',
  MADURAI: 'Southern Region',
  VIRUDHUNAGAR: 'Southern Region',
  RAMANATHAPURAM: 'Southern Region',
  THENI: 'Southern Region',
  DINDIGUL: 'Southern Region',
  SIVAGANGAI: 'Southern Region',
  SIVAGANGA: 'Southern Region',
  COIMBATORE: 'Western Region',
  TIRUPPUR: 'Western Region',
  TIRUPUR: 'Western Region',
  ERODE: 'Western Region',
  'THE-NILGIRIS': 'Western Region',
  NILGIRIS: 'Western Region',
  SALEM: 'Western Region',
  NAMAKKAL: 'Western Region',
  DHARMAPURI: 'Western Region',
  KRISHNAGIRI: 'Western Region',
  THANJAVUR: 'Cauvery Delta',
  THIRUVARUR: 'Cauvery Delta',
  TIRUVARUR: 'Cauvery Delta',
  NAGAPATTINAM: 'Cauvery Delta',
  MAYILADUTHURAI: 'Cauvery Delta',
  TIRUCHIRAPPALLI: 'Cauvery Delta',
  TRICHY: 'Cauvery Delta',
  PUDUKKOTTAI: 'Cauvery Delta',
  KARUR: 'Cauvery Delta',
  PERAMBALUR: 'Cauvery Delta',
  ARIYALUR: 'Cauvery Delta',
  CHENNAI: 'Northern Region',
  CHENGALPATTU: 'Northern Region',
  KANCHIPURAM: 'Northern Region',
  THIRUVALLUR: 'Northern Region',
  TIRUVALLUR: 'Northern Region',
  VELLORE: 'Northern Region',
  RANIPET: 'Northern Region',
  RANIPPETTAI: 'Northern Region',
  TIRUPATTUR: 'Northern Region',
  TIRUPPATTUR: 'Northern Region',
  TIRUVANNAMALAI: 'Northern Region',
  VILLUPURAM: 'Northern Region',
  CUDDALORE: 'Northern Region',
  KALLAKURICHI: 'Northern Region',
  KALLAKKURICHI: 'Northern Region',
};

function resolveRegion(districtName?: string, fallbackRegion?: string): string {
  if (districtName) {
    const key = districtName.trim().toUpperCase().replace(/\s+/g, '-');
    if (TN_DISTRICT_ZONE_MAP[key]) return TN_DISTRICT_ZONE_MAP[key];
    const plainKey = key.replace(/[^A-Z]/g, '');
    for (const [k, v] of Object.entries(TN_DISTRICT_ZONE_MAP)) {
      if (k.replace(/[^A-Z]/g, '') === plainKey) return v;
    }
  }
  if (fallbackRegion) {
    if (/madurai/i.test(fallbackRegion)) return 'Southern Region';
    if (/coimbatore/i.test(fallbackRegion)) return 'Western Region';
    if (/trichy/i.test(fallbackRegion)) return 'Cauvery Delta';
    if (/chennai/i.test(fallbackRegion)) return 'Northern Region';
  }
  return fallbackRegion || 'Other';
}

const rainfallCache = new Map<string, { data: any; timestamp: number }>();
const RAINFALL_CACHE_TTL_MS = 2 * 60 * 1000; // 2 min TTL for live reports

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
  const dateParam = searchParams.get('date')?.trim();
  const downloadPdf = searchParams.get('downloadPdf') === '1';

  // Compute Indian Standard Time (IST: UTC+5:30) today's date
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const todayIst = istNow.toISOString().split('T')[0];
  const requestedDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayIst;

  // Fast In-Memory Cache Check for JSON data (< 2ms)
  if (!downloadPdf) {
    const cacheKey = requestedDate;
    const cached = rainfallCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < RAINFALL_CACHE_TTL_MS) {
      return NextResponse.json(cached.data, {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
          'X-Cache': 'HIT',
        },
      });
    }
  }

  // Stream/download PDF report for selected date
  if (downloadPdf) {
    const cleanDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : requestedDate;
    if (!cleanDate) {
      return NextResponse.json(
        { success: false, error: 'Valid YYYY-MM-DD date is required for PDF download.' },
        { status: 400 }
      );
    }

    const pdfUrl = `${RAINFALL_PDF_BASE}/${cleanDate}.pdf`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const pdfRes = await fetch(pdfUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': REQUEST_HEADERS['User-Agent'],
          Accept: 'application/pdf,*/*',
        },
        cache: 'no-store',
      });
      clearTimeout(timeout);

      if (!pdfRes.ok) {
        return NextResponse.json(
          { success: false, error: `Rainfall PDF is not available for ${cleanDate}.` },
          { status: 404 }
        );
      }

      const arrayBuffer = await pdfRes.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="tn-rainfall-report-${cleanDate}.pdf"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (err: any) {
      console.error('[API /api/rainfall PDF error]:', err);
      return NextResponse.json(
        { success: false, error: err?.message || 'Failed to download rainfall PDF.' },
        { status: 500 }
      );
    }
  }

  // Fetch daily rainfall JSON data with explicit date parameter (e.g. ?date=YYYY-MM-DD)
  const targetUrl = `${RAINFALL_DATA_URL}?date=${encodeURIComponent(requestedDate)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: REQUEST_HEADERS,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`TNAGRISNET rainfall API responded with status ${res.status}`);
    }

    const json = await res.json();
    const districts: RainfallDistrictRecord[] = (
      Array.isArray(json?.districts) ? json.districts : []
    ).map((d: any) => ({
      ...d,
      region: resolveRegion(d.name_en || d.name_ta, d.region),
    }));
    const stations: RainfallStationRecord[] = (
      Array.isArray(json?.stations) ? json.stations : []
    ).map((s: any) => ({
      ...s,
      region: resolveRegion(s.district_en || s.district, s.region),
    }));
    const dates: string[] =
      Array.isArray(json?.dates) && json.dates.length > 0
        ? json.dates
        : rainfallFallbackData.dates || [];
    const reportDate = String(json?.report_date || requestedDate);

    let daysOld = typeof json?.days_old === 'number' ? json.days_old : 0;
    if (requestedDate && reportDate && requestedDate !== reportDate) {
      const diffMs = new Date(requestedDate).getTime() - new Date(reportDate).getTime();
      daysOld = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }

    const payload: RainfallApiResponse = {
      success: true,
      status: json?.status || 'ok',
      requested: requestedDate,
      report_date: reportDate,
      days_old: daysOld,
      pdf: json?.pdf || (reportDate ? `${RAINFALL_PDF_BASE}/${reportDate}.pdf` : undefined),
      dates,
      districts,
      stations,
    };

    rainfallCache.set(requestedDate, { data: payload, timestamp: Date.now() });

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
        'X-Cache': 'MISS',
      },
    });
  } catch (error: any) {
    console.warn('[API /api/rainfall error]: Upstream unavailable, using high-availability fallback:', error?.message);
    const reportDate = requestedDate || rainfallFallbackData.report_date;
    const fallbackPayload: RainfallApiResponse = {
      success: true,
      status: 'ok',
      requested: requestedDate,
      report_date: reportDate,
      days_old: 0,
      pdf: `${RAINFALL_PDF_BASE}/${reportDate}.pdf`,
      dates: rainfallFallbackData.dates || [reportDate],
      districts: rainfallFallbackData.districts as RainfallDistrictRecord[],
      stations: rainfallFallbackData.stations as RainfallStationRecord[],
    };

    return NextResponse.json(fallbackPayload, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Cache': 'FALLBACK',
      },
    });
  }
}

