import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
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



function parseNum(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.-]/g, '');
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

  // Target URL
  const targetUrl = dateParam
    ? `https://tnagriculture.in/ARS/home/reservoir/${dateParam}`
    : 'https://tnagriculture.in/ARS/home/reservoir';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 300 }, // Cache on edge/Next for 5 minutes
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`External source responded with status ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Extract displayed date
    let displayDate = dateParam || '';
    const dateAlertText = $('.alert.alert-danger, .alert').text().trim();
    if (dateAlertText) {
      const match = dateAlertText.match(/(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})/);
      if (match) {
        displayDate = match[0];
      }
    }

    const reservoirs: ReservoirRecord[] = [];

    // Table rows extraction
    $('table tr').each((_, row) => {
      const tds = $(row).find('td');
      if (tds.length >= 8) {
        const rawName = $(tds[0]).text().replace(/\s+/g, ' ').trim();
        if (!rawName || rawName.toLowerCase().includes('reservoir')) return;

        const cleanName = rawName.replace(/[*+^]/g, '').trim();
        const normKey = cleanName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

        const fullDepthFeet = parseNum($(tds[1]).text());
        const fullCapacityMcft = parseNum($(tds[2]).text());
        const currentLevelFeet = parseNum($(tds[3]).text());
        const currentStorageMcft = parseNum($(tds[4]).text());
        const currentInflowCusecs = parseNum($(tds[5]).text());
        const currentOutflowCusecs = parseNum($(tds[6]).text());
        const lastYearLevelFeet = parseNum($(tds[7]).text());
        const lastYearStorageMcft = parseNum($(tds[8]).text());

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
          id: `res-${normKey.replace(/\s+/g, '-')}`,
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
    });

    if (reservoirs.length === 0) {
      throw new Error('No reservoir rows parsed from the government page HTML.');
    }

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
