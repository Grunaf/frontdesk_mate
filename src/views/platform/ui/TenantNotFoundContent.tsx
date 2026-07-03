'use client';

import Link from 'next/link';
import { useTranslations } from '@/shared/i18n';
import { getPlatformRootUrl, type TenantPublicSite } from '@/shared/config';
import { Button } from '@/shared/ui';
import {
  TenantDirectoryList,
  type TenantDirectoryEntry,
} from '@/views/platform/ui/TenantDirectoryList';

interface TenantNotFoundContentProps {
  site: TenantPublicSite;
  locale: string;
  activeTenants?: TenantDirectoryEntry[];
}

export function TenantNotFoundContent({
  site,
  locale,
  activeTenants = [],
}: TenantNotFoundContentProps) {
  const t = useTranslations('pages.platform.notFound');

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-5 px-6 py-10 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <Button asChild variant="outline">
        <Link href={getPlatformRootUrl(locale)}>{t('backButton')}</Link>
      </Button>
      <TenantDirectoryList
        title={t('directoryTitle')}
        tenants={activeTenants}
        site={site}
        locale={locale}
      />
    </div>
  );
}
