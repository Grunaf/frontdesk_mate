'use client';

import { useLocale, useTranslations } from '@/shared/i18n';
import { getTenantPublicUrl } from '@/shared/config';
import { TenantBrand } from '@/entities/tenant/ui/TenantBrand';
import { useTenant } from '@/entities/tenant';
import { ExternalLink } from 'lucide-react';
import { Icon } from '@/shared/ui';

export function LandingSiteHeader() {
  const t = useTranslations('pages.landing.header');
  const locale = useLocale();
  const { slug, name, settings, lifecycleStatus } = useTenant();

  if (lifecycleStatus !== 'active') {
    return null;
  }

  const guestAppUrl = getTenantPublicUrl(slug, 'app', locale);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <TenantBrand surface="landing" name={name} logoUrl={settings.logoUrl} className="min-w-0 flex-1" />
        <a
          href={guestAppUrl}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
        >
          {t('guestAppLink')}
          <Icon icon={ExternalLink} className="size-3.5 shrink-0" />
        </a>
      </div>
    </header>
  );
}
