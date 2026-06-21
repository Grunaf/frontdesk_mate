import { createHmac, randomInt, timingSafeEqual } from 'crypto';

function readGuestPinSecret(): string | undefined {
  return (
    process.env.GUEST_SESSION_SECRET?.trim() ||
    process.env.RECEPTION_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim() ||
    undefined
  );
}

export function generateGuestPin(): string {
  return String(randomInt(100000, 1_000_000));
}

export function normalizeGuestPin(pin: string): string {
  return pin.replace(/\D/g, '').slice(0, 6);
}

export function isGuestPinFormatValid(pin: string): boolean {
  return /^\d{6}$/.test(normalizeGuestPin(pin));
}

export function hashGuestPin(tenantSlug: string, pin: string): string {
  const secret = readGuestPinSecret();
  if (!secret) {
    throw new Error('GUEST_SESSION_SECRET, RECEPTION_SESSION_SECRET, or ADMIN_SECRET is not configured');
  }

  const normalizedPin = normalizeGuestPin(pin);
  return createHmac('sha256', secret).update(`guest-pin:${tenantSlug}:${normalizedPin}`).digest('hex');
}

export function verifyGuestPin(
  tenantSlug: string,
  pin: string,
  storedHash: string | undefined
): boolean {
  if (!storedHash?.trim()) return false;

  const expected = hashGuestPin(tenantSlug, pin);

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(storedHash.trim()));
  } catch {
    return false;
  }
}
