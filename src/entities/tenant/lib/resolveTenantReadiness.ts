import { resolveHouseRulesReady, resolveHouseRulesReadyDetail } from '@/entities/house-rules';
import type { CityPackGateSnapshot } from '@/entities/city-pack';
import type { CityPackContent } from '@/entities/city-pack/model/types';
import { resolveCityPackHasPlacesForTenant } from '@/entities/city-pack/lib/resolveCityPackGateForTenant';
import type { CityPackId } from '@/entities/hostel';
import { isRoomMapModuleEnabled } from './resolveGuestModuleToggles';
import { hasDoorAccessConfigured } from './resolveArrivalAccessPlan';
import { readBookingSettings } from './resolveBookingConfig';
import { resolveCapabilities } from './resolveCapabilities';
import {
  isGuestAppModuleReady,
  resolveGuestAppModules,
  type GuestAppModuleId,
} from './resolveGuestAppModules';
import { hasLandingContent } from './resolveLandingRooms';
import { resolveArrivalWalkReadiness } from '@/entities/city-pack/lib/resolveArrivalTransportReadiness';
import { needsLandingBookingEngine } from './resolveLandingBookingGap';
import {
  resolveTenantLifecycleStatus,
  type TenantLifecycleStatus,
} from './resolveTenantLifecycle';
import type { TenantSettings } from '../model/settings';

export type TenantReadinessSectionId =
  | 'identity'
  | 'subscription'
  | 'landing'
  | 'booking'
  | 'arrival-journey'
  | 'guest-app'
  | 'wifi'
  | 'contacts';

export type TenantReadinessTier = 'blocker' | 'recommended';

export type TenantReadinessItemStatus = 'complete' | 'incomplete';

export type TenantReadinessSurface = 'checklist' | 'section';

export interface TenantReadinessItem {
  id: string;
  sectionId: TenantReadinessSectionId;
  label: string;
  tier: TenantReadinessTier;
  status: TenantReadinessItemStatus;
  detail?: string;
  surface?: TenantReadinessSurface;
}

export type TenantCriticalField =
  | 'slug'
  | 'name'
  | 'checkInTime'
  | 'heroBgUrl'
  | 'wifiName'
  | 'wifiPassword'
  | 'phoneRaw'
  | 'address'
  | 'bookingEngineId'
  | 'bookingUrl'
  | 'highlightedBedId'
  | 'houseRules';

export interface TenantReadinessInput {
  slug?: string;
  name?: string;
  cityPackId: CityPackId;
  settings: TenantSettings;
  lifecycleStatus: TenantLifecycleStatus;
  cityPackHasPlaces?: boolean;
  cityPackGateSnapshot?: CityPackGateSnapshot;
  cityPackContent?: CityPackContent;
}

function resolveReadinessCityPackHasPlaces(input: TenantReadinessInput): boolean | undefined {
  if (input.cityPackHasPlaces != null) {
    return input.cityPackHasPlaces;
  }

  if (input.cityPackGateSnapshot) {
    return resolveCityPackHasPlacesForTenant(input.cityPackId, input.cityPackGateSnapshot);
  }

  return undefined;
}

function buildGuestAppModuleInput(input: TenantReadinessInput) {
  return {
    cityPackId: input.cityPackId,
    settings: input.settings,
    cityPackHasPlaces: resolveReadinessCityPackHasPlaces(input),
    cityPackGateSnapshot: input.cityPackGateSnapshot,
  };
}

function item(
  partial: Omit<TenantReadinessItem, 'status'> & { complete: boolean }
): TenantReadinessItem {
  return {
    id: partial.id,
    sectionId: partial.sectionId,
    label: partial.label,
    tier: partial.tier,
    detail: partial.detail,
    surface: partial.surface ?? 'checklist',
    status: partial.complete ? 'complete' : 'incomplete',
  };
}

function resolveBookingChecklistItem(
  settings: TenantSettings
): TenantReadinessItem | null {
  const booking = readBookingSettings(settings);
  const landingNeedsBooking = needsLandingBookingEngine(settings);
  const providerEnabled = booking.provider !== 'none';

  if (!providerEnabled && !landingNeedsBooking) {
    return null;
  }

  const providerConfigured = Boolean(booking.engineId?.trim() || booking.url?.trim());
  const complete = providerEnabled ? providerConfigured && !landingNeedsBooking : !landingNeedsBooking;

  let detail: string | undefined;
  if (!complete) {
    if (landingNeedsBooking && !providerEnabled) {
      detail = 'Enable booking provider and property ID so room cards get Book buttons';
    } else if (providerEnabled && !providerConfigured) {
      detail = `Set ${booking.provider} property ID or custom URL`;
    } else if (landingNeedsBooking) {
      detail = 'Room cards need a booking engine — configure provider and property ID';
    }
  }

  return item({
    id: 'booking-engine',
    sectionId: 'booking',
    label: 'Booking engine',
    tier: 'recommended',
    complete,
    detail,
  });
}

