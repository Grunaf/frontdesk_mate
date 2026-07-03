import { setRequestLocale } from 'next-intl/server';
import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import { isTourismRegistrationComplete } from '@/entities/guest-tourism-registration/server';
import { resolveTenantAccess } from '@/entities/tenant/server';
import { ArrivalJourneyCoordinator } from '@/views/arrival-journey';

interface ArrivalJourneyPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export default async function ArrivalJourneyPage({ params, searchParams }: ArrivalJourneyPageProps) {
  const { locale } = await params;
  const { mode } = await searchParams;

  setRequestLocale(locale);

  const isOnsite = mode === 'onsite';

  let tourismRegistrationComplete = false;
  const access = await resolveTenantAccess('app');
  if (access.kind === 'active') {
    const session = await resolveGuestSessionFromCookies(access.config.slug);
    if (session) {
      tourismRegistrationComplete = await isTourismRegistrationComplete(session.stayId);
    }
  }

  return (
    <ArrivalJourneyCoordinator
      isOnsite={isOnsite}
      tourismRegistrationComplete={tourismRegistrationComplete}
    />
  );
}
