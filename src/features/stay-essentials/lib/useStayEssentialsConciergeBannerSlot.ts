'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useGuestSession, useIsGuestRegistered } from '@/features/guest-check-in';
import { useStaySetupStatus, type StaySetupStatus } from '@/features/guest-stay-contact';
import { useTenant } from '@/entities/tenant';
import { resolvePreCheckInBannerProgress } from './resolvePreCheckInBannerProgress';
import { resolveSettlementBannerProgress } from './resolveSettlementBannerProgress';
import {
  resolveShowPreCheckInRegistrationBanner,
  resolveShowSettlementBanner,
} from './resolveShowSettlementBanner';
import { readStaySettlementBannerProgress } from '../model/staySettlementBannerProgressStorage';

/** SSR + hydration: false; after hydrate: true (re-render). Avoids localStorage show/hide mismatch. */
function subscribeToClientMount() {
  return () => {};
}

function getClientMountSnapshot() {
  return true;
}

function getServerMountSnapshot() {
  return false;
}

function useCanReadSettlementStorage(): boolean {
  return useSyncExternalStore(
    subscribeToClientMount,
    getClientMountSnapshot,
    getServerMountSnapshot
  );
}

export type StayEssentialsConciergeBannerProgress = {
  totalSteps: number;
  completedSteps: number;
};

export type StayEssentialsConciergeRegistrationStatus = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  entryDateComplete: boolean;
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

function toRegistrationStatus(
  status: Pick<
    StaySetupStatus,
    'tourismRequired' | 'tourismComplete' | 'entryDateComplete' | 'contactComplete'
  >
): StayEssentialsConciergeRegistrationStatus {
  return {
    tourismRequired: status.tourismRequired,
    tourismComplete: status.tourismComplete,
    entryDateComplete: status.entryDateComplete,
    contactComplete: status.contactComplete,
  };
}

function resolveSlotFromStatus(input: {
  isRegistered: boolean;
  slug: string | null | undefined;
  stayId: string | null | undefined;
  checkInAt: string | null | undefined;
  propertyTimeZone?: string | null;
  registrationStatus: StayEssentialsConciergeRegistrationStatus;
  canReadSettlementStorage: boolean;
}): StayEssentialsConciergeBannerSlot {
  const { tourismRequired, tourismComplete, entryDateComplete, contactComplete } =
    input.registrationStatus;
  const registrationProgress = resolvePreCheckInBannerProgress({
    tourismRequired,
    tourismComplete,
    entryDateComplete,
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

  // localStorage differs SSR vs client — wait for post-hydrate snapshot before show/hide.
  if (!input.canReadSettlementStorage) {
    return { kind: 'loading' };
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

/** Derives concierge banner slot from shared StaySetupStatus context (SSR + revalidate). */
export function useStayEssentialsConciergeBannerSlot(): StayEssentialsConciergeBannerSlot {
  const { slug, hostel } = useTenant();
  const isRegistered = useIsGuestRegistered();
  const { session, checkInAt } = useGuestSession();
  const stayId = session?.stayId ?? null;
  const { status, statusLoading } = useStaySetupStatus();
  const canReadSettlementStorage = useCanReadSettlementStorage();

  return useMemo(() => {
    if (!isRegistered || !slug?.trim()) {
      return { kind: 'hidden' };
    }

    if (statusLoading && status == null) {
      return { kind: 'loading' };
    }

    if (!status) {
      return { kind: 'hidden' };
    }

    return resolveSlotFromStatus({
      isRegistered,
      slug,
      stayId,
      checkInAt,
      propertyTimeZone: hostel.propertyTimeZone,
      registrationStatus: toRegistrationStatus(status),
      canReadSettlementStorage,
    });
  }, [
    isRegistered,
    slug,
    stayId,
    checkInAt,
    hostel.propertyTimeZone,
    status,
    statusLoading,
    canReadSettlementStorage,
  ]);
}
