import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { createAuthToken, AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth';
import { getServerAuthenticatedUser } from '@/lib/serverAuth';

/**
 * POST /api/user/profile or PATCH /api/user/profile
 * Updates user profile details in users_table (username, state, district, city, address, phone_nun).
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getServerAuthenticatedUser(request);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const userId = String(authUser.id);
    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let idx = 1;

    // 1. Username
    if (body.username !== undefined) {
      const newUsername = String(body.username).trim();
      if (newUsername.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Username must be at least 2 characters long' },
          { status: 400 }
        );
      }
      if (newUsername.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Username must not exceed 100 characters' },
          { status: 400 }
        );
      }
      updates.push(`username = $${idx++}`);
      values.push(newUsername);
    }

    // 2. State (varchar 20)
    if (body.state !== undefined) {
      const stateVal = body.state ? String(body.state).trim().slice(0, 20) : null;
      updates.push(`state = $${idx++}`);
      values.push(stateVal);
    }

    // 3. District (varchar 20)
    if (body.district !== undefined) {
      const districtVal = body.district ? String(body.district).trim().slice(0, 20) : null;
      updates.push(`district = $${idx++}`);
      values.push(districtVal);
    }

    // 4. City (varchar 20)
    if (body.city !== undefined) {
      const cityVal = body.city ? String(body.city).trim().slice(0, 20) : null;
      updates.push(`city = $${idx++}`);
      values.push(cityVal);
    }

    // 5. Address (varchar 40)
    if (body.address !== undefined) {
      const addressVal = body.address ? String(body.address).trim().slice(0, 40) : null;
      updates.push(`address = $${idx++}`);
      values.push(addressVal);
    }

    // 6. Phone number / phone_nun (varchar 10)
    const phoneInput = body.phone_nun !== undefined ? body.phone_nun : body.phone_number;
    if (phoneInput !== undefined) {
      const cleanPhone = phoneInput ? String(phoneInput).replace(/\D/g, '').slice(0, 10) : null;
      updates.push(`phone_nun = $${idx++}`);
      values.push(cleanPhone);
      updates.push(`phone_number = $${idx++}`);
      values.push(cleanPhone);
    }

    // 7. Avatar URL
    if (body.avatar_url !== undefined) {
      const avatarVal = body.avatar_url ? String(body.avatar_url).trim() : null;
      updates.push(`avatar_url = $${idx++}`);
      values.push(avatarVal);
    }

    if (values.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields provided to update' },
        { status: 400 }
      );
    }

    values.push(userId);
    const query = `
      UPDATE users_table
      SET ${updates.join(', ')}
      WHERE id = $${idx}
      RETURNING id, username, email, role, isactive, theme, language, created_at, updated_at,
                state, district, city, address, avatar_url,
                COALESCE(phone_nun, phone_number) as phone_nun,
                COALESCE(phone_nun, phone_number) as phone_number
    `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const updated = result.rows[0];

    // Refresh JWT token with updated profile while strictly preserving the original 24h login deadline
    const loginAt = typeof authUser.loginAt === 'number'
      ? authUser.loginAt
      : typeof authUser.iat === 'number'
      ? authUser.iat * 1000
      : Date.now();
    const elapsedSec = Math.floor((Date.now() - loginAt) / 1000);
    const remainingSec = Math.max(60, SESSION_MAX_AGE_SECONDS - elapsedSec);

    const tokenPayload = {
      id: updated.id,
      jti: authUser.jti,
      loginAt,
      isActive: updated.isactive,
      role: updated.role || 'Farmer',
      username: updated.username,
      email: updated.email,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };

    const token = await createAuthToken(tokenPayload, remainingSec);

    const response = NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        role: updated.role || 'Farmer',
        theme: updated.theme || 'dark',
        language: updated.language || 'en',
        state: updated.state || '',
        district: updated.district || '',
        city: updated.city || '',
        address: updated.address || '',
        phone_nun: updated.phone_nun || '',
        phone_number: updated.phone_nun || '',
      },
    });

    const cookieOptions = {
      path: '/',
      maxAge: remainingSec,
      sameSite: 'lax' as const,
      httpOnly: false,
    };

    response.cookies.set(AUTH_COOKIE_NAME, token, cookieOptions);
    response.cookies.set(LEGACY_AUTH_COOKIE_NAME, token, cookieOptions);

    return response;
  } catch (err: any) {
    console.error('[API /api/user/profile error]:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  return POST(request);
}
