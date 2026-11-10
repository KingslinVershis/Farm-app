import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * POST /api/user/password
 * Changes the authenticated user's password after verifying their current password.
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
    const { currentPassword, newPassword } = body || {};

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Both current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const userId = String(authUser.id);
    const userRes = await pool.query(
      'SELECT password FROM users_table WHERE id = $1',
      [userId]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User account not found' },
        { status: 404 }
      );
    }

    const storedHash = userRes.rows[0].password;
    const isMatch = await bcrypt.compare(currentPassword, storedHash);

    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users_table SET password = $1, updated_at = NOW() WHERE id = $2',
      [newHashedPassword, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err: any) {
    console.error('[API /api/user/password error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  return POST(request);
}

