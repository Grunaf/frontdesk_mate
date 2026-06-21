'use client';

import { useState } from 'react';
import { useTranslations } from '@/shared/i18n';
import { getTenantPublicUrl, normalizeTenantSlugInput, type TenantPublicSite } from '@/shared/config';
import { Button, Input } from '@/shared/ui';
import { TenantDirectoryList } from '@/views/platform/ui/TenantDirectoryList';

interface PublicTenantOption {
  slug: string;
  name: string;
}

interface GuestRecoveryContentProps {
  locale: string;
  site: TenantPublicSite;
  tenants: PublicTenantOption[];
}

export function GuestRecoveryContent({ locale, site, tenants }: GuestRecoveryContentProps) {
  const t = useTranslations('pages.platform.recovery');
  const [slugInput, setSlugInput] = useState('');
  const [error, setError] = useState('');

  const goToSlug = (rawSlug: string) => {
    const slug = normalizeTenantSlugInput(rawSlug);
    if (!slug) {
      setError(t('slugRequired'));
      return;
    }

    window.location.assign(getTenantPublicUrl(slug, site, locale));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    goToSlug(slugInput);
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center gap-8 px-6 py-10">
      <div className="space-y-3 text-center">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {site === 'app' ? t('eyebrowApp') : t('eyebrowLanding')}
        </p>
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('primaryHint')}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-4 text-sm font-medium text-foreground">{t('lookupTitle')}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            value={slugInput}
            onChange={(event) => {
              setSlugInput(event.target.value);
              if (error) {
                setError('');
              }
            }}
            placeholder={t('slugPlaceholder')}
            autoComplete="off"
            spellCheck={false}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">
            {site === 'app' ? t('openAppButton') : t('openSiteButton')}
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">{t('lookupHint')}</p>
      </div>

      {tenants.length > 0 ? (
        <TenantDirectoryList
          title={t('directoryTitle')}
          tenants={tenants}
          site={site}
          locale={locale}
        />
      ) : null}

      <p className="text-center text-xs text-muted-foreground">{t('supportHint')}</p>
    </div>
  );
}
