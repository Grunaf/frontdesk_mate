'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from '@/shared/i18n';
import { getPlatformRootUrl } from '@/shared/config';
import { Button } from '@/shared/ui';

export function TenantNotFoundContent() {
  const locale = useLocale();
  const t = useTranslations('pages.platform.notFound');

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">{t('description')}</p>
      <Button asChild variant="outline">
        <Link href={getPlatformRootUrl(locale)}>{t('backButton')}</Link>
      </Button>
    </div>
  );
}
