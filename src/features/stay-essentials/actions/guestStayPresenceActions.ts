'use server';

import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import {
  canGuestClearStayPresence,
  canGuestMarkStayVacant,
  type HousekeepingStayPresenceSource,
  type HousekeepingStayPresenceStatus,
} from '@/entities/housekeeping';
import {
  clearHousekeepingStayPresence,
  getHousekeepingStayPresence,
  upsertHousekeepingStayPresence,
} from '@/entities/housekeeping/server';
import { getTenantRecord } from '@/entities/tenant/server';

export type GuestStayPresenceSnapshot = {
  status: HousekeepingStayPresenceStatus;
  source: HousekeepingStayPresenceSource;
  setAt: string;
} | null;

export type GetGuestStayPresenceResult =
  | { ok: true; presence: GuestStayPresenceSnapshot }
  | { ok: false; error: 'unauthorized' | 'db_unavailable' };

export type MarkGuestStayVacantResult =
  | { ok: true; presence: NonNullable<GuestStayPresenceSnapshot> }
  | {
      ok: false;
      error: 'unauthorized' | 'already_vacant' | 'db_unavailable' | 'invalid_status';
    };

export type ClearGuestStayVacantResult =
  | { ok: true }
  | {
      ok: false;
      error: 'unauthorized' | 'not_guest_signal' | 'db_unavailable' | 'invalid_status';
    };

async function resolveGuestPresenceContext(tenantSlug: string) {
  const slug = tenantSlug.trim();
  if (!slug) {
    return { ok: false as const, error: 'unauthorized' as const };
  }

  const session = await resolveGuestSessionFromCookies(slug);
  if (!session?.stayId || !session.bedId) {
    return { ok: false as const, error: 'unauthorized' as const };
  }

  const tenant = await getTenantRecord(slug);
  if (!tenant) {
    return { ok: false as const, error: 'unauthorized' as const };
  }

  return {
    ok: true as const,
    tenantId: tenant.id,
    stayId: session.stayId,
    bedId: session.bedId,
  };
}

/** Read soft presence for the authenticated guest stay (not checkout). */
export async function getGuestStayPresenceAction(
  tenantSlug: string
): Promise<GetGuestStayPresenceResult> {
  const ctx = await resolveGuestPresenceContext(tenantSlug);
  if (!ctx.ok) {
    return { ok: false, error: ctx.error };
  }

  try {
    const row = await getHousekeepingStayPresence(ctx.tenantId, ctx.stayId);
    if (!row) {
      return { ok: true, presence: null };
    }
    return {
      ok: true,
      presence: {
        status: row.status,
        source: row.source,
        setAt: row.set_at,
      },
    };
  } catch (error) {
    console.error('getGuestStayPresenceAction:', error);
    return { ok: false, error: 'db_unavailable' };
  }
}

/** Guest self-report: bed vacant for linen. Does not reception-checkout. */
export async function markGuestStayVacantAction(
  tenantSlug: string
): Promise<MarkGuestStayVacantResult> {
  const ctx = await resolveGuestPresenceContext(tenantSlug);
  if (!ctx.ok) {
    return { ok: false, error: ctx.error };
  }

  try {
    const current = await getHousekeepingStayPresence(ctx.tenantId, ctx.stayId);
    if (
      !canGuestMarkStayVacant(
        current ? { status: current.status, source: current.source } : null
      )
    ) {
      return { ok: false, error: 'already_vacant' };
    }

    const result = await upsertHousekeepingStayPresence({
      tenantId: ctx.tenantId,
      stayId: ctx.stayId,
      bedId: ctx.bedId,
      status: 'vacant',
      source: 'guest',
      setByReceptionUserId: null,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const setAt = new Date().toISOString();
    return {
      ok: true,
      presence: { status: 'vacant', source: 'guest', setAt },
    };
  } catch (error) {
    console.error('markGuestStayVacantAction:', error);
    return { ok: false, error: 'db_unavailable' };
  }
}

/** Guest undo: clear only a guest-authored vacant signal. */
export async function clearGuestStayVacantAction(
  tenantSlug: string
): Promise<ClearGuestStayVacantResult> {
  const ctx = await resolveGuestPresenceContext(tenantSlug);
  if (!ctx.ok) {
    return { ok: false, error: ctx.error };
  }

  try {
    const current = await getHousekeepingStayPresence(ctx.tenantId, ctx.stayId);
    if (
      !canGuestClearStayPresence(
        current ? { status: current.status, source: current.source } : null
      )
    ) {
      return { ok: false, error: 'not_guest_signal' };
    }

    const result = await clearHousekeepingStayPresence({
      tenantId: ctx.tenantId,
      stayId: ctx.stayId,
      expectedSource: 'guest',
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true };
  } catch (error) {
    console.error('clearGuestStayVacantAction:', error);
    return { ok: false, error: 'db_unavailable' };
  }
}
