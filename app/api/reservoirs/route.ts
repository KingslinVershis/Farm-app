import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthenticatedUser, clearAuthCookies } from '@/lib/serverAuth';

export interface ReservoirRecord {
  id: string;
  name: string;
  rawName: string;
  basin: string;
  district: string;
  fullDepthFeet: number;
  fullCapacityMcft: number;
  currentLevelFeet: number;
  currentStorageMcft: number;
  currentInflowCusecs: number;
  currentOutflowCusecs: number;
  lastYearLevelFeet: number;
  lastYearStorageMcft: number;
  storagePercentage: number;
  levelPercentage: number;
  currentStorageTmc: number;
  fullCapacityTmc: number;
  netFlowCusecs: number;
  status: 'Surplus' | 'Adequate' | 'Moderate' | 'Critical';
}

export interface ReservoirsResponse {
  success: boolean;
  sourceUrl: string;
  date: string;
  fetchedAt: string;
  summary: {
    totalReservoirs: number;
    totalCurrentStorageMcft: number;
    totalCurrentStorageTmc: number;
    totalCapacityMcft: number;
    totalCapacityTmc: number;
    overallStoragePercentage: number;
    totalInflowCusecs: number;
    totalOutflowCusecs: number;
    netInflowCusecs: number;
  };
  reservoirs: ReservoirRecord[];
  error?: string;
  isFallback?: boolean;
}

interface UpstreamReservoirRow {
  id?: string | number;
  reservoir_name?: string;
  tot_depth?: string | number;
  tot_capacity?: string | number;
  current_level?: string | number;
  current_storage?: string | number;
  lastyear_level?: string | number;
  lastyear_storage?: string | number;
  inflow?: string | number;
  outflow?: string | number;
  updated_date?: string;
}

interface UpstreamReservoirApiResponse {
  status?: string;
  requested?: string;
  data_date?: string;
  days_old?: number;
  rows?: UpstreamReservoirRow[];
}

function parseNum(val: string | number | null | undefined): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
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
  const dateParam = searchParams.get('date')?.trim();

  // Official JSON API endpoint
  const targetUrl = dateParam
    ? `https://tnagriculture.in/Agritech_new/home/reservoir_data?date=${encodeURIComponent(dateParam)}`
    : 'https://tnagriculture.in/Agritech_new/home/reservoir_data';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 300 }, // Cache on edge/Next for 5 minutes
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`External API responded with status ${res.status}`);
    }

    const upstream: UpstreamReservoirApiResponse = await res.json();
    const rows = Array.isArray(upstream?.rows) ? upstream.rows : [];

    const reservoirs: ReservoirRecord[] = [];

    for (const row of rows) {
      const rawName = String(row.reservoir_name ?? '').replace(/\s+/g, ' ').trim();
      if (!rawName || rawName.toLowerCase().includes('reservoir')) continue;

      const cleanName = rawName.replace(/[*+^]/g, '').trim();
      const normKey = cleanName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

      const fullDepthFeet = parseNum(row.tot_depth);
      const fullCapacityMcft = parseNum(row.tot_capacity);
      const currentLevelFeet = parseNum(row.current_level);
      const currentStorageMcft = parseNum(row.current_storage);
      const currentInflowCusecs = parseNum(row.inflow);
      const currentOutflowCusecs = parseNum(row.outflow);
      const lastYearLevelFeet = parseNum(row.lastyear_level);
      const lastYearStorageMcft = parseNum(row.lastyear_storage);

      const storagePercentage =
        fullCapacityMcft > 0
          ? Math.min(100, Math.round((currentStorageMcft / fullCapacityMcft) * 1000) / 10)
          : 0;

      const levelPercentage =
        fullDepthFeet > 0
          ? Math.min(100, Math.round((currentLevelFeet / fullDepthFeet) * 1000) / 10)
          : 0;

      let status: ReservoirRecord['status'] = 'Critical';
      if (storagePercentage >= 75) status = 'Surplus';
      else if (storagePercentage >= 50) status = 'Adequate';
      else if (storagePercentage >= 25) status = 'Moderate';

      reservoirs.push({
        id: normKey ? `res-${normKey.replace(/\s+/g, '-')}` : `res-${String(row.id ?? reservoirs.length)}`,
        name: cleanName,
        rawName,
        basin: '',
        district: '',
        fullDepthFeet,
        fullCapacityMcft,
        currentLevelFeet,
        currentStorageMcft,
        currentInflowCusecs,
        currentOutflowCusecs,
        lastYearLevelFeet,
        lastYearStorageMcft,
        storagePercentage,
        levelPercentage,
        currentStorageTmc: Math.round((currentStorageMcft / 1000) * 100) / 100,
        fullCapacityTmc: Math.round((fullCapacityMcft / 1000) * 100) / 100,
        netFlowCusecs: currentInflowCusecs - currentOutflowCusecs,
        status,
      });
    }

    if (reservoirs.length === 0) {
      throw new Error('No reservoir data available for the specified date.');
    }

    const displayDate =
      (upstream.data_date && String(upstream.data_date).trim()) ||
      (rows[0]?.updated_date && String(rows[0].updated_date).trim()) ||
      dateParam ||
      '';

    // Calculate aggregated totals
    const totalCurrentStorageMcft = reservoirs.reduce((sum, r) => sum + r.currentStorageMcft, 0);
    const totalCapacityMcft = reservoirs.reduce((sum, r) => sum + r.fullCapacityMcft, 0);
    const totalInflowCusecs = reservoirs.reduce((sum, r) => sum + r.currentInflowCusecs, 0);
    const totalOutflowCusecs = reservoirs.reduce((sum, r) => sum + r.currentOutflowCusecs, 0);

    const overallStoragePercentage =
      totalCapacityMcft > 0
        ? Math.round((totalCurrentStorageMcft / totalCapacityMcft) * 1000) / 10
        : 0;

    const payload: ReservoirsResponse = {
      success: true,
      sourceUrl: targetUrl,
      date: displayDate || new Date().toISOString().split('T')[0],
      fetchedAt: new Date().toISOString(),
      summary: {
        totalReservoirs: reservoirs.length,
        totalCurrentStorageMcft,
        totalCurrentStorageTmc: Math.round((totalCurrentStorageMcft / 1000) * 100) / 100,
        totalCapacityMcft,
        totalCapacityTmc: Math.round((totalCapacityMcft / 1000) * 100) / 100,
        overallStoragePercentage,
        totalInflowCusecs,
        totalOutflowCusecs,
        netInflowCusecs: totalInflowCusecs - totalOutflowCusecs,
      },
      reservoirs,
    };

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('Error fetching reservoir data from tnagriculture.in:', error);

    // Return empty array when no data is available or extraction fails as requested
    return NextResponse.json({
      success: false,
      isFallback: false,
      error: error?.message || 'No reservoir data available for the specified date.',
      sourceUrl: targetUrl,
      date: dateParam || new Date().toISOString().split('T')[0],
      fetchedAt: new Date().toISOString(),
      summary: {
        totalReservoirs: 0,
        totalCurrentStorageMcft: 0,
        totalCurrentStorageTmc: 0,
        totalCapacityMcft: 0,
        totalCapacityTmc: 0,
        overallStoragePercentage: 0,
        totalInflowCusecs: 0,
        totalOutflowCusecs: 0,
        netInflowCusecs: 0,
      },
      reservoirs: [],
    });
  }
}
