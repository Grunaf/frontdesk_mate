'use client';

import { useRouter } from 'next/navigation';
import { resolveGuestStayPlan } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { useTenant } from '@/entities/tenant';
import { SITE_CONFIG } from '@/shared/config';
import { Button, Icon } from '@/shared/ui';
import { ArrowRight } from 'lucide-react';
import { FindYourBedSummary } from './FindYourBedSummary';

export function FindYourBedCard() {
  const t = useTranslations('components.findYourBed');
  const { settings } = useTenant();
  const router = useRouter();
  const plan = resolveGuestStayPlan(settings);

  if (!plan.bedId) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="mb-4 h-auto w-full justify-between gap-3 p-3 text-left"
      onClick={() => router.push(`${SITE_CONFIG.routes.app.welcome.path}?step=settlement`)}
    >
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          {t('title')}
        </span>
        <FindYourBedSummary plan={plan} variant="inline" />
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
        <span className="hidden sm:inline">{t('viewFullGuide')}</span>
        <Icon icon={ArrowRight} className="size-4" />
      </span>
    </Button>
  );
}
