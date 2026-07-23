'use client';

import { resolveGuestStaySetupPath } from '@/features/guest-check-in';
import { useLocale, useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { useAppNavigation } from '@/shared/ui';
import { useStayEssentialsConciergeBannerContext } from './StayEssentialsConciergeBannerContext';
import { StayEssentialsConciergeBannerLayout } from './StayEssentialsConciergeBannerLayout';

export function StayEssentialsPreCheckInBanner() {
  const slot = useStayEssentialsConciergeBannerContext();
  const tTabs = useTranslations('pages.staySetup.tabs');
  const tBanner = useTranslations('components.stayEssentials.preCheckInBanner');
  const locale = useLocale();
  const { push, pending } = useAppNavigation();
  const title = tTabs('registration');

  if (!slot || slot.kind !== 'preCheckIn') {
    return null;
  }

  const { registrationStatus } = slot;

  return (
    <StayEssentialsConciergeBannerLayout
      title={title}
      description={tBanner('description')}
      testId="stay-banner-registration"
      totalSteps={slot.progress.totalSteps}
      completedSteps={slot.progress.completedSteps}
      pending={pending}
      onClick={() => {
        setInAppReturnTo(SITE_CONFIG.routes.app.concierge.path);
        push(
          resolveGuestStaySetupPath({
            locale,
            step: 'registration',
            tourismRequired: registrationStatus.tourismRequired,
            completion: {
              tourismRequired: registrationStatus.tourismRequired,
              tourismComplete: registrationStatus.tourismComplete,
              entryDateComplete: registrationStatus.entryDateComplete,
              contactComplete: registrationStatus.contactComplete,
              passportVerified: false,
            },
          })
        );
      }}
    />
  );
}
