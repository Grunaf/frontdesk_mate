import { getOwnerTenantContext } from '@/entities/hostel-owner';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

interface OwnerSettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerSettingsPage({ params }: OwnerSettingsPageProps) {
  const { locale } = await params;
  const context = await getOwnerTenantContext();

  if (!context) {
    redirect(`/${locale}/onboarding`);
  }

  const t = await getTranslations('pages.owner.settings');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">{t('teaser')}</p>
    </div>
  );
}
