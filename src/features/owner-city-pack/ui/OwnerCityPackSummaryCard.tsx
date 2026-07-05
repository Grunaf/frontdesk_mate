'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  CityPackInheritanceCard,
  type CityPackInheritanceCardProps,
} from '@/app/admin/(protected)/tenants/ui/CityPackInheritanceCard';

type OwnerCityPackSummaryCardProps = Omit<
  CityPackInheritanceCardProps,
  'surface' | 'ownerLabels' | 'locale'
> & {
  locale: string;
};

export function OwnerCityPackSummaryCard({ locale, ...cardProps }: OwnerCityPackSummaryCardProps) {
  const t = useTranslations('pages.owner.cityPack');

  return (
    <CityPackInheritanceCard
      {...cardProps}
      surface="owner"
      locale={locale}
      ownerLabels={{
        inheritedTitle: t('inheritedTitle'),
        inheritedDescription: t('inheritedDescription'),
        managedHint: t('managedHint'),
        requestCityLink: t('requestCityLink'),
        statusReady: t('statusReady'),
        statusNotReady: t('statusNotReady'),
        enabledRoutes: t('enabledRoutes'),
        cityTaxi: t('cityTaxi'),
        packLabel: t('packLabel'),
        none: t('none'),
      }}
    />
  );
}

export function ownerCityRequestHref(locale: string, packId?: string): string {
  const base = `/${locale}/city-request`;
  const id = packId?.trim();
  return id ? `${base}?pack=${encodeURIComponent(id)}` : base;
}

export function OwnerCityPackRequestLink({
  locale,
  packId,
}: {
  locale: string;
  packId?: string;
}) {
  const t = useTranslations('pages.owner.cityPack');

  return (
    <Link href={ownerCityRequestHref(locale, packId)} className="font-semibold text-primary underline">
      {t('requestCityLink')}
    </Link>
  );
}
