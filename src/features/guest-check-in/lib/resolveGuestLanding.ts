import type { GuestIntent } from './guestIntent';
import { guestIntentToEntry } from './guestIntent';
import {
  type GuestEntryParam,
  resolveGuestWelcomePath,
} from './resolveGuestWelcomePath';

export function shouldShowGuestIntentScreen(input: {
  urlEntry?: GuestEntryParam | null;
  modeOnsite?: boolean;
  storedIntent?: GuestIntent | null;
}): boolean {
  if (input.urlEntry) return false;
  if (input.modeOnsite) return false;
  if (input.storedIntent) return false;
  return true;
}

export function resolveEntryForLanding(input: {
  urlEntry?: GuestEntryParam | null;
  modeOnsite?: boolean;
  storedIntent?: GuestIntent | null;
}): GuestEntryParam | null {
  if (input.urlEntry) return input.urlEntry;
  if (input.storedIntent) return guestIntentToEntry(input.storedIntent);
  return null;
}

export function resolvePostCheckInPath(input: {
  locale: string;
  urlEntry?: GuestEntryParam | null;
  modeOnsite?: boolean;
  storedIntent?: GuestIntent | null;
}): string {
  if (shouldShowGuestIntentScreen(input)) {
    return `/${input.locale}/check-in/intent`;
  }

  return resolveGuestWelcomePath({
    locale: input.locale,
    entry: resolveEntryForLanding(input),
    modeOnsite: input.modeOnsite,
  });
}
