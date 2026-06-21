import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { CheckInPageContent } from '@/features/guest-check-in';

interface CheckInPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: CheckInPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.checkIn' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function CheckInPage({ params }: CheckInPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CheckInPageContent locale={locale} />;
}
