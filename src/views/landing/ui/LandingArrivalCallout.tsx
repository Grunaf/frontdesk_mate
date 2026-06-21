'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from '@/shared/i18n';
import { getTenantPublicUrl } from '@/shared/config';
import { useBookingDates } from '@/features/booking';
import { useTenant } from '@/entities/tenant';
import { resolveArrivalCallout } from '../lib/resolveArrivalCallout';
import { Button } from '@/shared/ui';
import { ExternalLink } from 'lucide-react';
import { Icon } from '@/shared/ui';

export function LandingArrivalCallout() {
  const t = useTranslations('pages.landing.arrivalCallout');
  const locale = useLocale();
  const { slug, lifecycleStatus } = useTenant();
  const { checkIn } = useBookingDates();

  const callout = useMemo(() => resolveArrivalCallout(checkIn), [checkIn]);

  if (lifecycleStatus !== 'active' || !callout) {
    return null;
  }

  const href =
    callout === 'arrival'
      ? getTenantPublicUrl(slug, 'app', locale, '/welcome')
      : getTenantPublicUrl(slug, 'app', locale);

  const isProminent = callout === 'arrival';

  return (
    <section
      className={
        isProminent
          ? 'border-b border-primary/20 bg-primary/5'
          : 'border-b border-border/60 bg-muted/30'
      }
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="text-left">
          <p className={`text-sm font-medium ${isProminent ? 'text-foreground' : 'text-muted-foreground'}`}>
            {isProminent ? t('arrivalTitle') : t('exploreTitle')}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isProminent ? t('arrivalDescription') : t('exploreDescription')}
          </p>
        </div>
        <Button asChild size="sm" variant={isProminent ? 'default' : 'outline'}>
          <a href={href} className="inline-flex items-center gap-1.5">
            {isProminent ? t('arrivalCta') : t('exploreCta')}
            <Icon icon={ExternalLink} className="size-3.5" />
          </a>
        </Button>
      </div>
    </section>
  );
}
