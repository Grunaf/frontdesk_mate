'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  resolveGuestStaySetupPath,
  resolveStaySetupDeepLinkStep,
} from '@/features/guest-check-in/lib/resolveGuestStaySetupPath';
import { getStaySetupStatusAction } from '@/features/guest-stay-contact';
import { resolveGuestStayPlan, resolveTourismRegistrationRequired, useTenant } from '@/entities/tenant';
import { useIsGuestRegistered } from '@/features/guest-check-in';
import { useTranslations, useLocale } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { ArrowRight } from 'lucide-react';
import { FindYourBedSummary } from './FindYourBedSummary';

/** Deep link step for bed map / settlement when stay-setup gates may apply. */
export function useStaySetupBedMapStep(): 'register' | 'contact' | 'settlement' {
  const { settings, slug } = useTenant();
  const isRegistered = useIsGuestRegistered();
  const tourismRegistrationRequired = resolveTourismRegistrationRequired(settings);
  const [status, setStatus] = useState<{
    tourismComplete: boolean;
    contactComplete: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isRegistered || !slug) {
      setStatus(null);
      return;
    }

    let cancelled = false;
    void getStaySetupStatusAction(slug).then((result) => {
      if (cancelled || !result.ok) {
        return;
      }
      setStatus({
        tourismComplete: result.status.tourismComplete,
        contactComplete: result.status.contactComplete,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isRegistered, slug]);

  return resolveStaySetupDeepLinkStep({
    tourismRequired: tourismRegistrationRequired,
    tourismComplete: status?.tourismComplete ?? false,
    contactComplete: status?.contactComplete ?? false,
    preferSettlement: true,
  });
}

/** @deprecated Use useStaySetupBedMapStep */
export function useWelcomeBedMapStep(): 'register' | 'contact' | 'settlement' {
  return useStaySetupBedMapStep();
}

export function FindYourBedCard() {
  const t = useTranslations('components.findYourBed');
  const locale = useLocale();
  const { settings, guestBedId } = useTenant();
  const router = useRouter();
  const staySetupStep = useStaySetupBedMapStep();
  const tourismRegistrationRequired = resolveTourismRegistrationRequired(settings);
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
          resolveGuestStaySetupPath({
            locale,
            step: staySetupStep,
            tourismRequired: tourismRegistrationRequired,
            completion: {
              tourismRequired: tourismRegistrationRequired,
              tourismComplete: false,
              contactComplete: false,
            },
          })
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
