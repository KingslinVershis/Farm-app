import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  getServerAuthenticatedUser as getAuthenticatedUser,
  invalidateAllUserSessions,
  clearAuthCookies,
} from '@/lib/serverAuth';
import bcrypt from 'bcryptjs';
import { issueOtpCode, verifyOtpCode, deleteOtpCode } from '@/lib/otpStore';
import { sendVerificationOtpEmail } from '@/lib/mailer';

/**
 * POST /api/user/password
 * Step 1 (no otp): Validates current password & sends a 6-digit OTP via SMTP to user's email.
 * Step 2 (with otp): Verifies 6-digit OTP & updates password in users_table.
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
    const { currentPassword, newPassword, otp } = body || {};

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
      'SELECT username, email, password FROM users_table WHERE id = $1',
      [userId]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User account not found' },
        { status: 404 }
      );
    }

    const userRow = userRes.rows[0];
    const storedHash = userRow.password;
    const isMatch = await bcrypt.compare(currentPassword, storedHash);

    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    const userEmail = String(userRow.email || authUser.email || '').trim().toLowerCase();
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'No registered email address found for OTP verification.' },
        { status: 400 }
      );
    }

    // Step 1: Send 6-digit OTP to the user's registered email
    if (!otp) {
      const { code, ttlSeconds } = await issueOtpCode(userEmail, 'change-password');
      const mailResult = await sendVerificationOtpEmail({
        toEmail: userEmail,
        username: userRow.username,
        code,
        purpose: 'change-password',
        appOrigin: request.nextUrl.origin,
      });

      if (!mailResult.sent) {
        await deleteOtpCode(userEmail, 'change-password');
        return NextResponse.json(
          {
            success: false,
            error: mailResult.error || 'Failed to send verification code email.',
          },
          { status: mailResult.missingConfig ? 503 : 500 }
        );
      }

      return NextResponse.json({
        success: true,
        otpRequired: true,
        email: userEmail,
        expiresInSeconds: ttlSeconds,
        message: 'A 6-digit verification code has been sent to your registered email.',
        ...(mailResult.previewUrl ? { previewUrl: mailResult.previewUrl } : {}),
      });
    }

    // Step 2: Verify 6-digit OTP & commit new password
    const otpCheck = await verifyOtpCode({
      email: userEmail,
      purpose: 'change-password',
      code: String(otp),
      consume: true,
    });

    if (!otpCheck.valid) {
      return NextResponse.json(
        { success: false, error: otpCheck.error || 'Invalid verification code' },
        { status: otpCheck.status || 400 }
      );
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users_table SET password = $1, updated_at = NOW() WHERE id = $2',
      [newHashedPassword, userId]
    );

    // Invalidate all active sessions across all systems/devices for security
    await invalidateAllUserSessions(userId);

    const response = NextResponse.json({
      success: true,
      loggedOutAllSessions: true,
      message: 'Password updated! All active sessions have been logged out for security purposes.',
    });
    clearAuthCookies(response);
    return response;
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

