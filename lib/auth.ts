import jwt from 'jsonwebtoken';

export const AUTH_COOKIE_NAME = 'agripulse_token';

export const getSecretKey = () => {
  return (process.env.JWT_SECRET || 'agripulse-super-secret-key-2026');
};

export interface AuthUserPayload {
  id: string | number;
  username?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

/**
 * Creates a signed JWT token using jsonwebtoken
 */
export async function createAuthToken(payload: AuthUserPayload, expiresIn: string | number = '7d'): Promise<string> {
  return jwt.sign(payload, getSecretKey(), { expiresIn: expiresIn as any });
}

/**
 * Verifies an HS256 JWT token using standard Web Crypto API (Edge & Node compatible)
 * without requiring external dependencies in Edge middleware.
 */
export async function verifyAuthToken(token: string): Promise<AuthUserPayload | null> {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Helper: decode base64url string to Uint8Array
    const toUint8Array = (b64url: string): Uint8Array => {
      let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    };

    const keyData = new TextEncoder().encode(getSecretKey());
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = toUint8Array(signatureB64);
    const isValid = await crypto.subtle.verify('HMAC', cryptoKey, signature as any, data as any);
    if (!isValid) return null;

    const payloadJson = new TextDecoder().decode(toUint8Array(payloadB64));
    const payload = JSON.parse(payloadJson) as AuthUserPayload;

    // Check expiration
    if (payload.exp && typeof payload.exp === 'number' && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

