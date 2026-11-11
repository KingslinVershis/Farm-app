import { NextRequest, NextResponse } from "next/server";
import { pool } from '@/lib/db';
import bcrypt from "bcryptjs";
import { validateUserEmail } from "@/lib/emailValidator";
import { issueOtpCode, verifyOtpCode, deleteOtpCode } from "@/lib/otpStore";
import { sendVerificationOtpEmail } from "@/lib/mailer";

export async function POST(request: NextRequest) {
    try {
        const res = await request.json();
        const { username, email, password, otp } = res;
        if (!username || !email || !password) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const cleanUsername = String(username).trim();

        if (String(password).length < 6) {
            return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long' }, { status: 400 });
        }

        // Ensure email is not already registered before sending OTP or creating account
        const existingUser = await pool.query(
            'SELECT id FROM users_table WHERE LOWER(email) = $1 LIMIT 1',
            [cleanEmail]
        );
        if (existingUser.rows.length > 0) {
            return NextResponse.json(
                { success: false, error: 'An account with this email address already exists' },
                { status: 400 }
            );
        }

        // Step 1: Validate email via MX/SMTP check & send 6-digit OTP email
        if (!otp) {
            const validationResult = await validateUserEmail(cleanEmail);

            if (!validationResult.valid) {
                return NextResponse.json({
                    success: false,
                    error: validationResult.error || 'Invalid email address',
                    reason: validationResult.reason
                }, { status: 400 });
            }

            const { code, ttlSeconds } = await issueOtpCode(cleanEmail, 'signup');
            const mailResult = await sendVerificationOtpEmail({
                toEmail: cleanEmail,
                username: cleanUsername,
                code,
                purpose: 'signup',
                appOrigin: request.nextUrl.origin,
            });

            if (!mailResult.sent) {
                await deleteOtpCode(cleanEmail, 'signup');
                return NextResponse.json({
                    success: false,
                    error: mailResult.error || 'Failed to send verification code email.'
                }, { status: mailResult.missingConfig ? 503 : 500 });
            }

            return NextResponse.json({
                success: true,
                otpRequired: true,
                message: 'A 6-digit verification code has been sent to your email address.',
                expiresInSeconds: ttlSeconds,
                ...(mailResult.previewUrl ? { previewUrl: mailResult.previewUrl } : {}),
            }, { status: 200 });
        }

        // Step 2: Verify 6-digit OTP and create account
        const otpCheck = await verifyOtpCode({
            email: cleanEmail,
            purpose: 'signup',
            code: String(otp),
            consume: true,
        });

        if (!otpCheck.valid) {
            return NextResponse.json(
                { success: false, error: otpCheck.error || 'Invalid verification code' },
                { status: otpCheck.status || 400 }
            );
        }

        const hashPassword = await bcrypt.hash(password, 12);
        await pool.query(`INSERT INTO users_table (username,email,password)
            VALUES ($1,$2,$3) RETURNING id, username, email, role, created_at`, [cleanUsername, cleanEmail, hashPassword]);
            
        return NextResponse.json({ success: true, message: 'User created successfully' }, { status: 201 });
    }
    catch (err: any) {
        if (err?.code === '23505') {
            return NextResponse.json({ success: false, error: 'An account with this email address already exists' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: err?.message || 'Invalid JSON body' }, { status: 400 });
    }
}
