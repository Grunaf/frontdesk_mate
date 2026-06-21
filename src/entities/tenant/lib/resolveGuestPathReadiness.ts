import type { CityPackGateSnapshot } from '@/entities/city-pack';
import {
  isCityPackReadyForTenant,
  resolveCityPackNotReadyReasonForTenant,
} from '@/entities/city-pack/lib/resolveCityPackGateForTenant';
import { resolveHouseRulesReady, resolveHouseRulesReadyDetail } from '@/entities/house-rules';
import type { CityPackId } from '@/entities/hostel';
import { hasArrivalDayPath } from './hasArrivalDayPath';
import { resolveArrivalLandmark } from './normalizeAccessPoints';
import { readBookingSettings } from './resolveBookingConfig';
import { resolveGuestBookingPhone } from './resolveGuestBookingPhone';
import { isGuestAppModuleReady } from './resolveGuestAppModules';
import { hasDoorAccessConfigured } from './resolveArrivalAccessPlan';
import { hasLandingContent, hasLandingRooms } from './resolveLandingRooms';
import { isRoomMapReady } from './resolveRoomMapReadiness';
import type { TenantSettings } from '../model/settings';
import type { TenantReadinessInput } from './resolveTenantReadiness';
import type { TenantLifecycleStatus } from './resolveTenantLifecycle';

export type LaunchBookingPath = 'engine' | 'wa';

export type LaunchStepId =
  | 'identity'
  | 'contacts-landing'
  | 'booking'
  | 'arrival'
  | 'room-map'
  | 'rules-wifi'
  | 'preview';

export type GuestPathItemTier = 'must' | 'optional';

export interface GuestPathItem {
  id: string;
  label: string;
  tier: GuestPathItemTier;
  complete: boolean;
  detail?: string;
  stepId: LaunchStepId;
}

export interface GuestPathGateResult {
  ready: boolean;
  incompleteMust: GuestPathItem[];
  incompleteOptional: GuestPathItem[];
  items: GuestPathItem[];
}

export interface GuestPathReadinessInput extends TenantReadinessInput {
  bookingPath?: LaunchBookingPath;
  cityPackHasPlaces?: boolean;
  cityPackGateSnapshot?: CityPackGateSnapshot;
}

function isCityPackPlacesReady(
  cityPackId: CityPackId,
  input: { cityPackHasPlaces?: boolean; cityPackGateSnapshot?: CityPackGateSnapshot }
): boolean {
  if (input.cityPackHasPlaces != null) {
    return input.cityPackHasPlaces;
  }

  if (input.cityPackGateSnapshot) {
    return isCityPackReadyForTenant(cityPackId, input.cityPackGateSnapshot);
  }

  return false;
}

export function inferLaunchBookingPath(
  settings: TenantReadinessInput['settings']
): LaunchBookingPath {
  return readBookingSettings(settings).provider !== 'none' ? 'engine' : 'wa';
}

function isValidHouseRulesReady(settings: TenantSettings): boolean {
  return resolveHouseRulesReady(settings).ready;
}

