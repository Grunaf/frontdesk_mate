import {
  isReceptionLoginValid,
  normalizeReceptionLogin,
} from '@/entities/reception-user';
import { RECEPTION_USER_PIN_MIN_LENGTH } from '@/entities/reception-user';

const LOGIN_BASE_MAX = 48;

/** Slugify display name into a reception login base (a-z0-9._-). */
export function buildVolunteerStaffLoginBase(displayName: string): string {
  const ascii = displayName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const slug = ascii
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, LOGIN_BASE_MAX);
  const candidate = slug || 'volunteer';
  return isReceptionLoginValid(candidate) ? normalizeReceptionLogin(candidate) : 'volunteer';
}

export function buildVolunteerStaffLoginCandidate(base: string, attempt: number): string {
  if (attempt <= 1) return base;
  const suffix = String(attempt);
  const trimmed = base.slice(0, Math.max(1, LOGIN_BASE_MAX - suffix.length));
  return normalizeReceptionLogin(`${trimmed}${suffix}`);
}

/** Numeric PIN meeting reception staff minimum length. */
export function generateVolunteerStaffPin(length = RECEPTION_USER_PIN_MIN_LENGTH): string {
  const size = Math.max(length, RECEPTION_USER_PIN_MIN_LENGTH);
  const digits: string[] = [];
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  for (const byte of bytes) {
    digits.push(String(byte % 10));
  }
  return digits.join('');
}

export function formatVolunteerStaffLoginInstructions(input: {
  receptionLoginUrl: string;
  login: string;
  pin: string;
}): string {
  return [
    'Reception desk access',
    `URL: ${input.receptionLoginUrl}`,
    `Login: ${input.login}`,
    `PIN: ${input.pin}`,
  ].join('\n');
}
