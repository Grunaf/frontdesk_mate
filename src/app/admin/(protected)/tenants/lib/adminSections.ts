import { getCityPack, type CityPackId } from '@/entities/hostel';
import type { CityPackContent } from '@/entities/city-pack/model/types';
import type { CityPackGateSnapshot } from '@/entities/city-pack';
import { isCityPackReadyForTenant } from '@/entities/city-pack/lib/resolveCityPackGateForTenant';
import { resolveCityPackTransportReadiness } from '@/entities/city-pack/lib/resolveCityPackTransportReadiness';
import { resolveArrivalWalkReadiness } from '@/entities/city-pack/lib/resolveArrivalTransportReadiness';
import {
  readBookingSettings,
  resolveCapabilities,
  type ModuleStatus,
  type TenantSettings,
} from '@/entities/tenant';
import { hasDoorAccessConfigured } from '@/entities/tenant/lib/resolveArrivalAccessPlan';
import { needsLandingBookingEngine } from '@/entities/tenant/lib/resolveLandingBookingGap';
import { hasLandingContent } from '@/entities/tenant/lib/resolveLandingRooms';
import {
  getAdminSubscriptionHint,
  resolveTenantLifecycleStatus,
} from '@/entities/tenant/lib/resolveTenantLifecycle';

export const ADMIN_SECTION_IDS = [
  'identity',
  'subscription',
  'landing',
  'booking',
  'arrival-journey',
  'guest-app',
  'wifi',
  'contacts',
] as const;

export type AdminSectionId = (typeof ADMIN_SECTION_IDS)[number];

/** @deprecated Use `arrival-journey`. Kept for bookmark compatibility. */
export const LEGACY_ADMIN_SECTION_ALIASES: Record<string, AdminSectionId> = {
  arrival: 'arrival-journey',
};

export function normalizeAdminSectionId(sectionId: string | null | undefined): AdminSectionId | null {
  if (!sectionId) {
    return null;
  }

  const aliased = LEGACY_ADMIN_SECTION_ALIASES[sectionId] ?? sectionId;
  return ADMIN_SECTION_IDS.includes(aliased as AdminSectionId) ? (aliased as AdminSectionId) : null;
}

export interface AdminSectionDefinition {
  id: AdminSectionId;
  label: string;
  description: string;
}

export const ADMIN_SECTIONS: AdminSectionDefinition[] = [
  {
    id: 'identity',
    label: 'Identity & brand',
    description: 'Slug, display name, city pack, and logo.',
  },
  {
    id: 'subscription',
    label: 'Subscription',
    description: 'Billing period, live access, and archival.',
  },
  {
    id: 'landing',
    label: 'Landing page',
    description: 'Public hero image and room cards for the landing site.',
  },
  {
    id: 'booking',
    label: 'Booking',
    description: 'Online booking provider and property ID.',
  },
  {
    id: 'arrival-journey',
    label: 'Arrival journey',
    description: 'Address, city routes, walk to the door, and building access.',
  },
  {
    id: 'guest-app',
    label: 'Guest app',
    description: 'Room map, house rules, extras, and near-hostel picks.',
  },
  {
    id: 'wifi',
    label: 'WiFi',
    description: 'Network name and password for the in-app card.',
  },
  {
    id: 'contacts',
    label: 'Reception & hostel',
    description: 'Phones, reception hours, check-in policy, tax, and currency.',
  },
];

function worstStatus(statuses: ModuleStatus[]): ModuleStatus {
  if (statuses.includes('hidden')) return 'hidden';
  if (statuses.includes('preview')) return 'preview';
  return 'ready';
}

type AdminSectionInput = {
  cityPackId: CityPackId;
  settings: TenantSettings;
  slug?: string;
  name?: string;
  lifecycleStatus?: ReturnType<typeof resolveTenantLifecycleStatus>;
  cityPackContent?: CityPackContent;
  cityPackGateSnapshot?: CityPackGateSnapshot;
};

function resolveAdminCityPackReadyForGuests(input: AdminSectionInput): boolean {
  if (input.cityPackGateSnapshot) {
    return isCityPackReadyForTenant(input.cityPackId, input.cityPackGateSnapshot);
  }

  return resolveCityPackTransportReadiness({
    packId: input.cityPackId,
    content: input.cityPackContent,
  }).ready;
}

