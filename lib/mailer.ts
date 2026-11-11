import nodemailer, { type Transporter } from 'nodemailer';
import type { OtpPurpose } from '@/lib/otpStore';

export interface SendOtpEmailResult {
  sent: boolean;
  messageId?: string;
  previewUrl?: string;
  isTestTransport?: boolean;
  error?: string;
  missingConfig?: boolean;
}

export interface SendOtpEmailParams {
  toEmail: string;
  username?: string | null;
  code: string;
  purpose: OtpPurpose;
  appOrigin?: string;
}

const PURPOSE_COPY: Record<
  OtpPurpose,
  {
    badge: string;
    heading: string;
    subheading: string;
    subjectPrefix: string;
    bodyText: (email: string) => string;
    ignoreText: string;
  }
> = {
  'forgot-password': {
    badge: 'ACCOUNT RECOVERY',
    heading: 'Reset Your Password',
    subheading: 'One-Time Security Verification',
    subjectPrefix: 'FarmHub Password Reset Code',
    bodyText: (email) =>
      `We received a request to reset the password for your FarmHub account (<strong style="color:#34d399;">${email}</strong>). Enter this 6-digit verification code to continue:`,
    ignoreText:
      'If you did not request a password reset, you can safely ignore this email. Your password remains unchanged.',
  },
  signup: {
    badge: 'EMAIL VERIFICATION',
    heading: 'Welcome to FarmHub',
    subheading: 'Activate Your Farmer Account',
    subjectPrefix: 'FarmHub Sign-Up Verification Code',
    bodyText: (email) =>
      `Thanks for registering <strong style="color:#34d399;">${email}</strong> on FarmHub. Enter the 6-digit code below to verify your email address and complete account creation:`,
    ignoreText:
      'If you did not try to create a FarmHub account, no action is needed and you can safely ignore this email.',
  },
  'change-password': {
    badge: 'SECURITY CONFIRMATION',
    heading: 'Confirm Password Change',
    subheading: 'Account Settings Verification',
    subjectPrefix: 'FarmHub Password Change Code',
    bodyText: (email) =>
      `A password update was requested for your FarmHub account (<strong style="color:#34d399;">${email}</strong>). Enter this 6-digit verification code in the confirmation popup to apply your new password:`,
    ignoreText:
      'If you did not initiate this password change, please review your account security immediately.',
  },
};

/**
 * Sends a styled 6-digit OTP verification email via authenticated SMTP (nodemailer).
 * Supports 'forgot-password', 'signup', and 'change-password' flows.
 */
