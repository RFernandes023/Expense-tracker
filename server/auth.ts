import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { env } from './env.js';

const secret = () => new TextEncoder().encode(env('JWT_SECRET'));

/** Sessão da app: JWT HS256 válido 30 dias. */
export async function signSession(userId: string, email: string): Promise<string> {
  return new SignJWT({ email }).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuedAt().setExpirationTime('30d').sign(secret());
}

export async function verifySession(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    return payload.sub ? { userId: payload.sub, email: String(payload.email ?? '') } : null;
  } catch {
    return null;
  }
}

export type Platform = 'web' | 'android';

/** Parâmetro "state" do OAuth assinado (protege contra CSRF e guarda a plataforma). */
export function signState(platform: Platform, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ p: platform, t: now, n: randomBytes(8).toString('hex') })).toString('base64url');
  const sig = createHmac('sha256', env('JWT_SECRET')).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyState(state: string, now = Date.now()): Platform | null {
  const [body, sig] = String(state).split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', env('JWT_SECRET')).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { p, t } = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (now - t > 10 * 60 * 1000) return null; // 10 minutos
    return p === 'android' ? 'android' : 'web';
  } catch {
    return null;
  }
}

export const randomCode = () => randomBytes(24).toString('base64url');

/** Lê o payload de um id_token recebido diretamente do endpoint de tokens da Google (via TLS). */
export function decodeIdToken(idToken: string): { sub: string; email: string; email_verified?: boolean; name?: string; picture?: string; aud?: string } {
  const part = idToken.split('.')[1];
  return JSON.parse(Buffer.from(part, 'base64url').toString());
}

export const ANDROID_SCHEME = 'pt.carteira.app';
