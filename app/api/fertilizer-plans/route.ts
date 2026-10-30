import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  FormattedUserDetails,
  FormattedPlanRecord,
  formatDisplayDate,
  formatToNestedExpenseMap,
  calculateTotalsFromNested,
  mapRowToPlanRecord,
} from '@/lib/fertilizer/calc';

export type { FormattedUserDetails, FormattedPlanRecord };

// ─────────────────────────────────────────────────────────────────────────────
// Fertilizer Plans API  —  /api/fertilizer-plans
// Backed by PostgreSQL table: `cultivation_plans` (in Farm_DB)
// ─────────────────────────────────────────────────────────────────────────────

const plansStore = new Map<string, FormattedPlanRecord>();

/**
 * GET /api/fertilizer-plans  or  GET /api/fertilizer-plans?id=X
 * Returns plans from PostgreSQL table `cultivation_plans`, falling back to memory.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      const res = await pool.query(
        'SELECT id, created_at, updated_at, is_completed, cultivation, user_details, expense_map, totals FROM cultivation_plans WHERE id = $1',
        [id]
      );
      if (res.rows.length > 0) {
        const plan = mapRowToPlanRecord(res.rows[0]);
        plansStore.set(plan.id, plan);
        return NextResponse.json({ success: true, data: plan });
      }

      const memoryPlan = plansStore.get(id);
      if (memoryPlan) {
        return NextResponse.json({ success: true, data: memoryPlan });
      }
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
    }

    const res = await pool.query(
      'SELECT id, created_at, updated_at, is_completed, cultivation, user_details, expense_map, totals FROM cultivation_plans ORDER BY updated_at DESC'
    );
    const dbPlans: FormattedPlanRecord[] = res.rows.map(mapRowToPlanRecord);
    dbPlans.forEach((p) => plansStore.set(p.id, p));

    const allPlansMap = new Map<string, FormattedPlanRecord>();
    dbPlans.forEach((p) => allPlansMap.set(p.id, p));
    plansStore.forEach((p, k) => {
      if (!allPlansMap.has(k)) allPlansMap.set(k, p);
    });

    const allPlans = Array.from(allPlansMap.values()).sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime() || 0;
      const dateB = new Date(b.updated_at).getTime() || 0;
      return dateB - dateA;
    });

    return NextResponse.json({ success: true, total: allPlans.length, data: allPlans });
  } catch (err) {
    console.error('[DB Error in GET /api/fertilizer-plans]:', err);
    if (id) {
      const plan = plansStore.get(id);
      if (!plan) return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: plan });
    }
    const allPlans = Array.from(plansStore.values()).sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime() || 0;
      const dateB = new Date(b.updated_at).getTime() || 0;
      return dateB - dateA;
    });
    return NextResponse.json({ success: true, total: allPlans.length, data: allPlans });
  }
}

/**
 * POST /api/fertilizer-plans
 * Inserts or updates the cultivation plan in PostgreSQL `cultivation_plans` table.
 * If `id` is not provided, the database generates it via column default.
 */
