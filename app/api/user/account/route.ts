import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  getServerAuthenticatedUser,
  invalidateAllUserSessions,
  revokeSessionToken,
  clearAuthCookies,
} from '@/lib/serverAuth';

async function deleteIfTableExists(query: string, params: any[]) {
  try {
    await pool.query(query, params);
  } catch (err: any) {
    // 42P01: relation does not exist (e.g., optional OTP tables before first use)
    if (err?.code !== '42P01') {
      throw err;
    }
  }
}

/**
 * DELETE /api/user/account
 * Permanently deletes the authenticated user's account record (matched by id & logged-in email),
 * deletes all associated plans/OTP records, revokes/invalidates all server sessions, and clears auth cookies.
 */
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getServerAuthenticatedUser(request);
    if (!authUser || !authUser.id) {
      const res = NextResponse.json(
        { success: false, error: 'Unauthorized: Valid authentication required' },
        { status: 401 }
      );
      clearAuthCookies(res);
      return res;
    }

    const body = await request.json().catch(() => null);
    const submittedPhrase = String(body?.confirmation || '').trim();

    const userId = String(authUser.id);
    const userRes = await pool.query(
      'SELECT id, email FROM users_table WHERE id = $1 LIMIT 1',
      [userId]
    );

    if (userRes.rows.length === 0) {
      const res = NextResponse.json(
        { success: false, error: 'User account not found' },
        { status: 404 }
      );
      clearAuthCookies(res);
      return res;
    }

    const userEmail = String(userRes.rows[0].email || authUser.email || '').trim().toLowerCase();
    const expectedPhrase = userEmail ? `delete ${userEmail}` : 'delete the account';

    if (!submittedPhrase || submittedPhrase !== expectedPhrase) {
      return NextResponse.json(
        {
          success: false,
          error: `Confirmation phrase mismatch. Please type "${expectedPhrase}" exactly.`,
        },
        { status: 400 }
      );
    }

    // Collect all user IDs tied to this id or logged-in email (handles any legacy duplicates safely)
    const relatedIdsRes = userEmail
      ? await pool.query(
          'SELECT id FROM users_table WHERE id::text = $1 OR LOWER(TRIM(email)) = $2',
          [userId, userEmail]
        )
      : { rows: [{ id: userId }] };

    const targetIds = Array.from(
      new Set(relatedIdsRes.rows.map((r: any) => String(r.id)).filter(Boolean))
    );
    if (targetIds.length === 0) targetIds.push(userId);

    // 1. Delete dependent user-owned records from DB before deleting the user account
    for (const idToDelete of targetIds) {
      await deleteIfTableExists('DELETE FROM cultivation_plans WHERE user_id::text = $1', [idToDelete]);
      await invalidateAllUserSessions(idToDelete);
    }
    if (userEmail) {
      await deleteIfTableExists('DELETE FROM email_otp_codes WHERE LOWER(TRIM(email)) = $1', [userEmail]);
      await deleteIfTableExists('DELETE FROM password_reset_codes WHERE LOWER(TRIM(email)) = $1', [userEmail]);
    }

    // 2. Explicitly revoke the active request JWT token
    await revokeSessionToken(request);

    // 3. Delete the user record from users_table for the currently logged-in id / email
    const deleteUserRes = await pool.query(
      userEmail
        ? 'DELETE FROM users_table WHERE id::text = $1 OR LOWER(TRIM(email)) = $2 RETURNING id, email'
        : 'DELETE FROM users_table WHERE id::text = $1 RETURNING id, email',
      userEmail ? [userId, userEmail] : [userId]
    );

    if ((deleteUserRes.rowCount ?? 0) === 0) {
      const res = NextResponse.json(
        { success: false, error: 'User account record could not be found for deletion' },
        { status: 404 }
      );
      clearAuthCookies(res);
      return res;
    }

    const response = NextResponse.json(
      {
        success: true,
        deletedEmail: userEmail || undefined,
        message: 'Your account and all active sessions have been permanently deleted.',
      },
      { status: 200 }
    );
    clearAuthCookies(response);
    return response;
  } catch (err: any) {
    console.error('[API DELETE /api/user/account error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
