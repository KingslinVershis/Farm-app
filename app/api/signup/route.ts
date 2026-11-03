import { NextRequest, NextResponse } from "next/server";
import { pool } from '@/lib/db';
import bcrypt from "bcryptjs";
import { validateUserEmail } from "@/lib/emailValidator";

export async function POST(request: NextRequest) {
    try {
        const res = await request.json();
        const { username, email, password } = res;
        if (!username || !email || !password) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Run deep validation (Syntax + MX Records + Disposable + Typo + SMTP Handshake)
        const validationResult = await validateUserEmail(email);

        if (!validationResult.valid) {
            return NextResponse.json({
                success: false,
                error: validationResult.error || 'Invalid email address',
                reason: validationResult.reason
            }, { status: 400 });
        }

        const hashPassword = await bcrypt.hash(password, 12);
        await pool.query(`INSERT INTO users_table (username,email,password)
            VALUES ($1,$2,$3) RETURNING id, username, email, role, created_at`, [username.trim(), email.trim().toLowerCase(), hashPassword]);
            
        return NextResponse.json({ success: true, message: 'User created successfully' }, { status: 201 });
    }
    catch (err: any) {
        if (err?.code === '23505') {
            return NextResponse.json({ success: false, error: 'An account with this email address already exists' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: err?.message || 'Invalid JSON body' }, { status: 400 });
    }
}
