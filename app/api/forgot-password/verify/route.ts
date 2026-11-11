import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  RESET_MAX_ATTEMPTS,
  ensurePasswordResetTable,
  hashResetCode,
} from '@/lib/passwordReset';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const rawEmail = body?.email ? String(body.email) : '';
    const cleanEmail = rawEmail.trim().toLowerCase();
    const code = body?.code ? String(body.code).trim() : '';

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

    await ensurePasswordResetTable();

    const codeRes = await pool.query(
      'SELECT email, code_hash, expires_at, attempts FROM password_reset_codes WHERE email = $1 LIMIT 1',
      [cleanEmail]
    );

    if (codeRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No active verification code found. Please request a new code.' },
        { status: 400 }
      );
    }

    const record = codeRes.rows[0];

    if (new Date(record.expires_at).getTime() <= Date.now()) {
      await pool.query('DELETE FROM password_reset_codes WHERE email = $1', [cleanEmail]).catch(() => {});
      return NextResponse.json(
        { success: false, error: 'Verification code has expired (5-minute limit). Please request a new code.' },
        { status: 400 }
      );
    }

    if (Number(record.attempts) >= RESET_MAX_ATTEMPTS) {
      await pool.query('DELETE FROM password_reset_codes WHERE email = $1', [cleanEmail]).catch(() => {});
      return NextResponse.json(
        { success: false, error: 'Too many invalid code attempts. Please request a new verification code.' },
        { status: 429 }
      );
    }

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

    return NextResponse.json(
      {
        success: true,
        message: 'Verification code accepted. Please create your new password.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[API /api/forgot-password/verify error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

