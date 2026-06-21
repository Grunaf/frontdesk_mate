import type { TenantSettings } from '../model/settings';
import { resolveGuestStayPlan } from './resolveGuestStayPlan';
import {
  shouldShowSubscriptionInfoStep,
  type TenantLifecycleStatus,
} from './resolveTenantLifecycle';

export type RoomMapReadinessStepId = 'active-bed' | 'bed-exists' | 'wayfinding' | 'subscription';

export type RoomMapReadinessStepTier = 'required' | 'info';

export interface RoomMapReadinessStep {
  id: RoomMapReadinessStepId;
  label: string;
  complete: boolean;
  message?: string;
  tier: RoomMapReadinessStepTier;
}

function bedExistsInGuestStay(settings: TenantSettings, bedId: string): boolean {
  const beds = settings.guestStay?.beds ?? [];
  return beds.some(
    (bed) => bed.id === bedId || bed.topId === bedId || bed.bottomId === bedId
  );
}

function hasWayfinding(settings: TenantSettings): boolean {
  const plan = resolveGuestStayPlan(settings);
  return Boolean(
    plan.layoutBeds.length > 0 ||
      plan.room?.doorImage ||
      plan.floor?.pathHint ||
      plan.floor?.pathImage
  );
}

export function resolveRoomMapReadiness(input: {
  settings: TenantSettings;
  lifecycleStatus?: TenantLifecycleStatus;
}): RoomMapReadinessStep[] {
  const { settings, lifecycleStatus } = input;
  const bedId = settings.highlightedBedId?.trim() ?? '';
  const steps: RoomMapReadinessStep[] = [];

  steps.push({
    id: 'active-bed',
    label: 'Preview guest bed',
    complete: Boolean(bedId),
    message: bedId ? undefined : 'Choose preview bed on the map',
    tier: 'required',
  });

  if (bedId) {
    const exists = bedExistsInGuestStay(settings, bedId);
    steps.push({
      id: 'bed-exists',
      label: 'Bed exists in room map',
      complete: exists,
      message: exists ? undefined : 'Preview bed not found on map — pick from the list',
      tier: 'required',
    });
  }

  steps.push({
    id: 'wayfinding',
    label: 'Wayfinding content',
    complete: hasWayfinding(settings),
    message: hasWayfinding(settings)
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
