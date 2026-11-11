import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  RESET_CODE_TTL_SECONDS,
  ensurePasswordResetTable,
  hashResetCode,
} from '@/lib/passwordReset';
import { sendPasswordResetEmail } from '@/lib/mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const rawEmail = body?.email ? String(body.email) : '';
    const cleanEmail = rawEmail.trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // 1. Validate email exists in users_table
    const userRes = await pool.query(
      'SELECT id, username, email FROM users_table WHERE LOWER(email) = $1 LIMIT 1',
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No account found with this email address. Please check your email and try again.',
        },
        { status: 404 }
      );
    }

    // 2. Ensure reset code storage table exists & clean expired codes
    await ensurePasswordResetTable();
    await pool.query('DELETE FROM password_reset_codes WHERE expires_at < NOW()').catch(() => {});

    // 3. Generate cryptographically secure 6-digit verification code valid for 5 minutes
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = hashResetCode(code, cleanEmail);
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_SECONDS * 1000);

    await pool.query(
      `INSERT INTO password_reset_codes (email, code_hash, expires_at, attempts, created_at)
       VALUES ($1, $2, $3, 0, NOW())
       ON CONFLICT (email)
       DO UPDATE SET code_hash = EXCLUDED.code_hash,
                     expires_at = EXCLUDED.expires_at,
                     attempts = 0,
                     created_at = NOW()`,
      [cleanEmail, codeHash, expiresAt]
    );

    // 4. Dispatch 6-digit verification code to the user's email address via SMTP (nodemailer)
    const mailResult = await sendPasswordResetEmail(
      cleanEmail,
      userRes.rows[0].username,
      code,
      request.nextUrl.origin
    );

    if (!mailResult.sent) {
      // Remove stored code if delivery failed so stale codes aren't left behind
      await pool.query('DELETE FROM password_reset_codes WHERE email = $1', [cleanEmail]).catch(() => {});
      return NextResponse.json(
        {
          success: false,
          code: mailResult.missingConfig ? 'SMTP_NOT_CONFIGURED' : 'EMAIL_SEND_FAILED',
          error:
            mailResult.error ||
            'Failed to send verification code email. Please check server SMTP configuration.',
        },
        { status: mailResult.missingConfig ? 503 : 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: mailResult.isTestTransport
          ? 'SMTP test email created (configure SMTP_USER & SMTP_PASS in .env.local for direct Gmail delivery).'
          : 'A 6-digit verification code has been sent to your email address (valid for 5 minutes).',
        expiresInSeconds: RESET_CODE_TTL_SECONDS,
        ...(mailResult.previewUrl ? { previewUrl: mailResult.previewUrl } : {}),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[API /api/forgot-password/request error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
