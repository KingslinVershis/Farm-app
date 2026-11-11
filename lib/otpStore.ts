import crypto from 'crypto';
import { pool } from '@/lib/db';

export type OtpPurpose = 'forgot-password' | 'signup' | 'change-password';

export const OTP_TTL_SECONDS = 5 * 60; // 5 minutes
export const OTP_MAX_ATTEMPTS = 5;

let otpTableEnsured = false;

export async function ensureOtpTable() {
  if (otpTableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_otp_codes (
      email TEXT NOT NULL,
      purpose TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (email, purpose)
    )
  `);
  otpTableEnsured = true;
}

export function hashOtp(code: string, email: string, purpose: OtpPurpose): string {
  return crypto
    .createHash('sha256')
    .update(`${code.trim()}:${email.trim().toLowerCase()}:${purpose}`)
    .digest('hex');
}

export async function issueOtpCode(email: string, purpose: OtpPurpose): Promise<{
  code: string;
  ttlSeconds: number;
}> {
  const cleanEmail = email.trim().toLowerCase();
  await ensureOtpTable();
  await pool.query('DELETE FROM email_otp_codes WHERE expires_at < NOW()').catch(() => {});

  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = hashOtp(code, cleanEmail, purpose);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await pool.query(
    `INSERT INTO email_otp_codes (email, purpose, code_hash, expires_at, attempts, created_at)
     VALUES ($1, $2, $3, $4, 0, NOW())
     ON CONFLICT (email, purpose)
     DO UPDATE SET code_hash = EXCLUDED.code_hash,
                   expires_at = EXCLUDED.expires_at,
                   attempts = 0,
                   created_at = NOW()`,
    [cleanEmail, purpose, codeHash, expiresAt]
  );

  return { code, ttlSeconds: OTP_TTL_SECONDS };
}

export async function deleteOtpCode(email: string, purpose: OtpPurpose): Promise<void> {
  try {
    await ensureOtpTable();
    await pool.query('DELETE FROM email_otp_codes WHERE email = $1 AND purpose = $2', [
      email.trim().toLowerCase(),
      purpose,
    ]);
  } catch {
    // Ignore cleanup errors
  }
}

export async function verifyOtpCode(params: {
  email: string;
  purpose: OtpPurpose;
  code: string;
  consume?: boolean;
}): Promise<{ valid: boolean; status?: number; error?: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const code = params.code.trim();

  if (!/^\d{6}$/.test(code)) {
    return {
      valid: false,
      status: 400,
      error: 'Please enter a valid 6-digit verification code.',
    };
  }

  await ensureOtpTable();

  const res = await pool.query(
    'SELECT code_hash, expires_at, attempts FROM email_otp_codes WHERE email = $1 AND purpose = $2 LIMIT 1',
    [cleanEmail, params.purpose]
  );

  if (res.rows.length === 0) {
    return {
      valid: false,
      status: 400,
      error: 'No active verification code found. Please request a new code.',
    };
  }

  const record = res.rows[0];

  if (new Date(record.expires_at).getTime() <= Date.now()) {
    await deleteOtpCode(cleanEmail, params.purpose);
    return {
      valid: false,
      status: 400,
      error: 'Verification code has expired (5-minute limit). Please request a new code.',
    };
  }

  if (Number(record.attempts) >= OTP_MAX_ATTEMPTS) {
    await deleteOtpCode(cleanEmail, params.purpose);
    return {
      valid: false,
      status: 429,
      error: 'Too many invalid attempts. Please request a new verification code.',
    };
  }

  const submittedHash = hashOtp(code, cleanEmail, params.purpose);
  if (submittedHash !== record.code_hash) {
    await pool.query(
      'UPDATE email_otp_codes SET attempts = attempts + 1 WHERE email = $1 AND purpose = $2',
      [cleanEmail, params.purpose]
    );
    return {
      valid: false,
      status: 400,
      error: 'Invalid 6-digit verification code. Please check and try again.',
    };
  }

  if (params.consume) {
    await deleteOtpCode(cleanEmail, params.purpose);
  }

  return { valid: true };
}

