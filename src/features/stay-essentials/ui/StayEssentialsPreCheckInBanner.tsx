'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/entities/tenant';
import { resolveGuestRegistrationPath, useGuestSession, useIsGuestRegistered } from '@/features/guest-check-in';
import { getStaySetupStatusAction } from '@/features/guest-stay-contact';
import { useLocale, useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { useAppNavigation } from '@/shared/ui';
import { resolvePreCheckInBannerProgress } from '../lib/resolvePreCheckInBannerProgress';
import { resolveShowPreCheckInRegistrationBanner } from '../lib/resolveShowSettlementBanner';
import { StayEssentialsConciergeBannerLayout } from './StayEssentialsConciergeBannerLayout';

export function StayEssentialsPreCheckInBanner() {
  const tTabs = useTranslations('pages.staySetup.tabs');
  const tBanner = useTranslations('components.stayEssentials.preCheckInBanner');
  const locale = useLocale();
  const { push, pending } = useAppNavigation();
  const { slug } = useTenant();
  const isRegistered = useIsGuestRegistered();
  const { checkInAt } = useGuestSession();
  const title = tTabs('registration');
  const [progress, setProgress] = useState<{
    totalSteps: number;
    completedSteps: number;
  } | null>(null);

  useEffect(() => {
    if (!isRegistered || !slug) {
      setProgress(null);
      return;
    }

    let cancelled = false;
    void getStaySetupStatusAction(slug).then((result) => {
      if (cancelled || !result.ok) {
        setProgress(null);
        return;
      }

      const { tourismRequired, tourismComplete, contactComplete } = result.status;
      const resolved = resolvePreCheckInBannerProgress({
        tourismRequired,
        tourismComplete,
        contactComplete,
      });

      const show = resolveShowPreCheckInRegistrationBanner({
        isRegistered,
        tenantSlug: slug,
        checkInAt,
        registrationComplete: resolved.isComplete,
      });

      if (!show) {
        setProgress(null);
        return;
      }

      setProgress({
        totalSteps: resolved.totalSteps,
        completedSteps: resolved.completedSteps,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isRegistered, slug, checkInAt]);

  if (!progress) {
    return null;
  }

  return (
    <StayEssentialsConciergeBannerLayout
      title={title}
      description={tBanner('description')}
      testId="stay-banner-registration"
      totalSteps={progress.totalSteps}
      completedSteps={progress.completedSteps}
      pending={pending}
      onClick={() => {
        setInAppReturnTo(SITE_CONFIG.routes.app.concierge.path);
        push(resolveGuestRegistrationPath({ locale }));
      }}
    />
  );
}
