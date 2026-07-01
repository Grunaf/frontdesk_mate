import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { resolveTenantAccess } from '@/entities/tenant/server';
import { HostelHero } from '@/widgets/HostelHero';
import { RoomsGallery } from '@/widgets/RoomsGallery';
import { BookingLayoutWrapper } from '@/features/booking';
import { LandingComingSoon } from '@/views/landing/ui/LandingComingSoon';

interface HomePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkin?: string; checkout?: string }>;
}

export async function generateMetadata({ params }: HomePageProps) {
  const { locale } = await params;
  const access = await resolveTenantAccess('landing');

  if (access.kind === 'missing') {
    const t = await getTranslations({ locale, namespace: 'pages.platform.notFound' });
    return { title: t('title'), description: t('description') };
  }

  if (access.kind === 'offline') {
    const t = await getTranslations({ locale, namespace: 'pages.platform.offline' });
    return {
      title: access.shell.name,
      description: t('metaDescription'),
    };
  }

  const tenant = access.config;

  return {
    title: tenant.name,
    description: tenant.hostel.contacts.address.display ?? tenant.name,
  };
}

export default async function LandingPage({ params, searchParams }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { checkin, checkout } = await searchParams;
  const access = await resolveTenantAccess('landing');

  if (access.kind === 'missing') {
    return null;
  }

  if (access.kind === 'offline') {
    return null;
  }

  const tenant = access.config;

  if (tenant.capabilities.landing === 'hidden') {
    return <LandingComingSoon />;
  }

  return (
    <>
      <BookingLayoutWrapper>
        <HostelHero />
      </BookingLayoutWrapper>
      <RoomsGallery checkin={checkin} checkout={checkout} />
    </>
  );
}
