import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'fdm_reception_session';
const SESSION_MAX_AGE_SEC = 60 * 60 * 12;

export const RECEPTION_SESSION_COOKIE_NAME = COOKIE_NAME;
export const RECEPTION_SESSION_MAX_AGE_SEC = SESSION_MAX_AGE_SEC;

export interface ReceptionSessionPayload {
  tenantSlug: string;
  exp: number;
}

function readReceptionSessionSecret(): string | undefined {
  return (
    process.env.RECEPTION_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim() ||
    undefined
  );
}

function signPayload(payload: ReceptionSessionPayload): string {
  const secret = readReceptionSessionSecret();
  if (!secret) {
    throw new Error('RECEPTION_SESSION_SECRET or ADMIN_SECRET is not configured');
  }

  const body = `${payload.tenantSlug}.${payload.exp}`;
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  return `${body}.${signature}`;
}

function parseSignedValue(token: string | undefined): ReceptionSessionPayload | null {
  const secret = readReceptionSessionSecret();
  if (!secret || !token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [tenantSlug, expRaw, signature] = parts;
  if (!tenantSlug || !expRaw || !signature) return null;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;

  const body = `${tenantSlug}.${exp}`;
  const expected = createHmac('sha256', secret).update(body).digest('hex');

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  return { tenantSlug, exp };
}

export async function isReceptionAuthenticated(expectedTenantSlug: string): Promise<boolean> {
  const session = await readReceptionSessionFromCookies();
  return session?.tenantSlug === expectedTenantSlug;
}

export async function assertReceptionAuthenticated(expectedTenantSlug: string): Promise<void> {
  if (!(await isReceptionAuthenticated(expectedTenantSlug))) {
    throw new Error('Unauthorized');
  }
}

export async function readReceptionSessionFromCookies(): Promise<ReceptionSessionPayload | null> {
  const cookieStore = await cookies();
  return parseSignedValue(cookieStore.get(COOKIE_NAME)?.value);
}

export function getReceptionSessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

export function buildReceptionSessionCookieValue(tenantSlug: string): string {
  const exp = Date.now() + SESSION_MAX_AGE_SEC * 1000;
  return signPayload({ tenantSlug, exp });
}

export async function setReceptionSession(tenantSlug: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, buildReceptionSessionCookieValue(tenantSlug), getReceptionSessionCookieOptions());
}

export async function clearReceptionSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: COOKIE_NAME, path: '/' });
}

export function isReceptionSessionSecretConfigured(): boolean {
  return Boolean(readReceptionSessionSecret());
}
