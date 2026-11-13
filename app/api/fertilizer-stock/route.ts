import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getServerAuthenticatedUser, clearAuthCookies } from '@/lib/serverAuth';

export interface FertDistrictItem {
  id: string;
  name: string;
}

export interface FertSubdistrictItem {
  id: string;
  name: string;
}

export interface FertDealerStockItem {
  fertilizer: string;
  quantityMt: number;
}

export interface FertDealerRecord {
  id: string;
  shopName: string;
  phone: string;
  stocks: FertDealerStockItem[];
  totalStockMt: number;
}

export interface FertPriceProductItem {
  id: string;
  name: string;
}

export interface FertPriceDetailRow {
  slNo: number;
  company: string;
  companyTamil: string;
  price: string;
}

export interface FertStockApiResponse {
  success: boolean;
  sourceUrl: string;
  reportDate?: string;
  districts?: FertDistrictItem[];
  subdistricts?: FertSubdistrictItem[];
  dealers?: FertDealerRecord[];
  availableFertilizers?: string[];
  products?: FertPriceProductItem[];
  prices?: FertPriceDetailRow[];
  unitLabel?: string;
  error?: string;
}

const BASE_URL = 'https://tnagriculture.in/ARS/fert_stock_position';
const PRICE_BASE_URL = 'http://115.243.209.84/people_app/fertilizer_price';

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: REQUEST_HEADERS,
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      throw new Error(`External source responded with status ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractIdFromHref(href: string | undefined): string {
  if (!href) return '';
  const match = href.match(/\/(\d+)(?:\/[a-z]{2})?\/?$/i);
  return match ? match[1] : '';
}

function extractReportDate($: cheerio.CheerioAPI): string {
  const text = $('body').text();
  const match = text.match(/\b(\d{2}-\d{2}-\d{4})\b/);
  return match ? match[1] : '';
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
  const mode = searchParams.get('mode')?.trim();
  const priceProductId = searchParams.get('priceProductId')?.trim();
  const districtId = searchParams.get('districtId')?.trim();
  const subdistrictId = searchParams.get('subdistrictId')?.trim();
  const langParam = searchParams.get('lang')?.trim() === 'ta' ? 'ta' : 'en';

  // 0a. Fertilizer Price: Product dropdown list
  if (mode === 'price-products') {
    const targetUrl = `${PRICE_BASE_URL}/index/en`;
    try {
      const html = await fetchHtml(targetUrl);
      const $ = cheerio.load(html);
      const products: FertPriceProductItem[] = [];
      const seen = new Set<string>();

      $('select option').each((_, el) => {
        const id = ($(el).attr('value') || '').trim();
        const name = $(el).text().replace(/\s+/g, ' ').trim();
        if (id && name && !seen.has(id)) {
          seen.add(id);
          products.push({ id, name });
        }
      });

      return NextResponse.json({
        success: true,
        sourceUrl: targetUrl,
        products,
      } satisfies FertStockApiResponse);
    } catch (error: any) {
      console.error('[API /api/fertilizer-stock price-products error]:', error);
      return NextResponse.json(
        {
          success: false,
          sourceUrl: targetUrl,
          products: [],
          error: error?.message || 'Unable to load fertilizer product list.',
        } satisfies FertStockApiResponse,
        { status: 500 }
      );
    }
  }

  // 0b. Fertilizer Price: Company & price rows for selected product
  if (priceProductId) {
    const targetUrl = `${PRICE_BASE_URL}/fertDetails/${encodeURIComponent(priceProductId)}`;
    try {
      const rawJson = await fetchHtml(targetUrl);
      const parsed = JSON.parse(rawJson);
      const list = Array.isArray(parsed) ? parsed : [];
      const prices: FertPriceDetailRow[] = list.map((item: any, idx: number) => ({
        slNo: idx + 1,
        company: String(item?.company || '-').trim(),
        companyTamil: String(item?.company_tamil || item?.company || '-').trim(),
        price: String(item?.price ?? '-').trim(),
      }));

      return NextResponse.json({
        success: true,
        sourceUrl: targetUrl,
        prices,
        unitLabel: priceProductId === '1' ? 'Rs / 45 kgs' : 'Rs / 50 kgs',
      } satisfies FertStockApiResponse);
    } catch (error: any) {
      console.error('[API /api/fertilizer-stock priceProductId error]:', error);
      return NextResponse.json(
        {
          success: false,
          sourceUrl: targetUrl,
          prices: [],
          error: error?.message || 'Unable to fetch fertilizer price details.',
        } satisfies FertStockApiResponse,
        { status: 500 }
      );
    }
  }

  // 1. Dealer Wise Stock for a selected sub-district
  if (subdistrictId) {
    const targetUrl =
      langParam === 'ta'
        ? `${BASE_URL}/dealer_report/${encodeURIComponent(subdistrictId)}`
        : `${BASE_URL}/dealer_report/${encodeURIComponent(subdistrictId)}/en`;

    try {
      const html = await fetchHtml(targetUrl);
      const $ = cheerio.load(html);
      const reportDate = extractReportDate($);

      const headers: string[] = [];
      $('table thead th').each((_, th) => {
        headers.push($(th).text().replace(/\s+/g, ' ').trim());
      });

      const dealers: FertDealerRecord[] = [];
      const fertSet = new Set<string>();

      $('table tbody tr').each((rowIdx, tr) => {
        const th = $(tr).find('th').first();
        if (!th.length) return;

        const phoneSpanText = th.find('span').text().replace(/\s+/g, ' ').trim();
        const thClone = th.clone();
        thClone.find('span').remove();
        let shopName = thClone.text().replace(/\s+/g, ' ').trim();

        let phone = phoneSpanText;
        if (!phone) {
          const phoneMatch = shopName.match(/\b(\d{8,12})\b/);
          if (phoneMatch) {
            phone = phoneMatch[1];
            shopName = shopName.replace(phoneMatch[1], '').trim();
          }
        }

        if (!shopName || /^total$/i.test(shopName)) return;

        const stocks: FertDealerStockItem[] = [];
        let totalStockMt = 0;

        $(tr)
          .find('td')
          .each((tdIdx, td) => {
            const rawVal = $(td).text().replace(/[^0-9.-]/g, '').trim();
            if (!rawVal) return;
            const qty = parseFloat(rawVal);
            if (!Number.isFinite(qty) || qty <= 0) return;

            const fertName = headers[tdIdx + 1] || `Fertilizer ${tdIdx + 1}`;
            stocks.push({
              fertilizer: fertName,
              quantityMt: Math.round(qty * 100) / 100,
            });
            fertSet.add(fertName);
            totalStockMt += qty;
          });

        dealers.push({
          id: `dealer-${subdistrictId}-${rowIdx}`,
          shopName,
          phone: phone || '-',
          stocks,
          totalStockMt: Math.round(totalStockMt * 100) / 100,
        });
      });

      return NextResponse.json({
        success: true,
        sourceUrl: targetUrl,
        reportDate,
        dealers,
        availableFertilizers: Array.from(fertSet).sort((a, b) => a.localeCompare(b)),
      } satisfies FertStockApiResponse);
    } catch (error: any) {
      console.error('[API /api/fertilizer-stock dealer_report error]:', error);
      return NextResponse.json(
        {
          success: false,
          sourceUrl: targetUrl,
          dealers: [],
          availableFertilizers: [],
          error: error?.message || 'Unable to fetch dealer stock report.',
        } satisfies FertStockApiResponse,
        { status: 500 }
      );
    }
  }

  // 2. Sub-District list for a selected district
  if (districtId) {
    const targetUrl =
      langParam === 'ta'
        ? `${BASE_URL}/subdistrict_report/${encodeURIComponent(districtId)}`
        : `${BASE_URL}/subdistrict_report/${encodeURIComponent(districtId)}/en`;

    try {
      const html = await fetchHtml(targetUrl);
      const $ = cheerio.load(html);
      const reportDate = extractReportDate($);

      const subdistricts: FertSubdistrictItem[] = [];
      const seen = new Set<string>();

      $('table tbody tr th a').each((_, el) => {
        const name = $(el).text().replace(/\s+/g, ' ').trim();
        const id = extractIdFromHref($(el).attr('href'));
        if (name && id && !seen.has(id)) {
          seen.add(id);
          subdistricts.push({ id, name });
        }
      });

      return NextResponse.json({
        success: true,
        sourceUrl: targetUrl,
        reportDate,
        subdistricts,
      } satisfies FertStockApiResponse);
    } catch (error: any) {
      console.error('[API /api/fertilizer-stock subdistrict_report error]:', error);
      return NextResponse.json(
        {
          success: false,
          sourceUrl: targetUrl,
          subdistricts: [],
          error: error?.message || 'Unable to fetch sub-district list.',
        } satisfies FertStockApiResponse,
        { status: 500 }
      );
    }
  }

  // 3. District list from index
  const targetUrl = `${BASE_URL}/index/${langParam}`;
  try {
    const html = await fetchHtml(targetUrl);
    const $ = cheerio.load(html);
    const reportDate = extractReportDate($);

    const districts: FertDistrictItem[] = [];
    const seen = new Set<string>();

    $('table tbody tr th a').each((_, el) => {
      const name = $(el).text().replace(/\s+/g, ' ').trim();
      const id = extractIdFromHref($(el).attr('href'));
      if (name && id && !seen.has(id)) {
        seen.add(id);
        districts.push({ id, name });
      }
    });

    return NextResponse.json({
      success: true,
      sourceUrl: targetUrl,
      reportDate,
      districts,
    } satisfies FertStockApiResponse);
  } catch (error: any) {
    console.error('[API /api/fertilizer-stock index error]:', error);
    return NextResponse.json(
      {
        success: false,
        sourceUrl: targetUrl,
        districts: [],
        error: error?.message || 'Unable to fetch district list.',
      } satisfies FertStockApiResponse,
      { status: 500 }
    );
  }
}

