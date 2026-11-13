import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getServerAuthenticatedUser, clearAuthCookies } from '@/lib/serverAuth';

export interface OfficialCard {
  id: string;
  name: string;
  initials: string;
  designation: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
}

export interface HeadquarterContact {
  slNo: string;
  headquarters: string;
  designation: string;
  name: string;
  email: string;
}

export interface DistrictBlockContact {
  District_Name: string;
  head: string;
  Block_Name: string | null;
  design: string;
  name: string;
  email: string;
}

export interface ContactDataResponse {
  success: boolean;
  officials: OfficialCard[];
  headquarters: HeadquarterContact[];
  error?: string;
}

export interface DistrictContactsApiResponse {
  success: boolean;
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: DistrictBlockContact[];
  error?: string;
}

const CONTACT_PAGE_URL = 'https://www.tnagrisnet.tn.gov.in/home/contact/en';
const CONTACT_LIST_URL = 'https://www.tnagrisnet.tn.gov.in/home/contact_list';

function getInitials(name: string): string {
  // Strip salutations: Thiru, Dr, Tmt, Selvi, IAS, etc.
  const cleaned = name
    .replace(/\b(Thiru|Dr|Tmt|Selvi|IAS|Hon'ble|Honourable)\b\.?/gi, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TN';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function parseContactPage(html: string): {
  officials: OfficialCard[];
  headquarters: HeadquarterContact[];
} {
  const $ = cheerio.load(html);
  const officials: OfficialCard[] = [];
  const headquarters: HeadquarterContact[] = [];

  // 1. Extract Government of Tamil Nadu officials cards
  $('section.am-officials article.am-off').each((idx, el) => {
    const $el = $(el);
    const photoSrc = $el.find('img.am-photo').attr('src') || '';
    const name = $el.find('h4').text().trim();
    const designation = $el.find('p.am-desig').text().trim();

    let email = '';
    let phone = '';

    $el.find('a.am-contact').each((_, a) => {
      const href = $(a).attr('href') || '';
      const text = $(a).text().trim();
      if (href.startsWith('mailto:')) {
        email = text || href.replace('mailto:', '').trim();
      } else if (href.startsWith('tel:')) {
        phone = text || href.replace('tel:', '').trim();
      }
    });

    if (name || designation) {
      officials.push({
        id: `official-${idx + 1}`,
        name,
        initials: getInitials(name),
        designation,
        email: email || undefined,
        phone: phone || undefined,
        photoUrl: photoSrc || undefined,
      });
    }
  });

  // 2. Extract Head Quarters table (first table after headings)
  $('table.table').first().find('tbody tr').each((idx, row) => {
    const tds = $(row).find('td');
    if (tds.length < 5) return;

    const slNo = tds.eq(0).text().trim() || String(idx + 1);
    const hq = tds.eq(1).text().trim();
    const desig = tds.eq(2).text().trim();
    const name = tds.eq(3).text().trim();
    const email = tds.eq(4).text().trim();

    if (name || desig || hq) {
      headquarters.push({
        slNo,
        headquarters: hq,
        designation: desig,
        name,
        email,
      });
    }
  });

  return { officials, headquarters };
}

// GET: returns officials cards + headquarters table
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
    const res = await fetch(CONTACT_PAGE_URL, {
      next: { revalidate: 3600 },
      headers: {
        Accept: 'text/html,application/xhtml+xml,*/*',
        'User-Agent': 'Mozilla/5.0 (PrecisionFarmOS)',
      },
    });

    if (!res.ok) {
      throw new Error(`Upstream contact page returned ${res.status}`);
    }

    const html = await res.text();
    const { officials, headquarters } = parseContactPage(html);

    return NextResponse.json<ContactDataResponse>({
      success: true,
      officials,
      headquarters,
    });
  } catch (err: any) {
    console.error('[API /api/contacts] GET error:', err);
    return NextResponse.json<ContactDataResponse>(
      {
        success: false,
        officials: [],
        headquarters: [],
        error: err?.message || 'Failed to fetch contact details.',
      },
      { status: 500 }
    );
  }
}

// POST: proxies paginated / filtered search to https://www.tnagrisnet.tn.gov.in/home/contact_list
export async function POST(req: NextRequest) {
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
    const body = await req.json().catch(() => ({}));
    const start = String(body.start ?? 0);
    const length = String(body.length ?? 10);
    const searchValue = String(body.search ?? body['search[value]'] ?? '');
    const draw = Number(body.draw ?? 1);

    const formData = new URLSearchParams();
    formData.append('draw', String(draw));
    formData.append('start', start);
    formData.append('length', length);
    formData.append('search[value]', searchValue);
    formData.append('search[regex]', 'false');
    formData.append('ci_csrf_token', '');

    const res = await fetch(CONTACT_LIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'User-Agent': 'Mozilla/5.0 (PrecisionFarmOS)',
      },
      body: formData.toString(),
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Upstream contact_list returned ${res.status}`);
    }

    const json = await res.json();
    return NextResponse.json<DistrictContactsApiResponse>({
      success: true,
      draw: Number(json.draw || draw),
      recordsTotal: Number(json.recordsTotal || 0),
      recordsFiltered: Number(json.recordsFiltered || 0),
      data: Array.isArray(json.data) ? json.data : [],
    });
  } catch (err: any) {
    console.error('[API /api/contacts] POST error:', err);
    return NextResponse.json<DistrictContactsApiResponse>(
      {
        success: false,
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0,
        data: [],
        error: err?.message || 'Failed to fetch district contact list.',
      },
      { status: 500 }
    );
  }
}