export async function POST(request: NextRequest) {
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

  const existing = id ? plansStore.get(id) : undefined;
  const formattedNow = formatDisplayDate(new Date());

  const landSize = Number(userDetails?.landSize) || 100;
  const nestedExpenseMap = formatToNestedExpenseMap(expenseMap, landSize);

  // Totals calculated using the single shared calculation engine
  const calculatedTotals = calculateTotalsFromNested(nestedExpenseMap, landSize);
  const finalGrandTotal = totals?.grandTotal && totals.grandTotal > 0 ? totals.grandTotal : calculatedTotals.grandTotal;
  const finalRevenueTotal = totals?.revenueTotal && totals.revenueTotal > 0 ? totals.revenueTotal : calculatedTotals.revenueTotal;
  const finalNetProfit = totals?.netProfit !== undefined ? totals.netProfit : (finalRevenueTotal - finalGrandTotal);

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

  try {
    const upsertQuery = `
      INSERT INTO cultivation_plans (
        id, created_at, updated_at, is_completed, cultivation, user_details, expense_map, totals
      ) VALUES (
        COALESCE($1, ('plan_'::text || (floor((EXTRACT(epoch FROM clock_timestamp()) * (1000)::numeric)))::text)),
        NOW(), NOW(), $2, $3, $4, $5, $6
      )
      ON CONFLICT (id) DO UPDATE SET
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
      Boolean(isCompleted),
      cultivation,
      JSON.stringify(cleanUserDetails),
      JSON.stringify(nestedExpenseMap),
      JSON.stringify(planTotals),
    ]);

    if (dbRes.rows[0]) {
      const row = dbRes.rows[0];
      const planRecord: FormattedPlanRecord = {
        id: row.id,
        created_at: formatDisplayDate(row.created_at),
        updated_at: formatDisplayDate(row.updated_at),
        isCompleted: Boolean(row.is_completed),
        cultivation: 'paddy',
        userDetails: cleanUserDetails,
        expenseMap: nestedExpenseMap,
        totals: planTotals,
      };
      plansStore.set(row.id, planRecord);

      return NextResponse.json(
        {
          success: true,
          message: existing || id ? 'Plan updated' : 'Plan created',
          data: planRecord,
        },
        { status: existing || id ? 200 : 201 }
      );
    }
  } catch (dbErr) {
    console.error('[DB Error in POST /api/fertilizer-plans]:', dbErr);
  }

  // Fallback in-memory if DB fails
  const fallbackId = (id && typeof id === 'string' && id.trim() !== '') ? id : `plan_${Date.now()}`;
  const fallbackRecord: FormattedPlanRecord = {
    id: fallbackId,
    created_at: existing ? existing.created_at : formattedNow,
    updated_at: formattedNow,
    isCompleted: Boolean(isCompleted),
    cultivation: 'paddy',
    userDetails: cleanUserDetails,
    expenseMap: nestedExpenseMap,
    totals: planTotals,
  };
  plansStore.set(fallbackId, fallbackRecord);

  return NextResponse.json(
    {
      success: true,
      message: existing ? 'Plan updated' : 'Plan created',
      data: fallbackRecord,
    },
    { status: existing ? 200 : 201 }
  );
}

/**
 * PATCH /api/fertilizer-plans?id=X
 * Updates specific fields in PostgreSQL table and memory.
 */
export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Plan id query param is required' }, { status: 400 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const existing = plansStore.get(id);
  const isCompleted = typeof body.isCompleted === 'boolean' ? body.isCompleted : (existing ? existing.isCompleted : false);

  const updated: FormattedPlanRecord = {
    id,
    created_at: existing?.created_at || formatDisplayDate(new Date()),
    updated_at: formatDisplayDate(new Date()),
    isCompleted,
    cultivation: 'paddy',
    userDetails: body.userDetails ? { ...(existing?.userDetails || {}), ...body.userDetails } : (existing?.userDetails || { name: '', phone: '', landSize: 0, state: '', district: '', city: '', village: '', address: '' }),
    expenseMap: body.expenseMap ? formatToNestedExpenseMap(body.expenseMap) : (existing?.expenseMap || {}),
    totals: body.totals ? { ...(existing?.totals || { grandTotal: 0, revenueTotal: 0, netProfit: 0 }), ...body.totals } : (existing?.totals || { grandTotal: 0, revenueTotal: 0, netProfit: 0 }),
  };

  plansStore.set(id, updated);

  try {
    const patchQuery = `
      UPDATE cultivation_plans
      SET
        is_completed = COALESCE($2, is_completed),
        updated_at = NOW(),
        user_details = COALESCE($3, user_details),
        expense_map = COALESCE($4, expense_map),
        totals = COALESCE($5, totals)
      WHERE id = $1
      RETURNING *;
    `;
    const dbRes = await pool.query(patchQuery, [
      id,
      typeof body.isCompleted === 'boolean' ? body.isCompleted : null,
      body.userDetails ? JSON.stringify(updated.userDetails) : null,
      body.expenseMap ? JSON.stringify(updated.expenseMap) : null,
      body.totals ? JSON.stringify(updated.totals) : null,
    ]);

    if (dbRes.rows[0]) {
      updated.created_at = formatDisplayDate(dbRes.rows[0].created_at);
      updated.updated_at = formatDisplayDate(dbRes.rows[0].updated_at);
      plansStore.set(id, updated);
    }
  } catch (dbErr) {
    console.error('[DB Error in PATCH /api/fertilizer-plans]:', dbErr);
  }

  return NextResponse.json({ success: true, message: 'Plan patched', data: updated });
}

/**
 * DELETE /api/fertilizer-plans?id=X
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Plan id query param is required' }, { status: 400 });
  }

  const existed = plansStore.has(id);
  plansStore.delete(id);

  try {
    await pool.query('DELETE FROM cultivation_plans WHERE id = $1', [id]);
  } catch (dbErr) {
    console.error('[DB Error in DELETE /api/fertilizer-plans]:', dbErr);
  }

  return NextResponse.json({ success: true, deleted: existed, id });
}
