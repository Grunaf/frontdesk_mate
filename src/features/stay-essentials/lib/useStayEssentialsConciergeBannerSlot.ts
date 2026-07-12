'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useGuestSession, useIsGuestRegistered } from '@/features/guest-check-in';
import { getStaySetupStatusAction } from '@/features/guest-stay-contact';
import { useTenant } from '@/entities/tenant';
import { resolvePreCheckInBannerProgress } from './resolvePreCheckInBannerProgress';
import { resolveSettlementBannerProgress } from './resolveSettlementBannerProgress';
import {
  resolveShowPreCheckInRegistrationBanner,
  resolveShowSettlementBanner,
} from './resolveShowSettlementBanner';
import { readStaySettlementBannerProgress } from '../model/staySettlementBannerProgressStorage';

export type StayEssentialsConciergeBannerProgress = {
  totalSteps: number;
  completedSteps: number;
};

export type StayEssentialsConciergeRegistrationStatus = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  contactComplete: boolean;
};

export type StayEssentialsConciergeBannerSlot =
  | { kind: 'hidden' }
  | { kind: 'loading' }
  | {
      kind: 'preCheckIn';
      progress: StayEssentialsConciergeBannerProgress;
      registrationStatus: StayEssentialsConciergeRegistrationStatus;
    }
  | {
      kind: 'settlement';
      progress: StayEssentialsConciergeBannerProgress;
      registrationStatus: StayEssentialsConciergeRegistrationStatus;
      stayId: string;
    };

function resolveSlotFromStatus(input: {
  isRegistered: boolean;
  slug: string | null | undefined;
  stayId: string | null | undefined;
  checkInAt: string | null | undefined;
  propertyTimeZone?: string | null;
  registrationStatus: StayEssentialsConciergeRegistrationStatus;
}): StayEssentialsConciergeBannerSlot {
  const { tourismRequired, tourismComplete, contactComplete } = input.registrationStatus;
  const registrationProgress = resolvePreCheckInBannerProgress({
    tourismRequired,
    tourismComplete,
    contactComplete,
  });

  const showPreCheckIn = resolveShowPreCheckInRegistrationBanner({
    isRegistered: input.isRegistered,
    tenantSlug: input.slug,
    checkInAt: input.checkInAt,
    propertyTimeZone: input.propertyTimeZone,
    registrationComplete: registrationProgress.isComplete,
  });

  if (showPreCheckIn) {
    return {
      kind: 'preCheckIn',
      progress: {
        totalSteps: registrationProgress.totalSteps,
        completedSteps: registrationProgress.completedSteps,
      },
      registrationStatus: input.registrationStatus,
    };
  }

  const stayId = input.stayId?.trim();
  if (!stayId) {
    return { kind: 'hidden' };
  }

  const settlementProgress = readStaySettlementBannerProgress(input.slug!, stayId);
  const showSettlement = resolveShowSettlementBanner({
    isRegistered: input.isRegistered,
    tenantSlug: input.slug,
    stayId,
    checkInAt: input.checkInAt,
    propertyTimeZone: input.propertyTimeZone,
    settlementProgress,
  });

  if (!showSettlement) {
    return { kind: 'hidden' };
  }

  const resolved = resolveSettlementBannerProgress({
    ...settlementProgress,
    registrationComplete: registrationProgress.isComplete,
    registrationStatus: input.registrationStatus,
  });

  return {
    kind: 'settlement',
    progress: {
      totalSteps: resolved.totalSteps,
      completedSteps: resolved.completedSteps,
    },
    registrationStatus: input.registrationStatus,
    stayId,
  };
}

export function useStayEssentialsConciergeBannerSlot(): StayEssentialsConciergeBannerSlot {
  const pathname = usePathname();
  const { slug, hostel } = useTenant();
  const isRegistered = useIsGuestRegistered();
  const { session, checkInAt } = useGuestSession();
  const stayId = session?.stayId ?? null;

  const shouldFetch = isRegistered && Boolean(slug?.trim());

  const [slot, setSlot] = useState<StayEssentialsConciergeBannerSlot>(() =>
    shouldFetch ? { kind: 'loading' } : { kind: 'hidden' }
  );

  useEffect(() => {
    if (!shouldFetch) {
      setSlot({ kind: 'hidden' });
      return;
    }

    let cancelled = false;
    setSlot({ kind: 'loading' });

    void getStaySetupStatusAction(slug!).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setSlot({ kind: 'hidden' });
        return;
      }

      const registrationStatus: StayEssentialsConciergeRegistrationStatus = {
        tourismRequired: result.status.tourismRequired,
        tourismComplete: result.status.tourismComplete,
        contactComplete: result.status.contactComplete,
      };

      setSlot(
        resolveSlotFromStatus({
          isRegistered,
          slug,
          stayId,
          checkInAt,
          propertyTimeZone: hostel.propertyTimeZone,
          registrationStatus,
        })
      );
    });

    return () => {
      cancelled = true;
    };
  }, [shouldFetch, isRegistered, slug, stayId, checkInAt, pathname, hostel.propertyTimeZone]);

  return slot;
}
