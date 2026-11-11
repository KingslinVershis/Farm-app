import crypto from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import {
  AUTH_COOKIE_NAME,
  LEGACY_AUTH_COOKIE_NAME,
  AuthUserPayload,
  SESSION_MAX_AGE_SECONDS,
  verifyAuthToken,
} from '@/lib/auth';

let tablesEnsured = false;

async function ensureAuthTables() {
  if (tablesEnsured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        jti TEXT PRIMARY KEY,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_session_invalidations (
        user_id TEXT PRIMARY KEY,
        invalidated_at TIMESTAMPTZ NOT NULL
      )
    `);
    tablesEnsured = true;
  } catch (err) {
    console.warn('[ServerAuth] Could not ensure auth tables:', err);
  }
}

export function clearAuthCookies(response: NextResponse): void {
  const expiredOpts = {
    value: '',
    httpOnly: false,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    sameSite: 'lax' as const,
  };
  response.cookies.set({ name: AUTH_COOKIE_NAME, ...expiredOpts });
  response.cookies.set({ name: LEGACY_AUTH_COOKIE_NAME, ...expiredOpts });
}

function deriveTokenId(token: string, payload?: AuthUserPayload | null): string {
  if (payload?.jti) return String(payload.jti);
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function extractRequestToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get(AUTH_COOKIE_NAME)?.value ||
    request.cookies.get(LEGACY_AUTH_COOKIE_NAME)?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  );
}

/**
 * Revokes the current session token at the server/database level so it cannot
 * be reused after logout even if replayed via headers or stored cookies.
 */
export async function revokeSessionToken(request: NextRequest): Promise<void> {
  const token = extractRequestToken(request);
  if (!token) return;

  try {
    await ensureAuthTables();
    const payload = await verifyAuthToken(token);
    const jti = deriveTokenId(token, payload);
    const expiresAt =
      payload?.exp && typeof payload.exp === 'number'
        ? new Date(payload.exp * 1000)
        : new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

    await pool.query(
      `INSERT INTO revoked_tokens (jti, expires_at)
       VALUES ($1, $2)
       ON CONFLICT (jti) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      [jti, expiresAt]
    );

    // Opportunistically prune expired revocation entries
    await pool.query(`DELETE FROM revoked_tokens WHERE expires_at < NOW()`).catch(() => {});
  } catch (err) {
    console.warn('[ServerAuth] Failed to revoke token:', err);
  }
}

/**
 * Invalidates ALL active sessions across all devices/browsers for a given userId
 * (used when password is changed/reset or when account is deleted).
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  try {
    await ensureAuthTables();
    await pool.query(
      `INSERT INTO user_session_invalidations (user_id, invalidated_at)
       VALUES ($1, NOW())
       ON CONFLICT (user_id) DO UPDATE SET invalidated_at = NOW()`,
      [String(userId)]
    );
  } catch (err) {
    console.warn('[ServerAuth] Failed to invalidate all sessions for user:', err);
  }
}

/**
 * Checks whether a token has been revoked in PostgreSQL or invalidated by a global user event.
 */
export async function isTokenInvalidated(token: string, payload: AuthUserPayload): Promise<boolean> {
  try {
    await ensureAuthTables();
    const jti = deriveTokenId(token, payload);
    const userId = String(payload.id);

    const [revokedRes, invRes, userRes] = await Promise.all([
      pool.query(
        `SELECT 1 FROM revoked_tokens WHERE jti = $1 AND expires_at > NOW() LIMIT 1`,
        [jti]
      ),
      pool.query(
        `SELECT invalidated_at FROM user_session_invalidations WHERE user_id = $1 LIMIT 1`,
        [userId]
      ),
      pool.query(
        `SELECT isactive FROM users_table WHERE id = $1 LIMIT 1`,
        [userId]
      ),
    ]);

    if (revokedRes.rows.length > 0) return true;

    // Account deleted or deactivated
    if (userRes.rows.length === 0 || userRes.rows[0].isactive === false) {
      return true;
    }

    if (invRes.rows.length > 0) {
      const invalidatedAtMs = new Date(invRes.rows[0].invalidated_at).getTime();
      const tokenIssuedMs =
        typeof payload.loginAt === 'number'
          ? payload.loginAt
          : typeof payload.iat === 'number'
          ? payload.iat * 1000
          : 0;
      if (tokenIssuedMs <= invalidatedAtMs) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Server-side authentication verification that enforces:
 * 1. Valid JWT signature & 24-hour session expiration
 * 2. Database revocation check (single logout + global password-change/delete invalidation)
 * 3. Account existence & active status check
 */
export async function getServerAuthenticatedUser(
  request: NextRequest
): Promise<AuthUserPayload | null> {
  const token = extractRequestToken(request);

  if (token) {
    const payload = await verifyAuthToken(token);
    if (!payload?.id) return null;

    const invalidated = await isTokenInvalidated(token, payload);
    if (invalidated) return null;

    return payload;
  }

  const headerUserId = request.headers.get('x-user-id');
  if (headerUserId) {
    return {
      id: headerUserId,
      email: request.headers.get('x-user-email') || '',
      role: request.headers.get('x-user-role') || 'Farmer',
    };
  }

  return null;
}

