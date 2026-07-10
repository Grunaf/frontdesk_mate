'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTenant } from '@/entities/tenant';
import {
  resolveGuestStaySetupPath,
  useGuestSession,
  useIsGuestRegistered,
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
import { resolveShowSettlementBanner } from '../lib/resolveShowSettlementBanner';
import { readStaySettlementBannerProgress } from '../model/staySettlementBannerProgressStorage';
import { StayEssentialsConciergeBannerLayout } from './StayEssentialsConciergeBannerLayout';

export function StayEssentialsSettlementBanner() {
  const tNav = useTranslations('pages.navigation');
  const tBanner = useTranslations('components.stayEssentials.settlementBanner');
  const locale = useLocale();
  const pathname = usePathname();
  const { push, pending } = useAppNavigation();
  const { slug } = useTenant();
  const isRegistered = useIsGuestRegistered();
  const { session, checkInAt } = useGuestSession();
  const stayId = session?.stayId ?? null;
  const title = tNav('staySetup');

  const [progress, setProgress] = useState<{
    totalSteps: number;
    completedSteps: number;
  } | null>(null);

  useEffect(() => {
    if (!isRegistered || !slug || !stayId) {
      setProgress(null);
      return;
    }

    let cancelled = false;

    void getStaySetupStatusAction(slug).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setProgress(null);
        return;
      }

      const { tourismRequired, tourismComplete, contactComplete } = result.status;
      const registrationComplete = resolvePreCheckInBannerProgress({
        tourismRequired,
        tourismComplete,
        contactComplete,
      }).isComplete;

      const settlementProgress = readStaySettlementBannerProgress(slug, stayId);

      const show = resolveShowSettlementBanner({
        isRegistered,
        tenantSlug: slug,
        stayId,
        checkInAt,
        settlementProgress,
      });

      if (!show) {
        setProgress(null);
        return;
      }

      const resolved = resolveSettlementBannerProgress({
        ...settlementProgress,
        registrationComplete,
        registrationStatus: {
          tourismRequired,
          tourismComplete,
          contactComplete,
        },
      });
      setProgress({
        totalSteps: resolved.totalSteps,
        completedSteps: resolved.completedSteps,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isRegistered, slug, stayId, checkInAt, pathname]);

  if (!progress) {
    return null;
  }

  return (
    <StayEssentialsConciergeBannerLayout
      title={title}
      description={tBanner('description')}
      testId="stay-banner-settlement"
      totalSteps={progress.totalSteps}
      completedSteps={progress.completedSteps}
      pending={pending}
      onClick={() => {
        void getStaySetupStatusAction(slug!).then((result) => {
          if (!result.ok) {
            return;
          }

          const { tourismRequired, tourismComplete, contactComplete } = result.status;
          const registrationComplete = resolvePreCheckInBannerProgress({
            tourismRequired,
            tourismComplete,
            contactComplete,
          }).isComplete;
          const settlementProgress = readStaySettlementBannerProgress(slug!, stayId!);
          const settlementStep = registrationComplete
            ? resolveFirstIncompleteSettlementStep(settlementProgress) ?? undefined
            : undefined;

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
              },
            })
          );
        });
      }}
    />
  );
}
