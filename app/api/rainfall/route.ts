import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthenticatedUser, clearAuthCookies } from '@/lib/serverAuth';

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

  // Stream/download PDF report for selected date
  if (downloadPdf) {
    const cleanDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : '';
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

  // Fetch daily rainfall JSON data
  const targetUrl =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? `${RAINFALL_DATA_URL}?date=${encodeURIComponent(dateParam)}`
      : RAINFALL_DATA_URL;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: REQUEST_HEADERS,
      next: { revalidate: 300 },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`TNAGRISNET rainfall API responded with status ${res.status}`);
    }

    const json = await res.json();
    const districts: RainfallDistrictRecord[] = Array.isArray(json?.districts) ? json.districts : [];
    const stations: RainfallStationRecord[] = Array.isArray(json?.stations) ? json.stations : [];
    const dates: string[] = Array.isArray(json?.dates) ? json.dates : [];
    const reportDate = String(json?.report_date || dateParam || '');

    return NextResponse.json(
      {
        success: true,
        status: json?.status,
        requested: json?.requested,
        report_date: reportDate,
        days_old: json?.days_old,
        pdf: json?.pdf || (reportDate ? `${RAINFALL_PDF_BASE}/${reportDate}.pdf` : undefined),
        dates,
        districts,
        stations,
      } satisfies RainfallApiResponse,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: any) {
    console.error('[API /api/rainfall error]:', error);
    return NextResponse.json(
      {
        success: false,
        report_date: dateParam || '',
        dates: [],
        districts: [],
        stations: [],
        error: error?.message || 'Unable to fetch daily rainfall report.',
      } satisfies RainfallApiResponse,
      { status: 500 }
    );
  }
}