export function getAdminSectionStatus(
  sectionId: AdminSectionId,
  input: AdminSectionInput
): ModuleStatus | 'n/a' {
  const capabilities = resolveCapabilities({
    cityPackId: input.cityPackId,
    settings: input.settings,
    lifecycleStatus: input.lifecycleStatus,
    cityPackHasPlaces: resolveAdminCityPackReadyForGuests(input),
  });
  const settings = input.settings;

  switch (sectionId) {
    case 'identity':
      return input.slug?.trim() && input.name?.trim() ? 'ready' : 'preview';
    case 'subscription':
      return input.lifecycleStatus === 'active'
        ? 'ready'
        : input.lifecycleStatus === 'scheduled'
          ? 'preview'
          : 'hidden';
    case 'landing':
      return capabilities.landing;
    case 'booking':
      return capabilities.booking;
    case 'arrival-journey': {
      const walkReadiness = resolveArrivalWalkReadiness({
        cityPackId: input.cityPackId,
        settings,
        cityPackContent: input.cityPackContent,
      });
      return worstStatus([
        capabilities.doorAccess,
        capabilities.doorPhotos,
        capabilities.arrivalRoutes,
        settings.contacts?.address?.trim() ? 'ready' : 'preview',
        walkReadiness.complete ? 'ready' : 'preview',
      ]);
    }
    case 'guest-app':
      return worstStatus([capabilities.roomMap, capabilities.faq, capabilities.localGuide]);
    case 'wifi':
      return settings.wifi?.name && settings.wifi?.password ? 'ready' : 'preview';
    case 'contacts':
      return settings.contacts?.phoneRaw?.trim() ? 'ready' : 'preview';
    default:
      return 'n/a';
  }
}

export function getAdminSectionHint(
  sectionId: AdminSectionId,
  input: AdminSectionInput
): string | undefined {
  const { cityPackId, settings } = input;
  const merged = settings;
  const cityPack = getCityPack(cityPackId);
  const hasTaxiNumber = Boolean(merged.contacts?.taxiPhoneRaw || cityPack.recommendedTaxi?.phoneRaw);
  const walkReadiness = resolveArrivalWalkReadiness({
    cityPackId,
    settings: merged,
    cityPackContent: input.cityPackContent,
  });

  switch (sectionId) {
    case 'identity':
      return merged.logoUrl ? 'Logo configured' : 'Add a logo image to show branding';
    case 'subscription':
      return input.lifecycleStatus ? getAdminSubscriptionHint(input.lifecycleStatus) : undefined;
    case 'guest-app': {
      const caps = resolveCapabilities({
        cityPackId: input.cityPackId,
        settings: merged,
        cityPackHasPlaces: resolveAdminCityPackReadyForGuests(input),
      });
      if (caps.roomMap === 'ready' && caps.faq === 'ready' && caps.localGuide === 'ready') {
        return 'All modules live';
      }
      if (caps.roomMap === 'hidden') {
        return 'Room map off';
      }
      return 'Modules partially configured';
    }
    case 'landing':
      return hasLandingContent(merged) ? 'Landing content set' : 'Add hero or room types';
    case 'booking': {
      const booking = readBookingSettings(merged);
      if (booking.provider === 'none') {
        return needsLandingBookingEngine(merged) ? 'Room cards need booking' : 'Booking off';
      }
      return booking.engineId || booking.url ? `${booking.provider} configured` : 'Set property ID';
    }
    case 'arrival-journey': {
      const parts: string[] = [];
      if (!merged.contacts?.address?.trim()) {
        parts.push('add address');
      }
      if (!walkReadiness.complete) {
        parts.push(walkReadiness.detail ?? 'walk directions');
      }
      if (!hasDoorAccessConfigured(merged)) {
        parts.push('door access');
      }
      if (parts.length > 0) {
        return parts.join(' · ');
      }
      return hasTaxiNumber
        ? `Ready · taxi ${cityPack.recommendedTaxi?.name ?? 'configured'}`
        : 'Address, walk, and doors configured';
    }
    case 'wifi':
      return merged.wifi?.name ? `Network: ${merged.wifi.name}` : 'WiFi card is off until name and password are set';
    case 'contacts':
      return merged.contacts?.phoneRaw
        ? `Reception phone set${merged.reception?.open ? ` · ${merged.reception.open}–${merged.reception.close ?? '?'}` : ''}`
        : 'Add reception phone';
    default:
      return undefined;
  }
}

export function getDefaultOpenSections(input: AdminSectionInput): AdminSectionId[] {
  const open: AdminSectionId[] = ['identity'];

  for (const section of ADMIN_SECTIONS) {
    if (section.id === 'identity') continue;
    const status = getAdminSectionStatus(section.id, input);
    if (status === 'preview') {
      open.push(section.id);
      break;
    }
  }

  return open;
}
