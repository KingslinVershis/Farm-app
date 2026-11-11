import crypto from 'crypto';
import { pool } from '@/lib/db';

export const RESET_CODE_TTL_SECONDS = 5 * 60; // 5 minutes
export const RESET_MAX_ATTEMPTS = 5;

export async function ensurePasswordResetTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export function hashResetCode(code: string, email: string): string {
  return crypto
    .createHash('sha256')
    .update(`${code.trim()}:${email.trim().toLowerCase()}`)
    .digest('hex');
}

