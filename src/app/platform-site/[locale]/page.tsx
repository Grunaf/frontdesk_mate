import { setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { listPublicTenants } from '@/entities/tenant/server';
import type { TenantPublicSite } from '@/shared/config';
import { GuestRecoveryContent } from '@/views/platform/ui/GuestRecoveryContent';

interface PlatformHomePageProps {
  params: Promise<{ locale: string }>;
}

async function resolvePlatformSite(): Promise<TenantPublicSite> {
  const headerStore = await headers();
  return headerStore.get('x-platform-site') === 'app' ? 'app' : 'landing';
}

export async function generateMetadata({ params }: PlatformHomePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.platform.recovery' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function PlatformHomePage({ params }: PlatformHomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const site = await resolvePlatformSite();
  const tenants = await listPublicTenants();

  return <GuestRecoveryContent locale={locale} site={site} tenants={tenants} />;
}