function buildGuestPathItems(input: GuestPathReadinessInput): GuestPathItem[] {
  const {
    settings,
    lifecycleStatus,
    cityPackId,
    slug,
    name,
    bookingPath: pathOverride,
    cityPackHasPlaces,
    cityPackGateSnapshot,
  } = input;
  const slugValue = slug?.trim() ?? '';
  const nameValue = name?.trim() ?? '';
  const bookingPath = pathOverride ?? inferLaunchBookingPath(settings);
  const booking = readBookingSettings(settings);
  const bookingPhone = resolveGuestBookingPhone(settings);
  const houseRulesReady = isValidHouseRulesReady(settings);
  const houseRulesDetail = resolveHouseRulesReadyDetail(settings);
  const packPlacesReady = isCityPackPlacesReady(cityPackId, {
    cityPackHasPlaces,
    cityPackGateSnapshot,
  });
  const packNotReadyReason = cityPackGateSnapshot
    ? resolveCityPackNotReadyReasonForTenant(cityPackId, cityPackGateSnapshot)
    : undefined;

  const items: GuestPathItem[] = [
    {
      id: 'subscription-active',
      label: 'Subscription active',
      tier: 'must',
      complete: lifecycleStatus === 'active',
      detail: lifecycleStatus === 'active' ? undefined : 'Set subscription dates in the future',
      stepId: 'identity',
    },
    {
      id: 'identity-slug-name',
      label: 'Slug and display name',
      tier: 'must',
      complete: Boolean(slugValue && nameValue),
      stepId: 'identity',
    },
    {
      id: 'identity-city-pack-places',
      label: 'City pack with local guide places',
      tier: 'must',
      complete: packPlacesReady,
      detail: packPlacesReady
        ? undefined
        : packNotReadyReason ?? 'Choose a ready city pack in Identity (City packs admin)',
      stepId: 'identity',
    },
    {
      id: 'contacts-phone',
      label: 'Reception phone (WhatsApp bookings default to this)',
      tier: 'must',
      complete: Boolean(settings.contacts?.phoneRaw?.trim()),
      stepId: 'contacts-landing',
    },
    {
      id: 'contacts-address',
      label: 'Address',
      tier: 'must',
      complete: Boolean(settings.contacts?.address?.trim()),
      stepId: 'contacts-landing',
    },
    {
      id: 'landing-hero',
      label: 'Hero image',
      tier: 'must',
      complete: Boolean(settings.heroBgUrl?.trim()),
      stepId: 'contacts-landing',
    },
    {
      id: 'landing-check-in-time',
      label: 'Check-in time',
      tier: 'must',
      complete: Boolean(settings.checkInTime?.trim()),
      stepId: 'contacts-landing',
    },
    {
      id: 'arrival-find-hostel',
      label: 'Find the hostel landmark photo',
      tier: 'must',
      complete: Boolean(resolveArrivalLandmark(settings)),
      stepId: 'arrival',
    },
    {
      id: 'arrival-day-path',
      label: 'Day check-in path (door photo or guide)',
      tier: 'must',
      complete: hasArrivalDayPath(settings),
      detail: hasArrivalDayPath(settings) ? undefined : 'Add an access point photo or guide text',
      stepId: 'arrival',
    },
    {
      id: 'arrival-configured',
      label: 'Arrival access configured',
      tier: 'must',
      complete: hasDoorAccessConfigured(settings),
      stepId: 'arrival',
    },
    {
      id: 'room-map-ready',
      label: 'Room map live for guests',
      tier: 'must',
      complete: isRoomMapReady(settings),
      stepId: 'room-map',
    },
    {
      id: 'guest-house-rules',
      label: 'At least one house rule',
      tier: 'must',
      complete: houseRulesReady,
      detail: houseRulesReady ? undefined : houseRulesDetail,
      stepId: 'rules-wifi',
    },
    {
      id: 'guest-local-guide',
      label: 'Local guide from city pack',
      tier: 'must',
      complete: isGuestAppModuleReady('localGuide', {
        cityPackId,
        settings,
        cityPackHasPlaces: packPlacesReady,
        cityPackGateSnapshot,
      }),
      stepId: 'rules-wifi',
    },
    {
      id: 'wifi-credentials',
      label: 'WiFi name and password',
      tier: 'must',
      complete: Boolean(settings.wifi?.name?.trim() && settings.wifi?.password?.trim()),
      stepId: 'rules-wifi',
    },
  ];

  if (bookingPath === 'engine') {
    items.push(
      {
        id: 'booking-engine-configured',
        label: 'Booking engine configured',
        tier: 'must',
        complete: Boolean(booking.engineId?.trim() || booking.url?.trim()),
        detail: 'Set property ID or custom booking URL',
        stepId: 'booking',
      },
      {
        id: 'landing-content',
        label: 'Landing hero or room cards',
        tier: 'must',
        complete: hasLandingContent(settings),
        stepId: 'booking',
      }
    );
  } else {
    items.push(
      {
        id: 'booking-wa-phone',
        label: 'WhatsApp booking number',
        tier: 'must',
        complete: Boolean(bookingPhone),
        detail: 'Set reception phone or a booking WhatsApp override',
        stepId: 'booking',
      },
      {
        id: 'landing-wa-content',
        label: 'Hero image for landing',
        tier: 'must',
        complete: Boolean(settings.heroBgUrl?.trim()),
        stepId: 'booking',
      },
      {
        id: 'landing-wa-rooms',
        label: 'At least one landing room card (recommended)',
        tier: 'optional',
        complete: hasLandingRooms(settings),
        detail: 'Add room types so guests can pick a stay before WhatsApp',
        stepId: 'booking',
      }
    );
  }

  items.push(
    {
      id: 'contacts-booking-override',
      label: 'Separate booking WhatsApp number',
      tier: 'optional',
      complete: true,
      detail: 'Optional — leave empty to use reception phone',
      stepId: 'contacts-landing',
    },
    {
      id: 'arrival-night-codes',
      label: 'Night door codes',
      tier: 'optional',
      complete: true,
      stepId: 'arrival',
    }
  );

  return items;
}

export function resolveGuestPathGate(input: GuestPathReadinessInput): GuestPathGateResult {
  const items = buildGuestPathItems(input);
  const incompleteMust = items.filter((item) => item.tier === 'must' && !item.complete);
  const incompleteOptional = items.filter((item) => item.tier === 'optional' && !item.complete);

  return {
    ready: incompleteMust.length === 0,
    incompleteMust,
    incompleteOptional,
    items,
  };
}

export function resolveGuestPathItemsForStep(
  input: GuestPathReadinessInput,
  stepId: LaunchStepId
): GuestPathItem[] {
  return buildGuestPathItems(input).filter((item) => item.stepId === stepId);
}

export function stepHasIncompleteMust(
  stepId: LaunchStepId,
  input: GuestPathReadinessInput
): boolean {
  return resolveGuestPathItemsForStep(input, stepId).some(
    (item) => item.tier === 'must' && !item.complete
  );
}

export function resolveFirstIncompleteLaunchStep(
  input: GuestPathReadinessInput,
  stepOrder: LaunchStepId[]
): LaunchStepId {
  for (const stepId of stepOrder) {
    if (stepId === 'preview') {
      continue;
    }
    if (stepHasIncompleteMust(stepId, input)) {
      return stepId;
    }
  }
  return 'preview';
}

export function isLaunchStepComplete(stepId: LaunchStepId, input: GuestPathReadinessInput): boolean {
  if (stepId === 'preview') {
    return resolveGuestPathGate(input).ready;
  }
  return !stepHasIncompleteMust(stepId, input);
}

export function buildGuestPathReadinessInput(input: {
  slug?: string;
  name?: string;
  cityPackId: CityPackId;
  settings: TenantReadinessInput['settings'];
  lifecycleStatus: TenantLifecycleStatus;
  bookingPath?: LaunchBookingPath;
}): GuestPathReadinessInput {
  return input;
}
