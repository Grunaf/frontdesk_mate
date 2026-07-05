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

export function OwnerCityPackRequestLink({ locale }: { locale: string }) {
  const t = useTranslations('pages.owner.cityPack');

  return (
    <Link href={`/${locale}/onboarding/city-request`} className="font-semibold text-primary underline">
      {t('requestCityLink')}
    </Link>
  );
}
