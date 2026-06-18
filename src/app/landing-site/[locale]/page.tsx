import { getTranslations } from 'next-intl/server';
import { HostelHero } from '@/widgets/HostelHero';
import { RoomsGallery } from '@/widgets/RoomsGallery';
import { BookingLayoutWrapper } from '@/features/booking';

interface HomePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkin?: string; checkout?: string }>; // Объединяем пропсы страницы
}

export async function generateMetadata({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'domains.hostel.meta' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function LandingPage({ params, searchParams }: HomePageProps) {
  const { locale } = await params;
  const { checkin, checkout } = await searchParams; // Теперь searchParams доступны легально
  const t = await getTranslations({ locale, namespace: 'Hostel.Home' });

  return (
    <>
      <BookingLayoutWrapper>
        <HostelHero />
      </BookingLayoutWrapper>
      <RoomsGallery checkin={checkin} checkout={checkout} />

      {/* 
      <HostelFeatures />

      <DirectBookingBenefit title={t('benefits.title')} description={t('benefits.description')} />

      <HostelFooter /> 
      */}
    </>
  );
}
