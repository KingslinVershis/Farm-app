import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getServerAuthenticatedUser, clearAuthCookies } from '@/lib/serverAuth';
import cropHealthTranslations from '@/lib/data/cropHealthTranslations.json';
import cropHealthData from '@/lib/data/cropHealthData.json';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface CropHealthRecord {
  id: string;
  slNo: string;
  crop: string;
  nameEn: string;
  nameTa: string;
  controlMessage: string;
  controlMessageEn?: string;
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

    const translationsMap = cropHealthTranslations as Record<string, string>;
    const normalizedMsg = controlMessage.replace(/\s+/g, ' ').trim();
    const controlMessageEn =
      translationsMap[normalizedMsg] ||
      translationsMap[controlMessage] ||
      translationsMap[`${type}-${slNo}`] ||
      translationsMap[`${crop}:${nameEn}`] ||
      undefined;

    records.push({
      id: `${type}-${slNo}-${idx}`,
      slNo,
      crop,
      nameEn,
      nameTa,
      controlMessage,
      controlMessageEn: controlMessageEn && !isMostlyTamil(controlMessageEn) ? controlMessageEn : undefined,
    });
  });

  return records;
}

function isMostlyTamil(str?: string): boolean {
  if (!str) return false;
  const tamilCount = (str.match(/[\u0B80-\u0BFF]/g) || []).length;
  return tamilCount > 10;
}

const translationMemoryCache = new Map<string, string>();

async function translateChunkWithPost(slice: { index: number; text: string }[]): Promise<string[]> {
  const combined = slice.map((item) => item.text.replace(/\r?\n+/g, ' ')).join(' \n###\n ');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=ta&tl=en&dt=t', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: 'q=' + encodeURIComponent(combined),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const raw = (json?.[0] || []).map((x: any) => x?.[0] || '').join('');
    const split = raw.split(/\s*###\s*/);
    if (split.length === slice.length) {
      return split.map((s: string) => s.trim());
    }
    return slice.map((item, idx) => (split[idx] ? split[idx].trim() : item.text));
  } catch (err) {
    clearTimeout(timeout);
    return slice.map((item) => item.text);
  }
}

async function batchTranslateTamilToEnglish(texts: string[]): Promise<string[]> {
  const results: string[] = new Array(texts.length);
  const toTranslate: { index: number; text: string }[] = [];

  texts.forEach((text, i) => {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      results[i] = '';
    } else if (translationMemoryCache.has(trimmed)) {
      results[i] = translationMemoryCache.get(trimmed)!;
    } else {
      toTranslate.push({ index: i, text: trimmed });
    }
  });

  if (toTranslate.length === 0) return results;

  const CHUNK_SIZE = 10;
  const chunks: { index: number; text: string }[][] = [];
  for (let i = 0; i < toTranslate.length; i += CHUNK_SIZE) {
    chunks.push(toTranslate.slice(i, i + CHUNK_SIZE));
  }

  const CONCURRENCY = 4;
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((chunk) => translateChunkWithPost(chunk)));

    batch.forEach((chunk, bIdx) => {
      const translatedChunk = batchResults[bIdx];
      chunk.forEach((item, cIdx) => {
        const trans = (translatedChunk[cIdx] || '').trim();
        if (trans && !isMostlyTamil(trans)) {
          translationMemoryCache.set(item.text, trans);
          results[item.index] = trans;
        } else {
          results[item.index] = '';
        }
      });
    });
  }

  return results;
}

const cropHealthCache = new Map<string, { data: CropHealthApiResponse; timestamp: number }>();
const CROP_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min TTL

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

  const rawType = req.nextUrl.searchParams.get('type');
  const type: 'disease' | 'pest' = rawType === 'pest' ? 'pest' : 'disease';

  try {
    const cached = cropHealthCache.get(type);
    const validTranslatedCount =
      cached?.data?.records?.filter((r) => r.controlMessageEn && !isMostlyTamil(r.controlMessageEn)).length || 0;
    const isCacheValid =
      cached &&
      cached.data?.records?.length > 0 &&
      validTranslatedCount >= Math.floor(cached.data.records.length * 0.8) &&
      Date.now() - cached.timestamp < CROP_CACHE_TTL_MS;

    if (isCacheValid) {
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    }

    let html = '';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(UPSTREAM_URLS[type], {
        next: { revalidate: 3600 },
        signal: controller.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml,*/*',
          'User-Agent': 'PrecisionFarmOS/1.0',
        },
      });
      clearTimeout(timeout);

      if (res.ok) {
        html = await res.text();
      }
    } catch (fetchErr) {
      console.warn('[API /crop-health] Live fetch failed, serving pre-compiled dataset:', fetchErr);
    }

    if (!html) {
      // High-availability fallback: Serve bundled complete dataset (142 diseases / 184 pests)
      const cachedBundle = (cropHealthData as any)?.[type];
      const records: CropHealthRecord[] = cachedBundle?.records || [];
      const crops: string[] = cachedBundle?.crops || [];

      const payload: CropHealthApiResponse = {
        success: true,
        type,
        crops,
        records,
        total: records.length,
      };

      cropHealthCache.set(type, { data: payload, timestamp: Date.now() });

      return NextResponse.json(payload, {
        headers: {
          'X-Cache': 'FALLBACK',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const records = parseCropHealthHtml(html, type);
    const crops = Array.from(new Set(records.map((r) => r.crop).filter(Boolean)));

    // For any record missing English translation, attempt dynamic batch translation
    const unTranslated = records.filter((r) => !r.controlMessageEn);
    if (unTranslated.length > 0) {
      try {
        const textsToTranslate = unTranslated.map((r) => r.controlMessage);
        const translatedList = await batchTranslateTamilToEnglish(textsToTranslate);
        unTranslated.forEach((r, idx) => {
          const trans = translatedList[idx];
          if (trans && !isMostlyTamil(trans)) {
            r.controlMessageEn = trans;
          }
        });
      } catch (transErr) {
        console.warn('[API /crop-health] Fallback translation skipped on error:', transErr);
      }
    }

    const payload: CropHealthApiResponse = {
      success: true,
      type,
      crops,
      records,
      total: records.length,
    };

    cropHealthCache.set(type, { data: payload, timestamp: Date.now() });

    return NextResponse.json(payload, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (err: any) {
    console.error('[API /crop-health] error:', err);
    const cachedBundle = (cropHealthData as any)?.[type] || (cropHealthData as any)?.['disease'];
    return NextResponse.json<CropHealthApiResponse>(
      {
        success: true,
        type,
        crops: cachedBundle?.crops || [],
        records: cachedBundle?.records || [],
        total: cachedBundle?.records?.length || 0,
        error: undefined,
      },
      { status: 200 }
    );
  }
}
