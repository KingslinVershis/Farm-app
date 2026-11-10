import { NextRequest, NextResponse } from "next/server";
import { pool } from '@/lib/db';
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';

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
        updatedAt: user.updated_at
    };
    const secret = (process.env.JWT_SECRET || 'farmhub-super-secret-key-2026').trim();
    if (!secret)
        throw Error("Secret Key is not defined");
    const token = jwt.sign(tokenPayload, secret, {
        expiresIn: '7d'
    });
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
        maxAge: 604800,
        sameSite: 'lax' as const,
        httpOnly: false,
    };

    response.cookies.set('farmhub_token', token, cookieOptions);
    response.cookies.set('agripulse_token', token, cookieOptions);

    return response;
}
