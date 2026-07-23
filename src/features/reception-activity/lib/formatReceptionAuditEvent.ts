import type { ReceptionAuditEventType } from '@/entities/reception-audit';

type ReceptionAuditEventDetailSource = {
  subjectId: string | null;
  flags: { summary?: string };
};

type ReceptionAuditActorSource = {
  actorReceptionUserId: string | null;
  actorLogin: string | null;
  actorDisplayName: string | null;
};

export type ReceptionAuditEventTypeLabels = Record<ReceptionAuditEventType, string>;

export type ReceptionAuditFormatLabels = {
  formerStaff: string;
  emptyDetail: string;
  eventTypes: ReceptionAuditEventTypeLabels;
};

export const DEFAULT_RECEPTION_AUDIT_FORMAT_LABELS: ReceptionAuditFormatLabels = {
  formerStaff: 'Former staff',
  emptyDetail: '—',
  eventTypes: {
    guest_stay_created: 'Guest stay created',
    guest_stay_updated: 'Guest stay updated',
    guest_stay_revoked: 'Guest stay revoked',
    guest_stay_archived: 'Guest stay archived',
    guest_stay_trashed: 'Guest stay moved to archive',
    guest_stay_cancelled: 'Guest stay cancelled',
    guest_stay_checked_out: 'Guest checked out',
    guest_stay_remainder_archived: 'Unlived nights moved to archive',
    guest_stay_restored: 'Guest stay restored',
    guest_stay_purged: 'Guest stay permanently deleted',
    guest_stay_reissued: 'Guest stay reissued',
    desk_check_in_completed: 'Desk check-in completed',
    booking_paid_set: 'Booking marked paid',
    hub_transfer_resolved: 'Hub transfer resolved',
  },
};

export function formatReceptionAuditEventLabel(
  eventType: ReceptionAuditEventType,
  labels: ReceptionAuditEventTypeLabels = DEFAULT_RECEPTION_AUDIT_FORMAT_LABELS.eventTypes
): string {
  return labels[eventType];
}

export function formatReceptionAuditEventTime(iso: string, locale = 'en-GB'): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatReceptionAuditActor(
  event: ReceptionAuditActorSource,
  labels: Pick<ReceptionAuditFormatLabels, 'formerStaff' | 'emptyDetail'> = {
    formerStaff: DEFAULT_RECEPTION_AUDIT_FORMAT_LABELS.formerStaff,
    emptyDetail: DEFAULT_RECEPTION_AUDIT_FORMAT_LABELS.emptyDetail,
  }
): string {
  const displayName = event.actorDisplayName?.trim();
  if (displayName) return displayName;

  const login = event.actorLogin?.trim();
  if (login) return login;

  if (event.actorReceptionUserId) return labels.formerStaff;
  return labels.emptyDetail;
}

export function formatReceptionAuditEventDetail(
  event: ReceptionAuditEventDetailSource,
  emptyDetail = DEFAULT_RECEPTION_AUDIT_FORMAT_LABELS.emptyDetail
): string {
  const parts: string[] = [];
  const summary = event.flags.summary?.trim();
  if (summary) parts.push(summary);
  const subjectId = event.subjectId?.trim();
  if (subjectId) parts.push(subjectId);
  return parts.length > 0 ? parts.join(' · ') : emptyDetail;
}
