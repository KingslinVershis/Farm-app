import { NextRequest, NextResponse } from "next/server";
import { pool } from '@/lib/db';
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
    try {
        const res = await request.json();
        const { username, email, password } = res;
        if (!username || !email || !password) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }
        const hashPassword = await bcrypt.hash(password, 12);
        await pool.query(`INSERT INTO users_table (username,email,password)
            VALUES ($1,$2,$3) RETURNING id, username, email, role, created_at`, [username, email, hashPassword])
        return NextResponse.json({ success: true, message: 'User created successfully' }, { status: 201 });
    }
    catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message || 'Invalid JSON body' }, { status: 400 });
    }
}
