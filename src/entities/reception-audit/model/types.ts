export type ReceptionAuditEventType =
  | 'guest_stay_created'
  | 'guest_stay_updated'
  | 'guest_stay_revoked'
  | 'guest_stay_reissued'
  | 'desk_check_in_completed'
  | 'booking_paid_set'
  | 'hub_transfer_resolved';

export type ReceptionAuditSubjectType = 'guest_stay' | 'guest_hub_transfer';

export type ReceptionAuditEventFlags = {
  /** Optional compact extras (stay label, transfer channel, etc.). */
  summary?: string;
};

export type InsertReceptionAuditEventInput = {
  tenantId: string;
  actorReceptionUserId: string | null;
  eventType: ReceptionAuditEventType;
  subjectType?: ReceptionAuditSubjectType | null;
  subjectId?: string | null;
  flags?: ReceptionAuditEventFlags;
};

export type ReceptionAuditEventRow = {
  id: string;
  createdAt: string;
  actorReceptionUserId: string | null;
  eventType: ReceptionAuditEventType;
  subjectType: ReceptionAuditSubjectType | null;
  subjectId: string | null;
  flags: ReceptionAuditEventFlags;
};

export const RECEPTION_AUDIT_EVENT_TYPES = [
  'guest_stay_created',
  'guest_stay_updated',
  'guest_stay_revoked',
  'guest_stay_reissued',
  'desk_check_in_completed',
  'booking_paid_set',
  'hub_transfer_resolved',
] as const satisfies readonly ReceptionAuditEventType[];

export function isReceptionAuditEventType(value: string): value is ReceptionAuditEventType {
  return (RECEPTION_AUDIT_EVENT_TYPES as readonly string[]).includes(value);
}
