'use server';

import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import type {
  EntryDetailsStatus,
  EntryTransportType,
} from '@/entities/guest-tourism-registration';
import { isTourismRegistrationComplete } from '@/entities/guest-tourism-registration';
import { getTourismRegistrationByStayId } from '@/entities/guest-tourism-registration/server';
import { resolveTourismRegistrationRequired } from '@/entities/tenant';
import { getTenantRecord } from '@/entities/tenant/server';
import { mapTourismGuestListItems } from '../lib/mapTourismGuestListItems';

export type TourismGuestListItem = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  entryStampDate: string | null;
  entryStampPage: number | null;
};

export type TourismEntryDetailsDto = {
  transportType: EntryTransportType | null;
  entryPointCode: string | null;
  entryPointLabel: string | null;
  status: EntryDetailsStatus | null;
};

export type ListTourismGuestsForSessionActionResult =
  | {
      ok: true;
      guests: TourismGuestListItem[];
      entryDetails: TourismEntryDetailsDto;
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
  const guests = mapTourismGuestListItems(registration?.guests ?? []);

  return {
    ok: true,
    guests,
    entryDetails: {
      transportType: registration?.entry_transport_type ?? null,
      entryPointCode: registration?.entry_point_code ?? null,
      entryPointLabel: registration?.entry_point_label ?? null,
      status: registration?.entry_details_status ?? null,
    },
    complete: registration ? isTourismRegistrationComplete(registration) : false,
    contactWhatsapp: registration?.tourism_contact_whatsapp ?? null,
  };
}
