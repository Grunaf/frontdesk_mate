import { setRequestLocale } from 'next-intl/server';
import { isStayContactComplete } from '@/features/guest-stay-contact';
import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import {
  isEntryDateComplete,
  isTourismRegistrationComplete,
  resolveSharedEntryStampDate,
} from '@/entities/guest-tourism-registration';
import { getTourismRegistrationByStayId } from '@/entities/guest-tourism-registration/server';
import {
  mapTourismGuestListItems,
  type TourismGuestListItem,
} from '@/features/guest-tourism-registration';
import { resolveTourismRegistrationRequired } from '@/entities/tenant';
import { resolveTenantAccess } from '@/entities/tenant/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { StaySetupCoordinator } from '@/views/stay-setup';

interface StaySetupPageProps {
  params: Promise<{ locale: string }>;
}

export default async function StaySetupPage({ params }: StaySetupPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  let tourismComplete = false;
  let entryDateComplete = false;
  let entryStampDate: string | null = null;
  let contactComplete = false;
  let passportVerified = false;
  let stayContactWhatsapp: string | null = null;
  let tourismGuests: TourismGuestListItem[] = [];

  const access = await resolveTenantAccess('app');
  if (access.kind === 'active') {
    const session = await resolveGuestSessionFromCookies(access.config.slug);
    const tourismRequired = resolveTourismRegistrationRequired(access.config.settings);

    if (session) {
      if (tourismRequired) {
        const registration = await getTourismRegistrationByStayId(session.stayId);
        tourismComplete = registration ? isTourismRegistrationComplete(registration) : false;
        entryDateComplete = registration ? isEntryDateComplete(registration) : false;
        entryStampDate = registration ? resolveSharedEntryStampDate(registration) : null;
        tourismGuests = mapTourismGuestListItems(registration?.guests ?? []);
      }

      const admin = getSupabaseAdmin();
      if (admin) {
        const { data } = await admin
          .from('guest_reservations')
          .select('stay_contact_whatsapp, tourism_contact_whatsapp, passport_checked_at')
          .eq('id', session.stayId)
          .maybeSingle();

        const stayContact = data?.stay_contact_whatsapp
          ? String(data.stay_contact_whatsapp)
          : null;
        const legacy = data?.tourism_contact_whatsapp
          ? String(data.tourism_contact_whatsapp)
          : null;

        contactComplete = isStayContactComplete({
          stayContactWhatsapp: stayContact,
          legacyTourismContactWhatsapp: legacy,
        });
        stayContactWhatsapp = stayContact ?? legacy;
        passportVerified = Boolean(data?.passport_checked_at);
      }
    }
  }

  return (
    <StaySetupCoordinator
      initial={{
        tourismComplete,
        entryDateComplete,
        entryStampDate,
        contactComplete,
        passportVerified,
        stayContactWhatsapp,
        tourismGuests,
      }}
    />
  );
}
