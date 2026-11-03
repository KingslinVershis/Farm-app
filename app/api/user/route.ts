import { NextRequest, NextResponse } from "next/server";
import { pool } from '@/lib/db';
import { verifyAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import {
  FormattedUserDetails,
  FormattedPlanRecord,
  formatDisplayDate,
  formatToNestedExpenseMap,
  calculateTotalsFromNested,
  mapRowToPlanRecord,
} from '@/lib/fertilizer/calc';

export type { FormattedUserDetails, FormattedPlanRecord };

// Helper: Extract and verify authenticated user from request
async function getAuthenticatedUser(request: NextRequest) {
  const token =
    request.cookies.get(AUTH_COOKIE_NAME)?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (token) {
    const payload = await verifyAuthToken(token);
    if (payload?.id) return payload;
  }

  const headerUserId = request.headers.get('x-user-id');
  if (headerUserId) {
    return {
      id: headerUserId,
      email: request.headers.get('x-user-email') || '',
      role: request.headers.get('x-user-role') || 'Farmer',
    };
  }

  return null;
}

/**
 * GET /api/user
 * Returns the currently authenticated user's profile and their specific fertilizer plans.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid authentication required' },
        { status: 401 }
      );
    }

    const userId = String(authUser.id);

    // 1. Fetch user profile from users_table
    let userDetails = {
      id: userId,
      username: authUser.username || (authUser.email ? authUser.email.split('@')[0] : 'User'),
      email: authUser.email || '',
      role: authUser.role || 'Farmer',
    };

    try {
      const userRes = await pool.query(
        'SELECT id, username, email, role, isactive FROM users_table WHERE id = $1',
        [userId]
      );
      if (userRes.rows.length > 0) {
        const u = userRes.rows[0];
        userDetails = {
          id: u.id,
          username: u.username || userDetails.username,
          email: u.email || userDetails.email,
          role: u.role || 'Farmer',
        };
      }
    } catch (dbErr) {
      console.warn('[UserAPI] Failed to fetch user profile from DB:', dbErr);
    }

    // 2. Fetch fertilizer plans belonging strictly to this user
    let userPlans: FormattedPlanRecord[] = [];
    try {
      const plansRes = await pool.query(
        'SELECT id, created_at, updated_at, is_completed, cultivation, user_details, expense_map, totals FROM cultivation_plans WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );
      userPlans = plansRes.rows.map(mapRowToPlanRecord);
    } catch (planErr) {
      console.warn('[UserAPI] Failed to fetch user plans from DB:', planErr);
    }

    return NextResponse.json({
      success: true,
      user: userDetails,
      plans: userPlans,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user
 * Inserts or updates a cultivation plan associated with the authenticated user.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid authentication required' },
        { status: 401 }
      );
    }

    const userId = String(authUser.id);

    let body: Record<string, any>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      id,
      isCompleted = false,
      cultivation = 'paddy',
      userDetails = {},
      expenseMap = {},
      totals = {},
    } = body;

    const landSize = Number(userDetails?.landSize) || 100;
    const nestedExpenseMap = formatToNestedExpenseMap('paddy', expenseMap, landSize);
    const calculatedTotals = calculateTotalsFromNested(nestedExpenseMap, landSize);

    const finalGrandTotal =
      totals?.grandTotal && totals.grandTotal > 0 ? totals.grandTotal : calculatedTotals.grandTotal;
    const finalRevenueTotal =
      totals?.revenueTotal && totals.revenueTotal > 0 ? totals.revenueTotal : calculatedTotals.revenueTotal;
    const finalNetProfit =
      totals?.netProfit !== undefined ? totals.netProfit : finalRevenueTotal - finalGrandTotal;

    const cleanUserDetails: FormattedUserDetails = {
      name: userDetails.name || '',
      phone: userDetails.phone || '',
      landSize: Number(userDetails.landSize) || 0,
      state: userDetails.state || 'Tamil Nadu',
      district: userDetails.district || '',
      city: userDetails.city || '',
      village: userDetails.village || '',
      address: userDetails.address || '',
    };

    const planTotals = {
      grandTotal: finalGrandTotal,
      revenueTotal: finalRevenueTotal,
      netProfit: finalNetProfit,
    };

    const upsertQuery = `
      INSERT INTO cultivation_plans (
        id, user_id, created_at, updated_at, is_completed, cultivation, user_details, expense_map, totals
      ) VALUES (
        COALESCE($1, ('plan_'::text || (floor((EXTRACT(epoch FROM clock_timestamp()) * (1000)::numeric)))::text)),
        $2, NOW(), NOW(), $3, $4, $5, $6, $7
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        updated_at = NOW(),
        is_completed = EXCLUDED.is_completed,
        cultivation = EXCLUDED.cultivation,
        user_details = EXCLUDED.user_details,
        expense_map = EXCLUDED.expense_map,
        totals = EXCLUDED.totals
      RETURNING *;
    `;

    const dbRes = await pool.query(upsertQuery, [
      id && typeof id === 'string' && id.trim() !== '' ? id.trim() : null,
      userId,
      Boolean(isCompleted),
      cultivation,
      JSON.stringify(cleanUserDetails),
      JSON.stringify(nestedExpenseMap),
      JSON.stringify(planTotals),
    ]);

    const row = dbRes.rows[0];
    const planRecord = mapRowToPlanRecord(row);

    return NextResponse.json({
      success: true,
      message: id ? 'Plan updated' : 'Plan created',
      data: planRecord,
    });
  } catch (err: any) {
    console.error('[UserAPI POST error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save plan' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user?id=X
 * Deletes a plan that belongs to the authenticated user.
 */
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing plan id' }, { status: 400 });
    }

    await pool.query(
      'DELETE FROM cultivation_plans WHERE id = $1 AND user_id = $2',
      [id, authUser.id]
    );

    return NextResponse.json({ success: true, message: 'Plan deleted' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete plan' },
      { status: 500 }
    );
  }
}

