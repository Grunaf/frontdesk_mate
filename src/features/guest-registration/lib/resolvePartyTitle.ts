/**
 * Reception party header title.
 * Always uses `{Name}'s party` (simple apostrophe-s for v1).
 */
export function resolvePartyTitle(leadName: string, bedCount: number): string {
  const lead = leadName.trim();
  if (!lead) {
    return `Party · ${bedCount} beds`;
  }
  return `${lead}'s party`;
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
