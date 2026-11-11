import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getServerAuthenticatedUser as getAuthenticatedUser } from '@/lib/serverAuth';

/**
 * POST /api/user/theme
 * Dedicated API to update the authenticated user's UI theme in users_table.
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

    const body = await request.json().catch(() => null);
    const theme = body?.theme;

    if (!theme || (theme !== 'dark' && theme !== 'light')) {
      return NextResponse.json(
        { success: false, error: 'Invalid theme. Expected "dark" or "light".' },
        { status: 400 }
      );
    }

    const userId = String(authUser.id);
    const result = await pool.query(
      'UPDATE users_table SET theme = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email, theme, language',
      [theme, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      theme,
      message: 'Theme preference updated successfully',
    });
  } catch (err: any) {
    console.error('[API /api/user/theme error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/theme
 * Alias for POST
 */
export async function PATCH(request: NextRequest) {
  return POST(request);
}

