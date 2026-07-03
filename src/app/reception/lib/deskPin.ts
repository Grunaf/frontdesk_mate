import { createHmac, timingSafeEqual } from 'crypto';

export const DESK_PIN_MIN_LENGTH = 6;

function readDeskPinSecret(): string | undefined {
  return (
    process.env.RECEPTION_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim() ||
    undefined
  );
}

export function hashDeskPin(tenantSlug: string, pin: string): string {
  const secret = readDeskPinSecret();
  if (!secret) {
    throw new Error('RECEPTION_SESSION_SECRET or ADMIN_SECRET is not configured');
  }

  const normalizedPin = pin.trim();
  return createHmac('sha256', secret).update(`${tenantSlug}:${normalizedPin}`).digest('hex');
}

export function verifyDeskPin(
  tenantSlug: string,
  pin: string,
  storedHash: string | undefined
): boolean {
  if (!storedHash?.trim()) return false;

  const expected = hashDeskPin(tenantSlug, pin);

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(storedHash.trim()));
  } catch {
    return false;
  }
}

export function isDeskPinConfigured(storedHash: string | undefined): boolean {
  return Boolean(storedHash?.trim());
}

export function isNewDeskPinValid(pin: string): boolean {
  const normalized = pin.trim();
  if (!normalized) return true;
  return normalized.length >= DESK_PIN_MIN_LENGTH;
}
