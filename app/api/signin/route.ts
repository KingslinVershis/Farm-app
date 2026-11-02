import { NextRequest, NextResponse } from "next/server";
import { pool } from '@/lib/db';
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {

    const errorResponse = NextResponse.json({ success: false, message: "Invalid username or password" }, { status: 400 });
    const { useremail, userpassword } = await request.json();
    const userQuery = await pool.query('SELECT * from users_table WHERE email=$1', [useremail])
    if (userQuery.rows.length === 0) {
        return errorResponse;
    }
    const user = userQuery.rows[0];
    const isvalidPassword = await bcrypt.compare(userpassword, user.password)
    if (!isvalidPassword)
        return errorResponse;
    const tokenPayload = {
        id: user.id,
        isActive: user.isactive,
        role: user.role,
        username: user.username,
        createdAt: user.created_at,
        updatedAt: user.updated_at
    }
    const secret = process.env.JWT_SECRET
    if (!secret)
        throw Error("Secret Key is not defined")
    const token = jwt.sign(tokenPayload, secret, {
        expiresIn: '1h'
    });
    return NextResponse.json({ success: true, token, message: "User logged in successfully" }, { status: 200 })
}   