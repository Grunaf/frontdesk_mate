import { getCityPack, type CityPackId } from '@/entities/hostel';
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
  'arrival',
  'guest-app',
  'wifi',
  'contacts',
] as const;

export type AdminSectionId = (typeof ADMIN_SECTION_IDS)[number];

export interface AdminSectionDefinition {
  id: AdminSectionId;
  label: string;
  description: string;
}

export const ADMIN_SECTIONS: AdminSectionDefinition[] = [
  {
    id: 'identity',
    label: 'Identity',
    description: 'Slug, display name, city pack, and branding.',
  },
  {
    id: 'subscription',
    label: 'Subscription',
    description: 'Billing period, live access, and archival.',
  },
  {
    id: 'landing',
    label: 'Landing & times',
    description: 'Hero image and guest-facing check-in details.',
  },
  {
    id: 'booking',
    label: 'Booking engine',
    description: 'Online booking provider and property ID.',
  },
  {
    id: 'arrival',
    label: 'Arrival & doors',
    description: 'How guests find the hostel and enter day or night.',
  },
  {
    id: 'guest-app',
    label: 'Guest app modules',
    description: 'Room map, house rules, and in-app content.',
  },
  {
    id: 'wifi',
    label: 'WiFi',
    description: 'Network name and password for the WiFi card.',
  },
  {
    id: 'contacts',
    label: 'Contacts & reception',
    description: 'Phones, email, address, and reception hours.',
  },
];

function worstStatus(statuses: ModuleStatus[]): ModuleStatus {
  if (statuses.includes('hidden')) return 'hidden';
  if (statuses.includes('preview')) return 'preview';
  return 'ready';
}

export function getAdminSectionStatus(
  sectionId: AdminSectionId,
  input: {
    cityPackId: CityPackId;
    settings: TenantSettings;
    slug?: string;
    name?: string;
    lifecycleStatus?: ReturnType<typeof resolveTenantLifecycleStatus>;
  }
): ModuleStatus | 'n/a' {
  const capabilities = resolveCapabilities(input);
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
    case 'arrival':
      return worstStatus([capabilities.doorAccess, capabilities.doorPhotos, capabilities.arrivalRoutes]);
    case 'guest-app':
      return worstStatus([capabilities.roomMap, capabilities.faq, capabilities.localGuide]);
    case 'wifi':
      return settings.wifi?.name && settings.wifi?.password ? 'ready' : 'preview';
    case 'contacts':
      return capabilities.preTripInfo;
    default:
      return 'n/a';
  }
}

export function getAdminSectionHint(
  sectionId: AdminSectionId,
  input: {
    cityPackId: CityPackId;
    settings: TenantSettings;
    lifecycleStatus?: ReturnType<typeof resolveTenantLifecycleStatus>;
  }
): string | undefined {
  const { cityPackId, settings } = input;
  const merged = settings;
  const cityPack = getCityPack(cityPackId);
  const hasTaxiNumber = Boolean(merged.contacts?.taxiPhoneRaw || cityPack.recommendedTaxi?.phoneRaw);
  const hasReceptionPhone = Boolean(merged.contacts?.phoneRaw);

  switch (sectionId) {
    case 'identity':
      return merged.logoUrl ? 'Logo configured' : 'Optional logo URL';
    case 'subscription':
      return input.lifecycleStatus ? getAdminSubscriptionHint(input.lifecycleStatus) : undefined;
    case 'guest-app': {
      const caps = resolveCapabilities(input);
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
    case 'arrival':
      return hasDoorAccessConfigured(merged) ? 'Door access configured' : 'Add access points';
    case 'wifi':
      return merged.wifi?.name ? `Network: ${merged.wifi.name}` : 'WiFi card is off until name and password are set';
    case 'contacts':
      if (hasTaxiNumber) {
        return `Taxi: ${cityPack.recommendedTaxi?.name ?? 'configured'}${
          merged.reception?.canHelpWithTaxi !== false && hasReceptionPhone ? ' · reception backup' : ''
        }`;
      }
      return merged.contacts?.address
        ? 'Address set · add taxi number for routes'
        : 'Add address and reception phone';
    default:
      return undefined;
  }
}

export function getDefaultOpenSections(input: {
  cityPackId: CityPackId;
  settings: TenantSettings;
  slug?: string;
  name?: string;
  lifecycleStatus?: ReturnType<typeof resolveTenantLifecycleStatus>;
}): AdminSectionId[] {
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
