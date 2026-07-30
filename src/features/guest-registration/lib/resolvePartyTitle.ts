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
