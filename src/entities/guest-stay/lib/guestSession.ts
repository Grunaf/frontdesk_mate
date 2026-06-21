import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { GuestSessionPayload } from '../model/types';

export const GUEST_SESSION_COOKIE = 'fdm_guest_session';

function readGuestSessionSecret(): string | undefined {
  return (
    process.env.GUEST_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim() ||
    undefined
  );
}

function signPayload(payload: GuestSessionPayload): string {
  const secret = readGuestSessionSecret();
  if (!secret) {
    throw new Error('GUEST_SESSION_SECRET or ADMIN_SECRET is not configured');
  }

  const body = `${payload.stayId}.${payload.tenantSlug}.${payload.bedId}.${payload.exp}`;
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  return `${body}.${signature}`;
}

function parseSignedValue(token: string): GuestSessionPayload | null {
  const secret = readGuestSessionSecret();
  if (!secret) return null;

  const parts = token.split('.');
  if (parts.length !== 5) return null;

  const [stayId, tenantSlug, bedId, expRaw, signature] = parts;
  if (!stayId || !tenantSlug || !bedId || !expRaw || !signature) return null;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp)) return null;

  const body = `${stayId}.${tenantSlug}.${bedId}.${exp}`;
  const expected = createHmac('sha256', secret).update(body).digest('hex');

  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  if (Date.now() > exp) {
    return null;
  }

  return { stayId, tenantSlug, bedId, exp };
}

export function buildGuestSessionPayload(input: {
  stayId: string;
  tenantSlug: string;
  bedId: string;
  checkOutAt: string;
}): GuestSessionPayload {
  const checkoutMs = new Date(input.checkOutAt).getTime();
  const graceMs = 24 * 60 * 60 * 1000;
  const exp = Number.isFinite(checkoutMs) ? checkoutMs + graceMs : Date.now() + graceMs;

  return {
    stayId: input.stayId,
    tenantSlug: input.tenantSlug,
    bedId: input.bedId,
    exp,
  };
}

export async function readGuestSessionFromCookies(): Promise<GuestSessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return parseSignedValue(raw);
}

export async function setGuestSessionCookie(payload: GuestSessionPayload): Promise<void> {
  const cookieStore = await cookies();
  const maxAgeSec = Math.max(60, Math.floor((payload.exp - Date.now()) / 1000));

  cookieStore.set(GUEST_SESSION_COOKIE, signPayload(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSec,
  });
}

export async function clearGuestSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: GUEST_SESSION_COOKIE, path: '/' });
}

export function verifyGuestSessionValue(token: string): GuestSessionPayload | null {
  return parseSignedValue(token);
}