export async function sendVerificationOtpEmail({
  toEmail,
  username,
  code,
  purpose,
  appOrigin,
}: SendOtpEmailParams): Promise<SendOtpEmailResult> {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    process.env.GMAIL_USER ||
    ''
  ).trim();
  const rawPass =
    process.env.SMTP_PASS ||
    process.env.EMAIL_PASS ||
    process.env.GMAIL_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    '';
  const pass = host.includes('gmail.com') ? rawPass.replace(/\s+/g, '') : rawPass.trim();
  const from = (process.env.SMTP_FROM || (user ? `FarmHub Support <${user}>` : '')).trim();

  const hasLiveCredentials = Boolean(user && pass);

  if (!hasLiveCredentials && process.env.NODE_ENV === 'production') {
    return {
      sent: false,
      missingConfig: true,
      error: 'SMTP email delivery requires SMTP_USER and SMTP_PASS in environment configuration.',
    };
  }

  try {
    let transporter: Transporter;
    let senderAddress = from;
    let isTestTransport = false;

    if (hasLiveCredentials) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      senderAddress = `FarmHub Support <${testAccount.user}>`;
      isTestTransport = true;
    }

    const copy = PURPOSE_COPY[purpose];
    const displayName = username?.trim() || 'Farmer';
    const baseOrigin = (appOrigin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
      /\/+$/,
      ''
    );
    const copyUrl = `${baseOrigin}/copy-otp?code=${encodeURIComponent(code)}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <body style="margin:0; padding:24px 12px; background-color:#f1f5f9; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px; margin:0 auto; background-color:#0b1220; border-radius:20px; overflow:hidden; border:1px solid #1e293b; box-shadow:0 20px 45px rgba(2,6,23,0.35);">
            <!-- Top Gradient Accent Strip -->
            <tr>
              <td style="height:5px; background:linear-gradient(90deg, #10b981, #14b8a6, #06b6d4); font-size:0; line-height:0;">&nbsp;</td>
            </tr>

            <!-- Header -->
            <tr>
              <td style="padding:26px 32px 20px; border-bottom:1px solid rgba(255,255,255,0.08); background:linear-gradient(135deg, rgba(16,185,129,0.16) 0%, rgba(6,182,212,0.08) 100%);">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td>
                      <span style="display:inline-block; padding:4px 10px; border-radius:999px; background-color:rgba(16,185,129,0.16); border:1px solid rgba(52,211,153,0.35); color:#34d399; font-size:10px; font-weight:800; letter-spacing:1.4px; text-transform:uppercase;">
                        ${copy.badge}
                      </span>
                      <h1 style="margin:10px 0 4px; font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.3px;">
                        ${copy.heading}
                      </h1>
                      <p style="margin:0; font-size:13px; color:#94a3b8; font-weight:500;">
                        FarmHub &bull; ${copy.subheading}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 12px; font-size:15px; color:#f8fafc;">
                  Hello <strong>${displayName}</strong>,
                </p>
                <p style="margin:0 0 22px; font-size:14px; line-height:1.65; color:#cbd5e1;">
                  ${copy.bodyText(toEmail)}
                </p>

                <!-- OTP Code Card -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#111c30; border:1px solid rgba(16,185,129,0.4); border-radius:16px; margin:0 0 20px;">
                  <tr>
                    <td style="padding:20px 20px 18px; text-align:center;">
                      <div style="font-size:10px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:#94a3b8; margin-bottom:10px;">
                        6-Digit Verification Code
                      </div>
                      <div style="margin:0 auto 14px;">
                        <span style="display:inline-block; font-family:'Courier New', Courier, monospace; font-size:34px; font-weight:900; letter-spacing:10px; padding-left:10px; color:#34d399; user-select:all; -webkit-user-select:all;">${code}</span>
                      </div>
                      <div>
                        <a
                          href="${copyUrl}"
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Copy verification code"
                          style="display:inline-block; padding:8px 16px; border-radius:10px; background-color:rgba(16,185,129,0.16); border:1px solid rgba(52,211,153,0.45); color:#6ee7b7; font-size:12px; font-weight:700; text-decoration:none; letter-spacing:0.2px;"
                        >
                          &#10064;&nbsp; Copy Code
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Expiry Warning Pill -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 18px;">
                  <tr>
                    <td style="padding:10px 14px; border-radius:10px; background-color:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); font-size:12px; color:#fcd34d; font-weight:600;">
                      &#9201;&nbsp; This verification code expires automatically in <strong>5 minutes</strong>.
                    </td>
                  </tr>
                </table>

                <p style="margin:0; font-size:12px; line-height:1.6; color:#94a3b8;">
                  ${copy.ignoreText}
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 32px; background-color:#070d18; border-top:1px solid rgba(255,255,255,0.06); text-align:center;">
                <p style="margin:0; font-size:11px; color:#64748b;">
                  &copy; ${new Date().getFullYear()} FarmHub Precision Farming Network. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const text = [
      `Hello ${displayName},`,
      '',
      `Your FarmHub verification code is: ${code}`,
      `Copy code link: ${copyUrl}`,
      '',
      'This code is valid for 5 minutes.',
      copy.ignoreText,
    ].join('\n');

    const info = await transporter.sendMail({
      from: senderAddress,
      to: toEmail,
      subject: `${copy.subjectPrefix}: ${code}`,
      text,
      html,
    });

    const previewUrl = isTestTransport ? nodemailer.getTestMessageUrl(info) || undefined : undefined;
    if (previewUrl) {
      console.info(`[Mailer] Ethereal test inbox preview for ${toEmail}: ${previewUrl}`);
    }

    return {
      sent: true,
      messageId: info.messageId,
      previewUrl,
      isTestTransport,
    };
  } catch (err: any) {
    console.error('[Mailer] Failed to send verification email:', err);
    const rawMsg = String(err?.message || '');
    const isAuthError = err?.code === 'EAUTH' || err?.responseCode === 535 || rawMsg.includes('535');
    return {
      sent: false,
      error: isAuthError
        ? 'SMTP authentication failed (535): Verify SMTP_USER and use a valid 16-character Google App Password (with 2-Step Verification enabled on that exact account) in .env.local.'
        : rawMsg || 'SMTP mail delivery failed.',
    };
  }
}

export async function sendPasswordResetEmail(
  toEmail: string,
  username: string | null | undefined,
  code: string,
  appOrigin?: string
): Promise<SendOtpEmailResult> {
  return sendVerificationOtpEmail({
    toEmail,
    username,
    code,
    purpose: 'forgot-password',
    appOrigin,
  });
}
