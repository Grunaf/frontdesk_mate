'use client';

import { useTenant } from '@/entities/tenant';
import { resolveGuestStaySetupPath } from '@/features/guest-check-in';
import { useStaySetupStatus } from '@/features/guest-stay-contact';
import { useLocale, useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { useAppNavigation } from '@/shared/ui';
import { resolvePreCheckInBannerProgress } from '../lib/resolvePreCheckInBannerProgress';
import { resolveFirstIncompleteSettlementStep } from '../lib/resolveSettlementBannerProgress';
import { readStaySettlementBannerProgress } from '../model/staySettlementBannerProgressStorage';
import { useStayEssentialsConciergeBannerContext } from './StayEssentialsConciergeBannerContext';
import { StayEssentialsConciergeBannerLayout } from './StayEssentialsConciergeBannerLayout';

export function StayEssentialsSettlementBanner() {
  const slot = useStayEssentialsConciergeBannerContext();
  const { status } = useStaySetupStatus();
  const tNav = useTranslations('pages.navigation');
  const tBanner = useTranslations('components.stayEssentials.settlementBanner');
  const locale = useLocale();
  const { push, pending } = useAppNavigation();
  const { slug } = useTenant();
  const title = tNav('staySetup');

  if (!slot || slot.kind !== 'settlement') {
    return null;
  }

  const { registrationStatus, stayId } = slot;

  return (
    <StayEssentialsConciergeBannerLayout
      title={title}
      description={tBanner('description')}
      testId="stay-banner-settlement"
      totalSteps={slot.progress.totalSteps}
      completedSteps={slot.progress.completedSteps}
      pending={pending}
      onClick={() => {
        if (!slug) {
          return;
        }

        const {
          tourismRequired,
          tourismComplete,
          entryDateComplete,
          contactComplete,
        } = registrationStatus;
        const passportVerified = status?.passportVerified ?? false;
        const registrationComplete = resolvePreCheckInBannerProgress({
          tourismRequired,
          tourismComplete,
          entryDateComplete,
          contactComplete,
        }).isComplete;
        const settlementProgress = readStaySettlementBannerProgress(slug, stayId);
        const settlementStep =
          registrationComplete && passportVerified
            ? resolveFirstIncompleteSettlementStep(settlementProgress) ?? 'essentials'
            : 'registration';

        setInAppReturnTo(SITE_CONFIG.routes.app.concierge.path);
        push(
          resolveGuestStaySetupPath({
            locale,
            step: settlementStep,
            tourismRequired,
            completion: {
              tourismRequired,
              tourismComplete,
              entryDateComplete,
              contactComplete,
              passportVerified,
            },
          })
        );
      }}
    />
  );
}
