import { setRequestLocale } from 'next-intl/server';
import { resolveStaySetupStatus } from '@/features/guest-stay-contact/lib/resolveStaySetupStatus';
import {
  mapTourismGuestListItems,
  type TourismGuestListItem,
} from '@/features/guest-tourism-registration';
import { getTourismRegistrationByStayId } from '@/entities/guest-tourism-registration/server';
import { resolveTourismRegistrationRequired } from '@/entities/tenant';
import { resolveTenantAccess } from '@/entities/tenant/server';
import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
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
  let bedVisible = false;
  let stayContactWhatsapp: string | null = null;
  let tourismGuests: TourismGuestListItem[] = [];

  const access = await resolveTenantAccess('app');
  if (access.kind === 'active') {
    const session = await resolveGuestSessionFromCookies(access.config.slug);
    const tourismRequired = resolveTourismRegistrationRequired(access.config.settings);

    if (session) {
      const setup = await resolveStaySetupStatus(access.config.slug);
      if (setup.ok) {
        tourismComplete = setup.status.tourismComplete;
        entryDateComplete = setup.status.entryDateComplete;
        entryStampDate = setup.status.entryStampDate;
        contactComplete = setup.status.contactComplete;
        passportVerified = setup.status.passportVerified;
        bedVisible = setup.status.bedVisible;
        stayContactWhatsapp = setup.status.contactPhone;
      }

      if (tourismRequired) {
        const registration = await getTourismRegistrationByStayId(session.stayId);
        tourismGuests = mapTourismGuestListItems(registration?.guests ?? []);
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
        bedVisible,
        stayContactWhatsapp,
        tourismGuests,
      }}
    />
  );
}
