import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { TNAU_SEEDS_FALLBACK, type TnauSeedItem } from '@/lib/data/tnau-seeds-fallback';
import { getServerAuthenticatedUser, clearAuthCookies } from '@/lib/serverAuth';

export type { TnauSeedItem };

export interface TnauSeedResponse {
  success: boolean;
  sourceUrl: string;
  sourceTitle: string;
  totalItems: number;
  categories: string[];
  lastUpdated: string;
  data: TnauSeedItem[];
  isFallback?: boolean;
}

const TNAU_URL = 'https://agritech.tnau.ac.in/input_source_tnau_seed.html';

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/â€“|â€”|–|—/g, ' - ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrice(raw: string): { price: number; unit: string; raw: string } {
  const cleaned = cleanText(raw);
  let unit = 'kg';
  if (/pkt|packet/i.test(cleaned)) unit = 'packet';
  else if (/plant/i.test(cleaned)) unit = 'plant';
  else if (/kg/i.test(cleaned)) unit = 'kg';

  const numMatch = cleaned.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  const price = numMatch ? parseFloat(numMatch[0]) : 0;
  return { price, unit, raw: cleaned };
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
  const categoryParam = searchParams.get('category')?.trim();
  const queryParam = searchParams.get('q')?.toLowerCase().trim();

  let items: TnauSeedItem[] = [];
  let isFallback = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000); // 9 second timeout

    const res = await fetch(TNAU_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 3600 }, // 1 hour Next.js cache
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Remote server responded with ${res.status}`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const tables = $('table[border="1"]');

    if (tables.length >= 4) {
      // 1. Table 1: Fruit Seeds
      $(tables[0])
        .find('tr')
        .each((i, row) => {
          if (i === 0) return;
          const tds = $(row).find('td');
          if (tds.length >= 3) {
            const slNo = cleanText($(tds[0]).text()).replace(/\./g, '');
            const particulars = cleanText($(tds[1]).text());
            const p = parsePrice($(tds[2]).text());
            if (particulars) {
              items.push({
                id: `fruit-${i}`,
                category: 'Fruit Seeds',
                slNo: slNo || String(i),
                particulars,
                pricePerKg: p.price,
                unit: p.unit,
                rawPriceText: p.raw || `${p.price}.00`,
              });
            }
          }
        });

      // 2. Table 2: Vegetable Seeds & Breeder Seeds
      let currentSubCat: 'Vegetable Seeds' | 'Breeder Seeds (Vegetables)' = 'Vegetable Seeds';
      let vegIdx = 0;
      let breedIdx = 0;

      $(tables[1])
        .find('tr')
        .each((i, row) => {
          if (i === 0) return;
          const rowText = $(row).text();
          if (rowText.includes('Breeder seeds')) {
            currentSubCat = 'Breeder Seeds (Vegetables)';
            return;
          }

          const tds = $(row).find('td');
          if (tds.length >= 3) {
            const slNo = cleanText($(tds[0]).text()).replace(/\./g, '');
            const particulars = cleanText($(tds[1]).text());
            const p = parsePrice($(tds[2]).text());
            if (particulars && p.price > 0) {
              const count = currentSubCat === 'Vegetable Seeds' ? ++vegIdx : ++breedIdx;
              const prefix = currentSubCat === 'Vegetable Seeds' ? 'veg' : 'breed';
              items.push({
                id: `${prefix}-${count}`,
                category: currentSubCat,
                slNo: slNo || String(count),
                particulars,
                pricePerKg: p.price,
                unit: p.unit,
                rawPriceText: p.raw || `${p.price}.00`,
              });
            }
          }
        });

      // 3. Table 3: Flower & Tree Seeds
      $(tables[2])
        .find('tr')
        .each((i, row) => {
          if (i === 0) return;
          const tds = $(row).find('td');
          if (tds.length >= 3) {
            const slNo = cleanText($(tds[0]).text()).replace(/\./g, '');
            const particulars = cleanText($(tds[1]).text());
            const p = parsePrice($(tds[2]).text());
            if (particulars) {
              items.push({
                id: `flower-${i}`,
                category: 'Flower & Tree Seeds',
                slNo: slNo || String(i),
                particulars,
                pricePerKg: p.price,
                unit: p.unit,
                rawPriceText: p.raw || `${p.price}.00`,
              });
            }
          }
        });

      // 4. Table 4: Medicinal Plant Seeds
      $(tables[3])
        .find('tr')
        .each((i, row) => {
          if (i === 0) return;
          const tds = $(row).find('td');
          if (tds.length >= 3) {
            const slNo = cleanText($(tds[0]).text()).replace(/\./g, '');
            const particulars = cleanText($(tds[1]).text());
            const p = parsePrice($(tds[2]).text());
            if (particulars) {
              items.push({
                id: `med-${i}`,
                category: 'Medicinal Plant Seeds',
                slNo: slNo || String(i),
                particulars,
                pricePerKg: p.price,
                unit: p.unit,
                rawPriceText: p.raw || `${p.price}.00`,
              });
            }
          }
        });
    }

    if (items.length === 0) {
      throw new Error('No table items parsed from external HTML.');
    }
  } catch (err: any) {
    console.warn('TNAU Seed live fetch failed, serving pre-indexed verified dataset:', err?.message);
    items = TNAU_SEEDS_FALLBACK.map((s) => ({
      ...s,
      particulars: cleanText(s.particulars),
      rawPriceText: cleanText(s.rawPriceText),
    }));
    isFallback = true;
  }

  // Filter by category if requested
  let filtered = items;
  if (categoryParam && categoryParam !== 'All') {
    filtered = filtered.filter(
      (item) => item.category.toLowerCase() === categoryParam.toLowerCase()
    );
  }

  // Filter by text search if requested
  if (queryParam) {
    filtered = filtered.filter(
      (item) =>
        item.particulars.toLowerCase().includes(queryParam) ||
        item.category.toLowerCase().includes(queryParam) ||
        String(item.slNo).includes(queryParam)
    );
  }

  const allCategories = Array.from(new Set(items.map((i) => i.category)));

  const response: TnauSeedResponse = {
    success: true,
    sourceUrl: TNAU_URL,
    sourceTitle: 'TNAU Agritech Portal :: Input Source (Seeds - TNAU Sale)',
    totalItems: filtered.length,
    categories: allCategories,
    lastUpdated: new Date().toISOString(),
    data: filtered,
    isFallback,
  };

  return NextResponse.json(response);
}
