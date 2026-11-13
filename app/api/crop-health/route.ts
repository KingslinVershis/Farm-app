import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getServerAuthenticatedUser, clearAuthCookies } from '@/lib/serverAuth';

export interface CropHealthRecord {
  id: string;
  slNo: string;
  crop: string;
  nameEn: string;
  nameTa: string;
  controlMessage: string;
}

export interface CropHealthApiResponse {
  success: boolean;
  type: 'disease' | 'pest';
  crops: string[];
  records: CropHealthRecord[];
  total: number;
  error?: string;
}

const UPSTREAM_URLS: Record<'disease' | 'pest', string> = {
  disease: 'https://www.tnagrisnet.tn.gov.in/home/disDetails/en',
  pest: 'https://www.tnagrisnet.tn.gov.in/home/pestDetails/en',
};

function parseCropHealthHtml(html: string, type: 'disease' | 'pest'): CropHealthRecord[] {
  const $ = cheerio.load(html);
  const records: CropHealthRecord[] = [];
  const cropSet = new Set<string>();

  $('table#example tbody tr').each((idx, row) => {
    const tds = $(row).find('td');
    if (tds.length < 4) return;

    const slNo = tds.eq(0).text().trim() || String(idx + 1);
    const crop = tds.eq(1).text().replace(/\s+/g, ' ').trim();

    const nameCell = tds.eq(2).clone();
    const nameTa = nameCell.find('span').text().replace(/\s+/g, ' ').trim();
    nameCell.find('span').remove();
    const nameEn = nameCell.text().replace(/\s+/g, ' ').trim();

    const rawMsgHtml = tds.eq(3).html() || '';
    const withNewlines = rawMsgHtml.replace(/<br\s*\/?>/gi, '\n');
    const controlMessage = cheerio
      .load(`<div>${withNewlines}</div>`)('div')
      .text()
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');

    if (!crop && !nameEn && !controlMessage) return;
    if (crop) cropSet.add(crop);

    records.push({
      id: `${type}-${slNo}-${idx}`,
      slNo,
      crop,
      nameEn,
      nameTa,
      controlMessage,
    });
  });

  return records;
}

export async function GET(req: NextRequest) {
  const authUser = await getServerAuthenticatedUser(req);
  if (!authUser?.id) {
    const res = NextResponse.json(
      { success: false, error: 'Session invalidated or expired', code: 'SESSION_INVALIDATED' },
      { status: 401 }
    );
    clearAuthCookies(res);
    return res;
  }

  try {
    const rawType = req.nextUrl.searchParams.get('type');
    const type: 'disease' | 'pest' = rawType === 'pest' ? 'pest' : 'disease';

    const res = await fetch(UPSTREAM_URLS[type], {
      next: { revalidate: 3600 },
      headers: {
        Accept: 'text/html,application/xhtml+xml,*/*',
        'User-Agent': 'PrecisionFarmOS/1.0',
      },
    });

    if (!res.ok) {
      throw new Error(`Upstream crop health source returned ${res.status}`);
    }

    const html = await res.text();
    const records = parseCropHealthHtml(html, type);
    const crops = Array.from(new Set(records.map((r) => r.crop).filter(Boolean)));

    const payload: CropHealthApiResponse = {
      success: true,
      type,
      crops,
      records,
      total: records.length,
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error('[API /crop-health] error:', err);
    return NextResponse.json(
      {
        success: false,
        type: 'disease',
        crops: [],
        records: [],
        total: 0,
        error: err?.message || 'Unable to fetch crop health advisories.',
      },
      { status: 500 }
    );
  }
}
