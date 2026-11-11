import { NextRequest, NextResponse } from "next/server";
import { pool } from '@/lib/db';
import bcrypt from "bcryptjs";
import { createAuthToken, AUTH_COOKIE_NAME, LEGACY_AUTH_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const errorResponse = NextResponse.json({ success: false, message: "Invalid username or password" }, { status: 400 });
    const { useremail, userpassword } = await request.json();
    const userQuery = await pool.query('SELECT * from users_table WHERE email=$1', [useremail]);
    if (userQuery.rows.length === 0) {
        return errorResponse;
    }
    const user = userQuery.rows[0];
    const isvalidPassword = await bcrypt.compare(userpassword, user.password);
    if (!isvalidPassword)
        return errorResponse;
    const tokenPayload = {
        id: user.id,
        isActive: user.isactive,
        role: user.role || 'Farmer',
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        loginAt: Date.now(),
    };
    const token = await createAuthToken(tokenPayload, '24h');
    const userSafe = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'Farmer',
    };
    const response = NextResponse.json({
        success: true,
        token,
        user: userSafe,
        message: "User logged in successfully"
    }, { status: 200 });

    const cookieOptions = {
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
        sameSite: 'lax' as const,
        httpOnly: false,
    };

    response.cookies.set(AUTH_COOKIE_NAME, token, cookieOptions);
    response.cookies.set(LEGACY_AUTH_COOKIE_NAME, token, cookieOptions);

    return response;
}
