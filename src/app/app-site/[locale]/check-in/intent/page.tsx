import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { GuestIntentScreen } from '@/features/guest-check-in';

interface GuestIntentPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: GuestIntentPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.checkIn.intent' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function GuestIntentPage({ params }: GuestIntentPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <GuestIntentScreen locale={locale} />;
}