export function resolveTenantReadiness(input: TenantReadinessInput): TenantReadinessItem[] {
  const { settings, lifecycleStatus, cityPackId } = input;
  const slug = input.slug?.trim() ?? '';
  const name = input.name?.trim() ?? '';
  const guestAppModuleInput = buildGuestAppModuleInput(input);
  const arrivalWalkReadiness = resolveArrivalWalkReadiness({
    cityPackId,
    settings,
    cityPackContent: input.cityPackContent,
  });
  const capabilities = resolveCapabilities({
    cityPackId,
    settings,
    lifecycleStatus,
    cityPackHasPlaces: guestAppModuleInput.cityPackHasPlaces,
  });

  const subscriptionItem =
    lifecycleStatus === 'active'
      ? item({
          id: 'subscription-live',
          sectionId: 'subscription',
          label: 'Subscription active',
          tier: 'blocker',
          complete: true,
        })
      : null;

  const items: TenantReadinessItem[] = [
    ...(subscriptionItem ? [subscriptionItem] : []),
    item({
      id: 'identity',
      sectionId: 'identity',
      label: 'Slug and display name',
      tier: 'blocker',
      complete: Boolean(slug && name),
      detail: !slug ? 'Slug is required' : !name ? 'Display name is required' : undefined,
    }),
    item({
      id: 'check-in-time',
      sectionId: 'contacts',
      label: 'Check-in time',
      tier: 'recommended',
      complete: Boolean(settings.checkInTime?.trim()),
    }),
    item({
      id: 'wifi',
      sectionId: 'wifi',
      label: 'WiFi name and password',
      tier: 'recommended',
      complete: Boolean(settings.wifi?.name?.trim() && settings.wifi?.password?.trim()),
    }),
    item({
      id: 'reception-phone',
      sectionId: 'contacts',
      label: 'Reception phone',
      tier: 'recommended',
      complete: Boolean(settings.contacts?.phoneRaw?.trim()),
    }),
    item({
      id: 'address',
      sectionId: 'arrival-journey',
      label: 'Address',
      tier: 'recommended',
      complete: Boolean(settings.contacts?.address?.trim()),
    }),
    item({
      id: 'arrival-walk',
      sectionId: 'arrival-journey',
      label: 'Arrival walk directions',
      tier: 'blocker',
      complete: arrivalWalkReadiness.complete,
      detail: arrivalWalkReadiness.detail,
    }),
    item({
      id: 'door-access',
      sectionId: 'arrival-journey',
      label: 'Door access configured',
      tier: 'recommended',
      complete: hasDoorAccessConfigured(settings),
      detail: 'Add access points with codes or paths',
    }),
    item({
      id: 'landing-content',
      sectionId: 'landing',
      label: 'Landing page content',
      tier: 'recommended',
      complete: hasLandingContent(settings),
      detail: 'Hero image or bookable room types',
    }),
  ];

  const bookingItem = resolveBookingChecklistItem(settings);
  if (bookingItem) {
    items.push(bookingItem);
  }

  items.push(
    item({
      id: 'guest-room-map',
      sectionId: 'guest-app',
      label: 'Guest app — room map',
      tier: 'recommended',
      complete: capabilities.roomMap === 'ready',
      detail: isGuestAppModuleReady('roomMap', guestAppModuleInput)
        ? undefined
        : 'Choose preview bed and add wayfinding content',
      surface: 'section',
    }),
    item({
      id: 'guest-house-rules',
      sectionId: 'guest-app',
      label: 'Guest app — house rules',
      tier: 'recommended',
      complete: capabilities.faq === 'ready',
      detail: resolveHouseRulesReadyDetail(settings) ?? 'Add at least one house rule',
      surface: 'section',
    }),
    item({
      id: 'guest-local-guide',
      sectionId: 'guest-app',
      label: 'Guest app — local guide',
      tier: 'recommended',
      complete: capabilities.localGuide === 'ready',
      detail: 'Choose a city pack with places in Identity',
      surface: 'section',
    })
  );

  return sortReadinessItems(items);
}

export function resolveTenantChecklistItems(input: TenantReadinessInput): TenantReadinessItem[] {
  return resolveTenantReadiness(input).filter((entry) => entry.surface !== 'section');
}

const GUEST_MODULE_ITEM_IDS: Record<GuestAppModuleId, string> = {
  roomMap: 'guest-room-map',
  houseRules: 'guest-house-rules',
  localGuide: 'guest-local-guide',
};

export function resolveTenantModuleItems(input: TenantReadinessInput): TenantReadinessItem[] {
  return resolveTenantReadiness(input).filter((entry) => entry.surface === 'section');
}

export interface TenantModuleSummary {
  liveCount: number;
  trackedCount: number;
  gapCount: number;
  incompleteModules: TenantReadinessItem[];
}

