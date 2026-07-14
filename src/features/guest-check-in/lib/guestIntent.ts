import type { GuestEntryParam } from './resolveGuestWelcomePath';

export type GuestIntent = 'planning' | 'at_door' | 'at_desk';

const STORAGE_KEY = 'fdm_guest_intent_v1';

interface StoredGuestIntent {
  tenantSlug: string;
  intent: GuestIntent;
}

export function guestIntentToEntry(intent: GuestIntent): GuestEntryParam {
  if (intent === 'at_door') return 'door';
  if (intent === 'at_desk') return 'desk';
  return 'remote';
}

export function guestEntryToIntent(entry: GuestEntryParam): GuestIntent {
  if (entry === 'door') return 'at_door';
  if (entry === 'desk') return 'at_desk';
  return 'planning';
}

function readAllGuestIntents(): StoredGuestIntent[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredGuestIntent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAllGuestIntents(entries: StoredGuestIntent[]): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function readGuestIntent(tenantSlug: string): GuestIntent | null {
  const entry = readAllGuestIntents().find((item) => item.tenantSlug === tenantSlug);
  return entry?.intent ?? null;
}

export function writeGuestIntent(tenantSlug: string, intent: GuestIntent): void {
  const entries = readAllGuestIntents().filter((item) => item.tenantSlug !== tenantSlug);
  entries.push({ tenantSlug, intent });
  writeAllGuestIntents(entries);
}

export function clearGuestIntent(tenantSlug?: string): void {
  if (!tenantSlug) {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
    return;
  }

  writeAllGuestIntents(readAllGuestIntents().filter((item) => item.tenantSlug !== tenantSlug));
}
