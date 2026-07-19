'use server';

import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import { getTourismRegistrationByStayId } from '@/entities/guest-tourism-registration/server';
import { isTourismRegistrationComplete } from '@/entities/guest-tourism-registration';
import { resolveTourismRegistrationRequired } from '@/entities/tenant';
import { getTenantRecord } from '@/entities/tenant/server';

export type TourismGuestListItem = {
  id: string;
  firstName: string;
  lastName: string;
  entryStampDate: string | null;
};

export type ListTourismGuestsForSessionActionResult =
  | {
      ok: true;
      guests: TourismGuestListItem[];
      complete: boolean;
      contactWhatsapp: string | null;
    }
  | { ok: false; error: 'feature_disabled' | 'unauthorized' };

export async function listTourismGuestsForSessionAction(
  tenantSlug: string
): Promise<ListTourismGuestsForSessionActionResult> {
  const slug = tenantSlug.trim();
  if (!slug) {
    return { ok: false, error: 'unauthorized' };
  }

  const tenant = await getTenantRecord(slug);
  if (!tenant || !resolveTourismRegistrationRequired(tenant.settings)) {
    return { ok: false, error: 'feature_disabled' };
  }

  const session = await resolveGuestSessionFromCookies(slug);
  if (!session) {
    return { ok: false, error: 'unauthorized' };
  }

  const registration = await getTourismRegistrationByStayId(session.stayId);
  const guests = (registration?.guests ?? []).map((guest) => ({
    id: guest.id,
    firstName: guest.first_name,
    lastName: guest.last_name,
    entryStampDate: guest.entry_stamp_date,
  }));

  return {
    ok: true,
    guests,
    complete: registration ? isTourismRegistrationComplete(registration) : false,
    contactWhatsapp: registration?.tourism_contact_whatsapp ?? null,
  };
}
