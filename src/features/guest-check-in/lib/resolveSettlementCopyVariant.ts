import type { GuestIntent } from './guestIntent';

export type SettlementCopyVariant = 'planning' | 'atDoor' | 'atDesk';

export function resolveSettlementCopyVariant(intent: GuestIntent | null): SettlementCopyVariant {
  if (intent === 'at_desk') return 'atDesk';
  if (intent === 'at_door') return 'atDoor';
  return 'planning';
}
