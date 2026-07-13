import { createHmac, timingSafeEqual } from 'crypto';

export const RECEPTION_USER_PIN_MIN_LENGTH = 6;

function readReceptionUserPinSecret(): string | undefined {
  return (
    process.env.RECEPTION_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SECRET?.trim() ||
    undefined
  );
}

export function isReceptionUserPinValid(pin: string): boolean {
  return pin.trim().length >= RECEPTION_USER_PIN_MIN_LENGTH;
}

export function hashReceptionUserPin(tenantSlug: string, userId: string, pin: string): string {
  const secret = readReceptionUserPinSecret();
  if (!secret) {
    throw new Error('RECEPTION_SESSION_SECRET or ADMIN_SECRET is not configured');
  }

  const normalizedPin = pin.trim();
  return createHmac('sha256', secret)
    .update(`${tenantSlug}:${userId}:${normalizedPin}`)
    .digest('hex');
}

export function verifyReceptionUserPin(
  tenantSlug: string,
  userId: string,
  pin: string,
  storedHash: string | undefined
): boolean {
  if (!storedHash?.trim()) return false;

  const expected = hashReceptionUserPin(tenantSlug, userId, pin);

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(storedHash.trim()));
  } catch {
    return false;
  }
}
