import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'fdm_dev_panel_session';
const SESSION_MAX_AGE_SEC = 60 * 60 * 24;

function readDevPanelSecret(): string | undefined {
  return (
    process.env.DEV_PANEL_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim() ||
    undefined
  );
}

function signSessionValue(): string {
  const secret = readDevPanelSecret();
  if (!secret) {
    throw new Error('DEV_PANEL_SECRET or ADMIN_SECRET is not configured');
  }

  const issuedAt = Date.now().toString();
  const signature = createHmac('sha256', secret).update(issuedAt).digest('hex');
  return `${issuedAt}.${signature}`;
}

function verifySessionValue(token: string | undefined): boolean {
  const secret = readDevPanelSecret();
  if (!secret || !token) return false;

  const [issuedAt, signature] = token.split('.');
  if (!issuedAt || !signature) return false;

  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > SESSION_MAX_AGE_SEC * 1000) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(issuedAt).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function isDevPanelAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifySessionValue(cookieStore.get(COOKIE_NAME)?.value);
}

export async function setDevPanelSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, signSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/dev-panel',
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearDevPanelSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: COOKIE_NAME, path: '/dev-panel' });
}

export function isDevPanelSecretConfigured(): boolean {
  return Boolean(readDevPanelSecret());
}
