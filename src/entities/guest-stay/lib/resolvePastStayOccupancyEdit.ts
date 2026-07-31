/**
 * Past-occupancy edit rules for reception desk (`desk.edit_past_stays`).
 *
 * Eligibility is archive fields only — checked-out Plan history uses
 * `status: 'cancelled'` in DB; do not gate on status here.
 */

/** Archived stay eligible for past occupancy edit (Plan checked-out history). */
export function isPastEditEligibleArchivedStay(stay: {
  is_archived?: boolean | null;
  archive_kind?: string | null;
  archive_reason?: string | null;
}): boolean {
  return (
    Boolean(stay.is_archived) &&
    stay.archive_kind === 'full' &&
    stay.archive_reason === 'checked_out'
  );
}

/**
 * After past edit: reopen as live when new exclusive checkout is still after operational day.
 * `operationalDate >= checkOutDate` means ended — keep archived.
 */
export function shouldUnarchiveAfterPastOccupancyEdit(input: {
  checkOutDate: string;
  operationalDate: string;
}): boolean {
  return input.operationalDate < input.checkOutDate;
}
