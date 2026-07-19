'use server';

import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import {
  isEntryDateComplete,
  isTourismRegistrationComplete,
  resolveSharedEntryStampDate,
} from '@/entities/guest-tourism-registration';
import { getTourismRegistrationByStayId } from '@/entities/guest-tourism-registration/server';
import { resolveTourismRegistrationRequired } from '@/entities/tenant';
import { getTenantRecord } from '@/entities/tenant/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { isStayContactComplete } from '../lib/isStayContactComplete';

export type StaySetupStatus = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  entryDateComplete: boolean;
  entryStampDate: string | null;
  contactComplete: boolean;
  /** Desk admitted guest to settle in (`passport_checked_at` set). */
  passportVerified: boolean;
  stayContactWhatsapp: string | null;
  completedSteps: number;
  totalSteps: number;
};

export type GetStaySetupStatusActionResult =
  | { ok: true; status: StaySetupStatus }
  | { ok: false; error: 'unauthorized' | 'db_unavailable' };

export async function getStaySetupStatusAction(
  tenantSlug: string
): Promise<GetStaySetupStatusActionResult> {
  const slug = tenantSlug.trim();
  if (!slug) {
    return { ok: false, error: 'unauthorized' };
  }

  const tenant = await getTenantRecord(slug);
  if (!tenant) {
    return { ok: false, error: 'unauthorized' };
  }

  const session = await resolveGuestSessionFromCookies(slug);
  if (!session) {
    return { ok: false, error: 'unauthorized' };
  }

  const tourismRequired = resolveTourismRegistrationRequired(tenant.settings);
  let tourismComplete = false;
  let entryDateComplete = false;
  let entryStampDate: string | null = null;

  if (tourismRequired) {
    const registration = await getTourismRegistrationByStayId(session.stayId);
    tourismComplete = registration ? isTourismRegistrationComplete(registration) : false;
    entryDateComplete = registration ? isEntryDateComplete(registration) : false;
    entryStampDate = registration ? resolveSharedEntryStampDate(registration) : null;
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { data, error } = await admin
    .from('guest_reservations')
    .select('stay_contact_whatsapp, tourism_contact_whatsapp, passport_checked_at')
    .eq('id', session.stayId)
    .maybeSingle();

  if (error) {
    console.error('getStaySetupStatusAction:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const stayContactWhatsapp = data?.stay_contact_whatsapp
    ? String(data.stay_contact_whatsapp)
    : null;
  const legacyTourismContact = data?.tourism_contact_whatsapp
    ? String(data.tourism_contact_whatsapp)
    : null;

  const contactComplete = isStayContactComplete({
    stayContactWhatsapp,
    legacyTourismContactWhatsapp: legacyTourismContact,
  });
  const passportVerified = Boolean(data?.passport_checked_at);

  const totalSteps = tourismRequired ? 3 : 2;
  let completedSteps = 0;
  if (tourismRequired && tourismComplete) {
    completedSteps += 1;
  }
  if (tourismRequired && entryDateComplete) {
    completedSteps += 1;
  }
  if (contactComplete) {
    completedSteps += 1;
  }

  return {
    ok: true,
    status: {
      tourismRequired,
      tourismComplete,
      entryDateComplete,
      entryStampDate,
      contactComplete,
      passportVerified,
      stayContactWhatsapp: stayContactWhatsapp ?? legacyTourismContact,
      completedSteps,
      totalSteps,
    },
  };
}
