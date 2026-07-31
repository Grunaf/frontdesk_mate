/**
 * Reception multi-bed booking label (no "party" wording).
 * Format: `{Lead} · {N} beds` — group-ness comes from N>1 (+ Users icon in UI).
 */
export function resolvePartyTitle(leadName: string, bedCount: number): string {
  const lead = leadName.trim() || 'Guest';
  const beds = Math.max(1, bedCount);
  return `${lead} · ${beds} ${beds === 1 ? 'bed' : 'beds'}`;
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
  return (withBalance ?? sorted[0])?.guest_name?.trim() || '';
}

/**
 * Party child bed title:
 * - own guest_name when set
 * - else `{lead} · {1-based ordinal}` (creation order in the party)
 */
export function resolvePartyMemberTitle(input: {
  guestName?: string | null;
  leadName: string;
  /** 1-based index in party order (created_at ascending). */
  ordinal: number;
}): string {
  const own = input.guestName?.trim();
  if (own) return own;
  const lead = input.leadName.trim() || 'Guest';
  const ordinal = Math.max(1, Math.floor(input.ordinal));
  return `${lead} · ${ordinal}`;
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
