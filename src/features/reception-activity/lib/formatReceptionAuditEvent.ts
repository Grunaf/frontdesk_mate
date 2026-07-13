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

const EVENT_TYPE_LABELS: Record<ReceptionAuditEventType, string> = {
  guest_stay_created: 'Guest stay created',
  guest_stay_updated: 'Guest stay updated',
  guest_stay_revoked: 'Guest stay revoked',
  guest_stay_reissued: 'Guest stay reissued',
  desk_check_in_completed: 'Desk check-in completed',
  booking_paid_set: 'Booking marked paid',
  hub_transfer_resolved: 'Hub transfer resolved',
};

export function formatReceptionAuditEventLabel(eventType: ReceptionAuditEventType): string {
  return EVENT_TYPE_LABELS[eventType];
}

export function formatReceptionAuditEventTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatReceptionAuditActor(event: ReceptionAuditActorSource): string {
  const displayName = event.actorDisplayName?.trim();
  if (displayName) return displayName;

  const login = event.actorLogin?.trim();
  if (login) return login;

  if (event.actorReceptionUserId) return 'Former staff';
  return '—';
}

export function formatReceptionAuditEventDetail(event: ReceptionAuditEventDetailSource): string {
  const parts: string[] = [];
  const summary = event.flags.summary?.trim();
  if (summary) parts.push(summary);
  const subjectId = event.subjectId?.trim();
  if (subjectId) parts.push(subjectId);
  return parts.length > 0 ? parts.join(' · ') : '—';
}
