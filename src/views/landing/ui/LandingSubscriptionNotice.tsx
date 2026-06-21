'use client';

import { useTenant } from '@/entities/tenant';
import { isTenantLeadGenLanding } from '@/entities/tenant/lib/resolveTenantLifecycle';
import { useTranslations } from '@/shared/i18n';

function formatScheduledDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function LandingSubscriptionNotice() {
  const { lifecycleStatus, subscriptionStartsAt } = useTenant();
  const t = useTranslations('pages.landing.subscriptionNotice');

  if (!isTenantLeadGenLanding(lifecycleStatus)) {
    return null;
  }

  const message =
    lifecycleStatus === 'scheduled' && subscriptionStartsAt
      ? t('scheduledWithDate', {
          date: formatScheduledDate(subscriptionStartsAt),
        })
      : lifecycleStatus === 'scheduled'
        ? t('scheduled')
        : t('expired');

  return (
    <div className="border-b border-amber-200/80 bg-amber-50/90 px-4 py-3 text-center text-sm leading-relaxed text-amber-950">
      {message}
    </div>
  );
}
