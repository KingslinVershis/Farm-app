import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  RESET_MAX_ATTEMPTS,
  ensurePasswordResetTable,
  hashResetCode,
} from '@/lib/passwordReset';
import { invalidateAllUserSessions, clearAuthCookies } from '@/lib/serverAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const rawEmail = body?.email ? String(body.email) : '';
    const cleanEmail = rawEmail.trim().toLowerCase();
    const code = body?.code ? String(body.code).trim() : '';
    const newPassword = body?.newPassword ? String(body.newPassword) : '';
    const confirmPassword = body?.confirmPassword ? String(body.confirmPassword) : '';

    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: 'Email address is required.' },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid 6-digit verification code.' },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'New password and confirm password do not match.' },
        { status: 400 }
      );
    }

    // 1. Verify account exists
    const userRes = await pool.query(
      'SELECT id, email FROM users_table WHERE LOWER(email) = $1 LIMIT 1',
      [cleanEmail]
    );
    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No account found with this email address.' },
        { status: 404 }
      );
    }

    // 2. Ensure table & fetch stored verification code record
    await ensurePasswordResetTable();
    const codeRes = await pool.query(
      'SELECT email, code_hash, expires_at, attempts FROM password_reset_codes WHERE email = $1 LIMIT 1',
      [cleanEmail]
    );

    if (codeRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active reset code found. Please request a new 6-digit code.' },
        { status: 400 }
      );
    }

    const record = codeRes.rows[0];

    // 3. Enforce 5-minute expiration
    if (new Date(record.expires_at).getTime() <= Date.now()) {
      await pool.query('DELETE FROM password_reset_codes WHERE email = $1', [cleanEmail]).catch(() => {});
      return NextResponse.json(
        { success: false, error: 'Verification code has expired (5-minute limit). Please request a new code.' },
        { status: 400 }
      );
    }

    // 4. Check attempt limit
    if (Number(record.attempts) >= RESET_MAX_ATTEMPTS) {
      await pool.query('DELETE FROM password_reset_codes WHERE email = $1', [cleanEmail]).catch(() => {});
      return NextResponse.json(
        { success: false, error: 'Too many invalid code attempts. Please request a new verification code.' },
        { status: 429 }
      );
    }

    // 5. Verify 6-digit code hash
    const submittedHash = hashResetCode(code, cleanEmail);
    if (submittedHash !== record.code_hash) {
      await pool.query(
        'UPDATE password_reset_codes SET attempts = attempts + 1 WHERE email = $1',
        [cleanEmail]
      );
      return NextResponse.json(
        { success: false, error: 'Invalid 6-digit verification code. Please check and try again.' },
        { status: 400 }
      );
    }

    // 6. Update password in users_table, delete consumed code, & invalidate all existing sessions
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users_table SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, userRes.rows[0].id]
    );
    await pool.query('DELETE FROM password_reset_codes WHERE email = $1', [cleanEmail]);
    await invalidateAllUserSessions(String(userRes.rows[0].id));

    const response = NextResponse.json(
      {
        success: true,
        message: 'Password has been reset successfully! All previous sessions were signed out for security.',
      },
      { status: 200 }
    );
    clearAuthCookies(response);
    return response;
  } catch (err: any) {
    console.error('[API /api/forgot-password/reset error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
