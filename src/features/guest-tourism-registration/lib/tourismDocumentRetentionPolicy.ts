/** GDPR storage limitation default (Chat A). Override via env in the purge job only. */
export const DEFAULT_TOURISM_DOCUMENT_RETENTION_DAYS = 90;

export function addRetentionDaysToCheckOut(checkOutAt: Date, retentionDays: number): Date {
  const purgeAfter = new Date(checkOutAt.getTime());
  purgeAfter.setUTCDate(purgeAfter.getUTCDate() + retentionDays);
  return purgeAfter;
}

/**
 * True when tourism document purge is allowed: check-out was at least `retentionDays` ago.
 * Does not apply if check-out is in the future relative to `now`.
 */
export function isTourismDocumentRetentionDue(
  checkOutAtIso: string,
  now: Date,
  retentionDays: number = DEFAULT_TOURISM_DOCUMENT_RETENTION_DAYS
): boolean {
  const checkOutAt = new Date(checkOutAtIso);
  if (Number.isNaN(checkOutAt.getTime())) {
    return false;
  }

  if (checkOutAt.getTime() > now.getTime()) {
    return false;
  }

  const purgeAfter = addRetentionDaysToCheckOut(checkOutAt, retentionDays);
  return now.getTime() >= purgeAfter.getTime();
}

export function resolveTourismDocumentRetentionCutoffIso(
  now: Date,
  retentionDays: number = DEFAULT_TOURISM_DOCUMENT_RETENTION_DAYS
): string {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);
  return cutoff.toISOString();
}
