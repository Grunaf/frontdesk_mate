import { stayBedHasLayout } from '@/entities/room/model/room-layout';
import type { TenantSettings } from '../model/settings';
import {
  shouldShowSubscriptionInfoStep,
  type TenantLifecycleStatus,
} from './resolveTenantLifecycle';

export type RoomMapReadinessStepId = 'bed-exists' | 'wayfinding' | 'subscription';

export type RoomMapReadinessStepTier = 'required' | 'info';

export interface RoomMapReadinessStep {
  id: RoomMapReadinessStepId;
  label: string;
  complete: boolean;
  message?: string;
  tier: RoomMapReadinessStepTier;
}

function hasGuestStayBeds(settings: TenantSettings): boolean {
  return (settings.guestStay?.beds?.length ?? 0) > 0;
}

function hasStructuralWayfinding(settings: TenantSettings): boolean {
  const stay = settings.guestStay;
  if (!stay) return false;

  const bedsOnMap = (stay.beds ?? []).some((bed) => stayBedHasLayout(bed));
  if (bedsOnMap) return true;

  const floorPath = (stay.floors ?? []).some(
    (floor) => floor.pathHint?.trim() || floor.pathImage?.trim()
  );
  if (floorPath) return true;

  return (stay.rooms ?? []).some((room) => room.doorImage?.trim());
}

export function resolveRoomMapReadiness(input: {
  settings: TenantSettings;
  lifecycleStatus?: TenantLifecycleStatus;
}): RoomMapReadinessStep[] {
  const { settings, lifecycleStatus } = input;
  const steps: RoomMapReadinessStep[] = [];

  const bedsExist = hasGuestStayBeds(settings);
  steps.push({
    id: 'bed-exists',
    label: 'Beds on room map',
    complete: bedsExist,
    message: bedsExist ? undefined : 'Add at least one bed in a room below',
    tier: 'required',
  });

  const wayfindingReady = hasStructuralWayfinding(settings);
  steps.push({
    id: 'wayfinding',
    label: 'Wayfinding content',
    complete: wayfindingReady,
    message: wayfindingReady
      ? undefined
      : 'Place beds on map OR add floor path / room door photo',
    tier: 'required',
  });

  if (lifecycleStatus && shouldShowSubscriptionInfoStep(lifecycleStatus)) {
    steps.push({
      id: 'subscription',
      label: 'Subscription active',
      complete: lifecycleStatus === 'active',
      message:
        lifecycleStatus === 'active'
          ? undefined
          : 'Subscription must be active for guests to see the app',
      tier: 'info',
    });
  }

  return steps;
}

export function getFirstRoomMapReadinessGap(settings: TenantSettings): string | undefined {
  const step = resolveRoomMapReadiness({ settings }).find(
    (entry) => !entry.complete && entry.tier === 'required'
  );
  return step?.message;
}

export function isRoomMapReady(settings: TenantSettings): boolean {
  return resolveRoomMapReadiness({ settings })
    .filter((step) => step.tier === 'required')
    .every((step) => step.complete);
}
