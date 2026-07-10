import { setRequestLocale } from 'next-intl/server';
import { isStayContactComplete } from '@/features/guest-stay-contact';
import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import { isTourismRegistrationComplete } from '@/entities/guest-tourism-registration';
import { getTourismRegistrationByStayId } from '@/entities/guest-tourism-registration/server';
import { resolveTourismRegistrationRequired } from '@/entities/tenant';
import { resolveTenantAccess } from '@/entities/tenant/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { RegistrationCoordinator } from '@/views/registration';

interface RegistrationPageProps {
  params: Promise<{ locale: string }>;
}

export default async function RegistrationPage({ params }: RegistrationPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  let tourismComplete = false;
  let contactComplete = false;
  let stayContactWhatsapp: string | null = null;

  const access = await resolveTenantAccess('app');
  if (access.kind === 'active') {
    const session = await resolveGuestSessionFromCookies(access.config.slug);
    const tourismRequired = resolveTourismRegistrationRequired(access.config.settings);

    if (session) {
      if (tourismRequired) {
        const registration = await getTourismRegistrationByStayId(session.stayId);
        tourismComplete = registration ? isTourismRegistrationComplete(registration) : false;
      }

      const admin = getSupabaseAdmin();
      if (admin) {
        const { data } = await admin
          .from('guest_reservations')
          .select('stay_contact_whatsapp, tourism_contact_whatsapp')
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
      }
    }
  }

  return (
    <RegistrationCoordinator
      initial={{
        tourismComplete,
        contactComplete,
        stayContactWhatsapp,
      }}
    />
  );
}
