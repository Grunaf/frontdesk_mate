'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/entities/tenant';
import { resolveGuestRegistrationPath, useIsGuestRegistered } from '@/features/guest-check-in';
import { getStaySetupStatusAction } from '@/features/guest-stay-contact';
import { useLocale, useTranslations } from '@/shared/i18n';
import { SITE_CONFIG } from '@/shared/config';
import { setInAppReturnTo } from '@/shared/lib';
import { pressableTileActiveClass, StepRingProgress, useAppNavigation } from '@/shared/ui';
import { cn } from '@/shared/lib/utils';
import { resolvePreCheckInBannerProgress } from '../lib/resolvePreCheckInBannerProgress';

export function StayEssentialsPreCheckInBanner() {
  const tTabs = useTranslations('pages.staySetup.tabs');
  const tBanner = useTranslations('components.stayEssentials.preCheckInBanner');
  const locale = useLocale();
  const { push, pending } = useAppNavigation();
  const { slug } = useTenant();
  const isRegistered = useIsGuestRegistered();
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

      if (resolved.isComplete) {
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
  }, [isRegistered, slug]);

  if (!progress) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label={title}
      data-testid="stay-banner-registration"
      onClick={() => {
        setInAppReturnTo(SITE_CONFIG.routes.app.concierge.path);
        push(resolveGuestRegistrationPath({ locale }));
      }}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-left transition-colors hover:bg-muted/60',
        pressableTileActiveClass,
        pending && 'pointer-events-none opacity-80'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
          {tBanner('description')}
        </span>
      </span>
      <StepRingProgress
        totalSteps={progress.totalSteps}
        completedSteps={progress.completedSteps}
        aria-label={`${progress.completedSteps} of ${progress.totalSteps}`}
      />
    </button>
  );
}
