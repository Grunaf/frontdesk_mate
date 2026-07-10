'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveGuestExtras } from '@/entities/guest-extra';
import { hasNightDoorCodes, useHostelConfig, useModuleStatus, useTenant } from '@/entities/tenant';
import {
  shouldShowPreTripLuggage,
  shouldShowTimedGuestBanner,
} from '@/entities/tenant/lib/resolveGuestFieldPresentation';
import { useGuestSession, useIsGuestRegistered } from '@/features/guest-check-in';
import { useNightMode } from '@/shared/lib';
import { resolveAnonymousStayEssentialBridgeIds } from '../model/resolveAnonymousStayEssentialBridges';
import { hasStayEssentialContactBridgeContent } from '../model/resolveStayEssentialContactContent';
import { readNightAccessDismissed, persistNightAccessDismissed } from '../model/nightAccessDismiss';
import { resolveShowNightAccessBridge } from '../model/resolveShowNightAccessBridge';
import { STAY_ESSENTIAL_BRIDGE_ORDER } from '../model/types';
import { useStayEssentialReadState } from '../model/useStayEssentialReadState';
import type { StayEssentialBridgeId } from '../model/types';
import { StayEssentialSheetStub } from './StayEssentialSheetStub';
import { StayEssentialsArrivalTile } from './StayEssentialsArrivalTile';
import { StayEssentialsBridgeCard } from './StayEssentialsBridgeCard';
import { StayEssentialsCheckoutSheet } from './StayEssentialsCheckoutSheet';
import { StayEssentialsNightAccessSheet } from './StayEssentialsNightAccessSheet';
import { StayEssentialsReceptionSheet } from './StayEssentialsReceptionSheet';
import { StayEssentialsContactSheet } from './StayEssentialsContactSheet';
import { StayEssentialsWifiSheet } from './StayEssentialsWifiSheet';

function StayEssentialBridgeItem({
  bridgeId,
  onNightDismiss,
}: {
  bridgeId: StayEssentialBridgeId;
  onNightDismiss?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { isRead, markRead } = useStayEssentialReadState(bridgeId);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        markRead();
      }

      setOpen(nextOpen);
    },
    [markRead]
  );

  return (
    <>
      <StayEssentialsBridgeCard
        bridgeId={bridgeId}
        isRead={isRead}
        onOpen={() => handleOpenChange(true)}
      />
      {bridgeId === 'wifi' ? (
        <StayEssentialsWifiSheet open={open} onOpenChange={handleOpenChange} />
      ) : bridgeId === 'checkout' ? (
        <StayEssentialsCheckoutSheet open={open} onOpenChange={handleOpenChange} />
      ) : bridgeId === 'nightAccess' ? (
        <StayEssentialsNightAccessSheet
          open={open}
          onOpenChange={handleOpenChange}
          onDismiss={onNightDismiss ?? (() => undefined)}
        />
      ) : bridgeId === 'reception' ? (
        <StayEssentialsReceptionSheet open={open} onOpenChange={handleOpenChange} />
      ) : bridgeId === 'contact' ? (
        <StayEssentialsContactSheet open={open} onOpenChange={handleOpenChange} />
      ) : (
        <StayEssentialSheetStub bridgeId={bridgeId} open={open} onOpenChange={handleOpenChange} />
      )}
    </>
  );
}

export function StayEssentialsBridges() {
  const isRegistered = useIsGuestRegistered();
  const { session, checkInAt, currentTenantSlug } = useGuestSession();
  const { settings } = useTenant();
  const hostel = useHostelConfig();
  const isNightMode = useNightMode();
  const nightAccessStatus = useModuleStatus('nightAccess');
  const stayId = session?.stayId ?? null;
  const [nightDismissed, setNightDismissed] = useState(false);

  useEffect(() => {
    if (currentTenantSlug && stayId) {
      setNightDismissed(readNightAccessDismissed(currentTenantSlug, stayId));
      return;
    }

    setNightDismissed(false);
  }, [currentTenantSlug, stayId]);

  const wifiName = hostel.wifi.name?.trim();
  const wifiPassword = hostel.wifi.password?.trim();
  const hasWifiCredentials = Boolean(wifiName && wifiPassword);
  const hasCheckoutContent = useMemo(() => {
    const checkOutTime = hostel.checkOutTime?.trim();
    const showLuggage = shouldShowPreTripLuggage(settings);
    const hasLateCheckout = resolveGuestExtras(settings).some(
      (extra) => extra.presetId === 'late_checkout'
    );

    return Boolean(checkOutTime || showLuggage || hasLateCheckout);
  }, [hostel.checkOutTime, settings]);

  const hasReceptionContent = useMemo(() => {
    const receptionOpen = hostel.reception.time.open?.trim();
    const receptionClose = hostel.reception.time.close?.trim();
    const availabilityHint = hostel.reception.availabilityHint?.trim();

    return Boolean(
      (receptionOpen && receptionClose) ||
        availabilityHint ||
        hostel.reception.canHelpWithTaxi ||
        shouldShowPreTripLuggage(settings) ||
        shouldShowTimedGuestBanner(hostel.selfCheckInTimeAfter)
    );
  }, [hostel.reception, hostel.selfCheckInTimeAfter, settings]);

  const hasContactContent = useMemo(
    () => hasStayEssentialContactBridgeContent(hostel),
    [hostel]
  );

  const showNightAccessBridge = useMemo(
    () =>
      resolveShowNightAccessBridge({
        settings,
        checkInAt,
        isNightMode,
        isRegistered,
        nightAccessEnabled: nightAccessStatus !== 'hidden',
        hasNightDoorCodes: hasNightDoorCodes(settings),
        keyIssuedAt:
          session && 'keyIssuedAt' in session
            ? (session as typeof session & { keyIssuedAt?: string | null }).keyIssuedAt
            : undefined,
        nightAccessDismissed: nightDismissed,
      }),
    [
      checkInAt,
      isNightMode,
      isRegistered,
      nightAccessStatus,
      nightDismissed,
      session,
      settings,
    ]
  );

  const handleNightDismiss = useCallback(() => {
    if (!currentTenantSlug || !stayId) {
      return;
    }

    persistNightAccessDismissed(currentTenantSlug, stayId);
    setNightDismissed(true);
  }, [currentTenantSlug, stayId]);

  const visibleBridges = useMemo(() => {
    if (!isRegistered) {
      return resolveAnonymousStayEssentialBridgeIds({
        hasReceptionContent,
        hasContactContent,
      });
    }

    return STAY_ESSENTIAL_BRIDGE_ORDER.filter((bridgeId) => {
      if (bridgeId === 'wifi') {
        return hasWifiCredentials;
      }

      if (bridgeId === 'checkout') {
        return hasCheckoutContent;
      }

      if (bridgeId === 'nightAccess') {
        return showNightAccessBridge;
      }

      if (bridgeId === 'reception') {
        return hasReceptionContent;
      }

      if (bridgeId === 'contact') {
        return hasContactContent;
      }

      return true;
    });
  }, [
    hasCheckoutContent,
    hasContactContent,
    hasReceptionContent,
    hasWifiCredentials,
    isRegistered,
    showNightAccessBridge,
  ]);

  return (
    <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max snap-x snap-mandatory gap-2 pr-4">
        <StayEssentialsArrivalTile />
        {visibleBridges.map((bridgeId) => (
          <StayEssentialBridgeItem
            key={bridgeId}
            bridgeId={bridgeId}
            onNightDismiss={bridgeId === 'nightAccess' ? handleNightDismiss : undefined}
          />
        ))}
      </div>
    </div>
  );
}
