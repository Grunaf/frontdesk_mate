import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

interface OwnerCityRequestPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerCityRequestPage({ params }: OwnerCityRequestPageProps) {
  const { locale } = await params;
  const t = await getTranslations('pages.owner.cityRequest');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">{t('description')}</p>
      <Link
        href={`/${locale}/onboarding`}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t('backLink')}
      </Link>
    </div>
  );
}