export function getTenantModuleSummary(input: TenantReadinessInput): TenantModuleSummary {
  const guestModules = resolveGuestAppModules(buildGuestAppModuleInput(input));
  const tracked = guestModules.filter((module) => module.status !== 'hidden');
  const liveCount = tracked.filter((module) => module.status === 'ready').length;
  const trackedItemIds = new Set(tracked.map((module) => GUEST_MODULE_ITEM_IDS[module.id]));
  const incompleteModules = resolveTenantModuleItems(input).filter(
    (item) => trackedItemIds.has(item.id) && item.status === 'incomplete'
  );

  return {
    liveCount,
    trackedCount: tracked.length,
    gapCount: tracked.length - liveCount,
    incompleteModules,
  };
}

export interface TenantSetupSummaries {
  config: ReturnType<typeof getTenantReadinessSummary>;
  modules: TenantModuleSummary;
}

export function getTenantSetupSummaries(input: TenantReadinessInput): TenantSetupSummaries {
  const configItems = resolveTenantChecklistItems(input);
  return {
    config: getTenantReadinessSummary(configItems),
    modules: getTenantModuleSummary(input),
  };
}

function sortReadinessItems(items: TenantReadinessItem[]): TenantReadinessItem[] {
  return items.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier === 'blocker' ? -1 : 1;
    }
    if (a.status !== b.status) {
      return a.status === 'incomplete' ? -1 : 1;
    }
    return a.label.localeCompare(b.label);
  });
}

export function getTenantReadinessSummary(items: TenantReadinessItem[]): {
  completeCount: number;
  totalCount: number;
  incompleteItems: TenantReadinessItem[];
  blockerIncomplete: TenantReadinessItem[];
} {
  const completeCount = items.filter((entry) => entry.status === 'complete').length;
  const incompleteItems = items.filter((entry) => entry.status === 'incomplete');
  const blockerIncomplete = incompleteItems.filter((entry) => entry.tier === 'blocker');

  return {
    completeCount,
    totalCount: items.length,
    incompleteItems,
    blockerIncomplete,
  };
}

export function buildTenantReadinessInput(input: {
  slug?: string;
  name?: string;
  cityPackId: CityPackId;
  settings: TenantSettings;
  archived_at?: string | null;
  subscription_starts_at?: string | null;
  subscription_ends_at?: string | null;
  is_active?: boolean;
  cityPackHasPlaces?: boolean;
  cityPackGateSnapshot?: CityPackGateSnapshot;
  cityPackContent?: CityPackContent;
}): TenantReadinessInput {
  const lifecycleStatus = resolveTenantLifecycleStatus({
    archived_at: input.archived_at ?? null,
    subscription_starts_at: input.subscription_starts_at ?? null,
    subscription_ends_at: input.subscription_ends_at ?? null,
    is_active: input.is_active ?? true,
  });

  return {
    slug: input.slug,
    name: input.name,
    cityPackId: input.cityPackId,
    settings: input.settings,
    lifecycleStatus,
    cityPackHasPlaces: input.cityPackHasPlaces,
    cityPackGateSnapshot: input.cityPackGateSnapshot,
    cityPackContent: input.cityPackContent,
  };
}

export function isTenantFieldMissing(field: TenantCriticalField, input: TenantReadinessInput): boolean {
  const { settings, lifecycleStatus } = input;
  const slug = input.slug?.trim() ?? '';
  const name = input.name?.trim() ?? '';
  const booking = readBookingSettings(settings);

  switch (field) {
    case 'slug':
      return !slug;
    case 'name':
      return !name;
    case 'checkInTime':
      return !settings.checkInTime?.trim();
    case 'heroBgUrl':
      return !settings.heroBgUrl?.trim() && !hasLandingContent(settings);
    case 'wifiName':
      return !settings.wifi?.name?.trim();
    case 'wifiPassword':
      return !settings.wifi?.password?.trim();
    case 'phoneRaw':
      return !settings.contacts?.phoneRaw?.trim();
    case 'address':
      return !settings.contacts?.address?.trim();
    case 'bookingEngineId':
      return booking.provider !== 'none' && !booking.engineId?.trim() && !booking.url?.trim();
    case 'bookingUrl':
      return booking.provider !== 'none' && !booking.engineId?.trim() && !booking.url?.trim();
    case 'highlightedBedId':
      if (!isRoomMapModuleEnabled(settings)) return false;
      return !settings.highlightedBedId?.trim();
    case 'houseRules':
      if (settings.houseRules === undefined && !settings.activeRulesKeys?.length) {
        return false;
      }
      return !resolveHouseRulesReady(settings).ready;
    default:
      return false;
  }
}

export function isSubscriptionReadinessMissing(lifecycleStatus: TenantLifecycleStatus): boolean {
  return lifecycleStatus !== 'active';
}

export function isArrivalAccessMissing(settings: TenantSettings): boolean {
  return !hasDoorAccessConfigured(settings);
}
