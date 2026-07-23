'use server';

import { revalidatePath } from 'next/cache';

import {
  assertOwnerAuthenticated,
  getOwnerTenantContext,
} from '@/entities/hostel-owner';
import { resolveOwnerEditAccess } from '@/entities/hostel-owner/lib/resolveOwnerEditAccess';
import {
  archiveVolunteerStay,
  createVolunteerStay,
} from '@/entities/volunteer/server';
import type { VolunteerSource } from '@/entities/volunteer';

async function resolveOwnerWriter(): Promise<
  | { ok: true; slug: string; locale: string; tenantId: string; userId: string }
  | { ok: false; error: 'unauthorized' | 'forbidden' }
> {
  await assertOwnerAuthenticated();
  const context = await getOwnerTenantContext();
  if (!context) {
    return { ok: false, error: 'unauthorized' };
  }

  const access = resolveOwnerEditAccess(context.lifecycleStatus);
  if (!access.canEditSettings) {
    return { ok: false, error: 'forbidden' };
  }

  return {
    ok: true,
    slug: context.slug,
    locale: 'en',
    tenantId: context.tenantId,
    userId: context.userId,
  };
}

function revalidateVolunteers(locale: string) {
  revalidatePath(`/${locale}/volunteers`);
}

export async function createVolunteerStayAction(input: {
  locale: string;
  displayName: string;
  source: VolunteerSource;
  bedId: string;
  checkInDate: string;
  checkOutDate: string;
}) {
  const actor = await resolveOwnerWriter();
  if (!actor.ok) {
    return { ok: false as const, error: actor.error };
  }

  const result = await createVolunteerStay({
    tenantSlug: actor.slug,
    displayName: input.displayName,
    source: input.source,
    bedId: input.bedId,
    checkInDate: input.checkInDate,
    checkOutDate: input.checkOutDate,
    locale: input.locale,
  });

  if (!result.ok) {
    return result;
  }

  revalidateVolunteers(input.locale);
  return {
    ok: true as const,
    volunteerId: result.volunteer.id,
    stayId: result.stayId,
    staffLogin: result.staffLogin,
    staffPin: result.staffPin,
  };
}

export async function archiveVolunteerStayAction(input: {
  locale: string;
  volunteerId: string;
  operationalDate: string;
}) {
  const actor = await resolveOwnerWriter();
  if (!actor.ok) {
    return { ok: false as const, error: actor.error };
  }

  const result = await archiveVolunteerStay({
    tenantSlug: actor.slug,
    volunteerId: input.volunteerId,
    ownerUserId: actor.userId,
    operationalDate: input.operationalDate,
  });

  if (!result.ok) {
    return result;
  }

  revalidateVolunteers(input.locale);
  return { ok: true as const };
}
