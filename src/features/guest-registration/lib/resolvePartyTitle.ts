/**
 * Reception multi-bed booking label (no "party" wording).
 * Format: `{Lead} · {N} beds` — group-ness comes from N>1 (+ Users icon in UI).
 */
export function resolvePartyTitle(leadName: string, bedCount: number): string {
  const lead = resolveMeaningfulGuestName(leadName) || 'Guest';
  const beds = Math.max(1, bedCount);
  return `${lead} · ${beds} ${beds === 1 ? 'bed' : 'beds'}`;
}

/** Empty or legacy create-party placeholders (`Guest`, `Guest 2`) — not real names. */
export function isPlaceholderGuestName(name?: string | null): boolean {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return true;
  return /^Guest(\s+\d+)?$/i.test(trimmed);
}

export function resolveMeaningfulGuestName(name?: string | null): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed || isPlaceholderGuestName(trimmed)) return '';
  return trimmed;
}

/** Lead display name for a party: balance row name, else first by created_at. */
export function resolvePartyLeadName(
  partyStays: Array<{
    guest_name?: string | null;
    created_at: string;
    booking_amount_due_minor?: number | null;
  }>
): string {
  if (partyStays.length === 0) return '';
  const sorted = [...partyStays].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const withBalance = sorted.find((s) => s.booking_amount_due_minor != null);
  const ordered = withBalance
    ? [withBalance, ...sorted.filter((s) => s !== withBalance)]
    : sorted;
  for (const stay of ordered) {
    const name = resolveMeaningfulGuestName(stay.guest_name);
    if (name) return name;
  }
  return '';
}

/**
 * Party child bed title:
 * - own guest_name when set (not a placeholder)
 * - else `{lead} ({1-based ordinal})` (creation order in the party)
 */
export function resolvePartyMemberTitle(input: {
  guestName?: string | null;
  leadName: string;
  /** 1-based index in party order (created_at ascending). */
  ordinal: number;
}): string {
  const own = resolveMeaningfulGuestName(input.guestName);
  if (own) return own;
  const lead = resolveMeaningfulGuestName(input.leadName) || 'Guest';
  const ordinal = Math.max(1, Math.floor(input.ordinal));
  return `${lead} (${ordinal})`;
}

/** 1-based ordinal by created_at; unknown id → 1. */
export function resolvePartyMemberOrdinal(
  partyStays: Array<{ id: string; created_at: string }>,
  stayId: string
): number {
  const sorted = [...partyStays].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const index = sorted.findIndex((member) => member.id === stayId);
  return index >= 0 ? index + 1 : 1;
}
