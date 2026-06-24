import type { CityPackId } from '@/entities/hostel';
import type { LocalizedField } from '@/entities/city-pack/model/types';
import type { ArrivalAccessConfig } from './accessPoints';
import type { TenantBookingSettings } from './booking';
import type { GuestStayConfig } from './guestStay';

export type { ArrivalAccessConfig, AccessPoint, ArrivalLayoutKind } from './accessPoints';
export type { GuestStayConfig, StayBed, StayFloor, StayRoom } from './guestStay';

import type { TenantLandingSettings } from './landing';
import type { TenantHostelSettings } from './hostelSettings';

export type { LandingRoomType, TenantLandingSettings } from './landing';
export type { TenantHostelSettings } from './hostelSettings';
export type { CityPackId } from '@/entities/hostel';

import type { HostelPlace } from './hostelPlaces';

export type { HostelPlace, HostelPlaceCategory } from './hostelPlaces';
export {
  HOSTEL_PLACE_CATEGORIES,
  HOSTEL_PLACE_CATEGORY_IDS,
  HOSTEL_PLACE_CATEGORY_REGISTRY,
  isHostelPlaceCategory,
  resolveHostelPlaceCategoryAdminLabel,
  resolveHostelPlaceCategoryLabelKey,
} from './hostelPlaces';

import type { HouseRule } from '@/entities/house-rules';
import type { GuestExtraConfig } from '@/entities/guest-extra';

export interface TenantSettings {
  booking?: TenantBookingSettings;
  checkInTime?: string;
  checkOutTime?: string;
  cityTax?: string;
  selfCheckInTimeAfter?: string;
  laundryCost?: string;
  heroBgUrl?: string;
  reception?: {
    open?: string;
    close?: string;
    /** Separate WhatsApp number; falls back to contacts.phoneRaw */
    whatsappPhoneRaw?: string;
    /** Show WhatsApp for reception (default: true when a phone is set) */
    whatsappEnabled?: boolean;
    /** Offer reception as taxi booking backup (default: true when a phone is set) */
    canHelpWithTaxi?: boolean;
    /** Optional per-tenant hint under the reception link */
    availabilityHint?: string;
    /** Hashed PIN for reception desk login ({slug}.reception.domain) */
    deskPinHash?: string;
  };
  recommendationMap?: string;
  wifi?: {
    name?: string;
    password?: string;
  };
  contacts?: {
    phoneRaw?: string;
    /** WhatsApp for landing hero / room booking; falls back to phoneRaw */
    bookingWhatsappPhoneRaw?: string;
    phoneMask?: string;
    phoneFormatPreset?: string;
    taxiPhoneRaw?: string;
    taxiPhoneMask?: string;
    taxiPhoneFormatPreset?: string;
    email?: string;
    address?: string;
    mapsUrl?: string;
    instagram?: string;
    facebook?: string;
    feedbackPhoneRaw?: string;
  };
  brand?: {
    primary?: string;
    dark?: string;
    radius?: string;
  };
  logoUrl?: string;
  highlightedBedId?: string;
  landing?: TenantLandingSettings;
  /** Check-in policy, currency, and structured city tax. */
  hostel?: TenantHostelSettings;
  /** Rooms, beds, and optional floor path hints for "find your bed". */
  guestStay?: GuestStayConfig;
  arrivalAccess?: ArrivalAccessConfig;
  /** @deprecated migrated to houseRules — read via getHouseRules() */
  activeRulesKeys?: string[];
  /** Guest house rules (templates + custom). */
  houseRules?: HouseRule[];
  /** Concierge Extras bento catalog (ops + partner offers). */
  guestExtras?: GuestExtraConfig[];
  /** Spots within walking distance — shown above city pack guide. */
  hostelPlaces?: HostelPlace[];
  faqPackId?: string;
  /** Hostel-specific final leg after the city pack route (overrides city default walk). */
  arrivalWalkToHostel?: LocalizedField;
  /** Per-route overrides for the final walk-to-hostel step. */
  arrivalWalkToHostelByRoute?: Partial<Record<'airport' | 'bus_central' | 'bus_istochno' | 'train_station', LocalizedField>>;
}

export interface TenantRecord {
  id: string;
  slug: string;
  name: string;
  city_pack_id: CityPackId;
  settings: TenantSettings;
  is_active: boolean;
  subscription_starts_at?: string | null;
  subscription_ends_at?: string | null;
  archived_at?: string | null;
}
