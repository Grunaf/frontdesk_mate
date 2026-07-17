import { assertOwnerAuthenticated, getOwnerTenantContext } from '@/entities/hostel-owner';
import { CityPackRequestForm } from '@/features/city-pack-request';
import type { CityPackRequestKind } from '@/entities/city-pack-request';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

interface OwnerCityRequestPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ submitted?: string; pack?: string }>;
}

export default async function OwnerCityRequestPage({
  params,
  searchParams,
}: OwnerCityRequestPageProps) {
  const { locale } = await params;
  const { submitted, pack } = await searchParams;
  const session = await assertOwnerAuthenticated().catch(() => null);
  if (!session) {
    return null;
  }

  const context = await getOwnerTenantContext();
  const t = await getTranslations('pages.owner.cityRequest');

  const packId = typeof pack === 'string' ? pack.trim() : '';
  const defaultRequestKind: CityPackRequestKind = packId ? 'pack_not_ready' : 'new_city';

  if (submitted === '1') {
    const backHref = context ? `/${locale}/setup` : `/${locale}/onboarding`;
    const backLabel = context ? t('backToSetup') : t('backToOnboarding');

    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">{t('success.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('success.body')}</p>
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {backLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <CityPackRequestForm
        locale={locale}
        contactEmail={session.email ?? context?.email ?? ''}
        relatedCityPackId={packId}
        defaultRequestKind={defaultRequestKind}
      />
    </div>
  );
}
