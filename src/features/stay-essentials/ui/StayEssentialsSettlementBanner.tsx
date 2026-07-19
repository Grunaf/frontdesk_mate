'use client';

import { useTenant } from '@/entities/tenant';
import {
  resolveGuestStaySetupPath,
  useGuestSession,
} from '@/features/guest-check-in';
import { getStaySetupStatusAction } from '@/features/guest-stay-contact';
import { useLocale, useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { useAppNavigation } from '@/shared/ui';
import { resolvePreCheckInBannerProgress } from '../lib/resolvePreCheckInBannerProgress';
import {
  resolveFirstIncompleteSettlementStep,
  resolveSettlementBannerProgress,
} from '../lib/resolveSettlementBannerProgress';
import { readStaySettlementBannerProgress } from '../model/staySettlementBannerProgressStorage';
import { useStayEssentialsConciergeBannerContext } from './StayEssentialsConciergeBannerContext';
import { StayEssentialsConciergeBannerLayout } from './StayEssentialsConciergeBannerLayout';

export function StayEssentialsSettlementBanner() {
  const slot = useStayEssentialsConciergeBannerContext();
  const tNav = useTranslations('pages.navigation');
  const tBanner = useTranslations('components.stayEssentials.settlementBanner');
  const locale = useLocale();
  const { push, pending } = useAppNavigation();
  const { slug } = useTenant();
  const { session } = useGuestSession();
  const stayId = session?.stayId ?? null;
  const title = tNav('staySetup');

  if (!slot || slot.kind !== 'settlement') {
    return null;
  }

  return (
    <StayEssentialsConciergeBannerLayout
      title={title}
      description={tBanner('description')}
      testId="stay-banner-settlement"
      totalSteps={slot.progress.totalSteps}
      completedSteps={slot.progress.completedSteps}
      pending={pending}
      onClick={() => {
        if (!slug || !stayId) {
          return;
        }

        void getStaySetupStatusAction(slug).then((result) => {
          if (!result.ok) {
            return;
          }

          const { tourismRequired, tourismComplete, contactComplete, passportVerified } =
            result.status;
          const registrationComplete = resolvePreCheckInBannerProgress({
            tourismRequired,
            tourismComplete,
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
                contactComplete,
                passportVerified,
              },
            })
          );
        });
      }}
    />
  );
}
