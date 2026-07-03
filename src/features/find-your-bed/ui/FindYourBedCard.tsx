'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { resolveGuestStayPlan, resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import { useIsGuestRegistered } from '@/features/guest-check-in';
import { listTourismGuestsForSessionAction } from '@/features/guest-tourism-registration';
import { useTranslations, useLocale } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { Button, Icon } from '@/shared/ui';
import { ArrowRight } from 'lucide-react';
import { FindYourBedSummary } from './FindYourBedSummary';

export type WelcomeBedMapStep = 'register' | 'settlement';

/** Deep link step for bed map / settlement when tourism gate may apply (Chat F). */
export function useWelcomeBedMapStep(): WelcomeBedMapStep {
  const { settings, slug } = useTenant();
  const isRegistered = useIsGuestRegistered();
  const tourismRegistrationRequired = resolveTourismRegistrationRequired(settings);
  const [tourismComplete, setTourismComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!tourismRegistrationRequired || !isRegistered || !slug) {
      setTourismComplete(null);
      return;
    }

    let cancelled = false;
    void listTourismGuestsForSessionAction(slug).then((result) => {
      if (cancelled) {
        return;
      }
      setTourismComplete(result.ok ? result.complete : false);
    });

    return () => {
      cancelled = true;
    };
  }, [tourismRegistrationRequired, isRegistered, slug]);

  if (!tourismRegistrationRequired) {
    return 'settlement';
  }

  if (!isRegistered) {
    return 'settlement';
  }

  if (tourismComplete === true) {
    return 'settlement';
  }

  return 'register';
}

export function FindYourBedCard() {
  const t = useTranslations('components.findYourBed');
  const locale = useLocale();
  const { settings, guestBedId } = useTenant();
  const router = useRouter();
  const welcomeStep = useWelcomeBedMapStep();
  const plan = resolveGuestStayPlan(settings, guestBedId);

  if (!plan.bedId) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="mb-4 h-auto w-full justify-between gap-3 p-3 text-left"
      onClick={() =>
        router.push(
          `/${locale}${SITE_CONFIG.routes.app.welcome.path}?step=${welcomeStep}`
        )
      }
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
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
