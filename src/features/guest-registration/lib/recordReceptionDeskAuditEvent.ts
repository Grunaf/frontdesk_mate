import { readReceptionSessionFromCookies } from '@/app/reception/lib/receptionSession';
import type {
  ReceptionAuditEventFlags,
  ReceptionAuditEventType,
  ReceptionAuditSubjectType,
} from '@/entities/reception-audit';
import { insertReceptionAuditEvent } from '@/entities/reception-audit/server';
import { getTenantRecord } from '@/entities/tenant/server';

export type ReceptionDeskAuditMutation =
  | 'createGuestStay'
  | 'updateGuestReservation'
  | 'revokeGuestStay'
  | 'reissueGuestStay'
  | 'completeDeskCheckIn'
  | 'setGuestReservationBookingPaid'
  | 'resolveGuestHubTransfer';

export type MapReceptionDeskAuditEventInput = {
  mutation: ReceptionDeskAuditMutation;
  subjectId: string;
  bedId?: string;
  paid?: boolean;
};

export type MappedReceptionDeskAuditEvent = {
  eventType: ReceptionAuditEventType;
  subjectType: ReceptionAuditSubjectType;
  subjectId: string;
  flags: ReceptionAuditEventFlags;
};

const MUTATION_TO_EVENT = {
  createGuestStay: { eventType: 'guest_stay_created', subjectType: 'guest_stay' },
  updateGuestReservation: { eventType: 'guest_stay_updated', subjectType: 'guest_stay' },
  revokeGuestStay: { eventType: 'guest_stay_revoked', subjectType: 'guest_stay' },
  reissueGuestStay: { eventType: 'guest_stay_reissued', subjectType: 'guest_stay' },
  completeDeskCheckIn: { eventType: 'desk_check_in_completed', subjectType: 'guest_stay' },
  setGuestReservationBookingPaid: { eventType: 'booking_paid_set', subjectType: 'guest_stay' },
  resolveGuestHubTransfer: { eventType: 'hub_transfer_resolved', subjectType: 'guest_hub_transfer' },
} as const satisfies Record<
  ReceptionDeskAuditMutation,
  { eventType: ReceptionAuditEventType; subjectType: ReceptionAuditSubjectType }
>;

/** Pure: whether session + tenant context is enough to write an audit row. */
export function canRecordReceptionDeskAudit(ctx: {
  receptionUserId: string | null | undefined;
  tenantId: string | null | undefined;
}): boolean {
  return Boolean(ctx.receptionUserId && ctx.tenantId);
}

/** Pure: map desk mutation → audit event_type / subject / flags (no PII). */
export function mapReceptionDeskAuditEvent(
  input: MapReceptionDeskAuditEventInput
): MappedReceptionDeskAuditEvent {
  const { eventType, subjectType } = MUTATION_TO_EVENT[input.mutation];
  const flags: ReceptionAuditEventFlags & { bedId?: string; paid?: boolean } = {};

  if (input.bedId) {
    flags.bedId = input.bedId;
    flags.summary = input.bedId;
  }
  if (input.paid !== undefined) {
    flags.paid = input.paid;
    flags.summary = input.paid ? 'paid' : 'unpaid';
  }

  return {
    eventType,
    subjectType,
    subjectId: input.subjectId,
    flags,
  };
}

/**
 * After a successful desk mutation: session → tenant → insertReceptionAuditEvent.
 * Failures are swallowed so callers never abort the business result.
 */
export async function recordReceptionDeskAuditEvent(input: {
  tenantSlug: string;
  mutation: ReceptionDeskAuditMutation;
  subjectId: string;
  bedId?: string;
  paid?: boolean;
}): Promise<void> {
  try {
    const session = await readReceptionSessionFromCookies();
    const receptionUserId = session?.receptionUserId;
    if (!receptionUserId) return;

    const tenant = await getTenantRecord(input.tenantSlug);
    if (!canRecordReceptionDeskAudit({ receptionUserId, tenantId: tenant?.id })) {
      return;
    }

    const mapped = mapReceptionDeskAuditEvent({
      mutation: input.mutation,
      subjectId: input.subjectId,
      bedId: input.bedId,
      paid: input.paid,
    });

    await insertReceptionAuditEvent({
      tenantId: tenant!.id,
      actorReceptionUserId: receptionUserId,
      eventType: mapped.eventType,
      subjectType: mapped.subjectType,
      subjectId: mapped.subjectId,
      flags: mapped.flags,
    });
  } catch (error) {
    console.error('[recordReceptionDeskAuditEvent]', error);
  }
}
