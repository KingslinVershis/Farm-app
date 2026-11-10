import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * POST /api/user/language
 * Dedicated API to update the authenticated user's preferred language in users_table.
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
    const language = body?.language;

    if (!language || (language !== 'en' && language !== 'ta')) {
      return NextResponse.json(
        { success: false, error: 'Invalid language. Expected "en" or "ta".' },
        { status: 400 }
      );
    }

    const userId = String(authUser.id);
    const result = await pool.query(
      'UPDATE users_table SET language = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, email, theme, language',
      [language, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      language,
      message: 'Language preference updated successfully',
    });
  } catch (err: any) {
    console.error('[API /api/user/language error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/language
 * Alias for POST
 */
export async function PATCH(request: NextRequest) {
  return POST(request);
}

