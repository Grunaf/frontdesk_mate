import type { CityPackId } from '@/entities/hostel';
import type { LocalizedField, LocalizedText } from '@/entities/city-pack/model/types';
import type { ArrivalAccessConfig } from './accessPoints';
import type { TenantBookingSettings } from './booking';
import type { GuestStayConfig } from './guestStay';
import type { ReceptionBookingSettings } from './receptionBooking';

export type { ArrivalAccessConfig, AccessPoint, ArrivalLayoutKind } from './accessPoints';
export type { GuestStayConfig, TourismRegistrationConfig, StayBed, StayFloor, StayRoom } from './guestStay';
export type { BookingPlatformOption, ReceptionBookingSettings } from './receptionBooking';

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

/** Guest path when city hub is tenant_local (hostel owns hub→door). */
export type TenantLocalArrivalMode = 'walk' | 'transit_lite';

export interface TenantLocalArrivalPath {
  mode: TenantLocalArrivalMode;
  /** Card title shown on guest route summary (optional — falls back to city hub label). */
  title?: LocalizedField;
  /** Card summary (optional). */
  summary?: LocalizedField;
  /**
   * Primary guest directions:
   * - walk: full on-foot path from hub to door
   * - transit_lite: board/ride (or short hop) before optional get-off + walk
   */
  primaryText: LocalizedField;
  /** Optional get-off for transit_lite. */
  getOffAt?: LocalizedField;
  /** Final walk after get-off (transit_lite). For walk mode, prefer primaryText only. */
  walkToHostel?: LocalizedField;
}

export interface TenantSettings {
  booking?: TenantBookingSettings;
  checkInTime?: string;
  checkOutTime?: string;
  /**
   * Wall-clock start of the reception operational day (`HH:mm`, default `06:00` at use sites).
   * Used with property calendar dates in UTC v1 — not full IANA timezone yet.
   */
  operationalDayStartTime?: string;
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
    /** Message template for Booking / chat (placeholders: {sendLink}, {pin}, {pinOrHelp}, …) */
    guestAccessMessageTemplate?: string;
    /** Substituted for {pinOrHelp} when PIN is not available at copy time */
    guestAccessPinMissingText?: string;
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
  landing?: TenantLandingSettings;
  /** Check-in policy, currency, and structured city tax. */
  hostel?: TenantHostelSettings;
  /** Rooms, beds, and optional floor path hints for "find your bed". */
  guestStay?: GuestStayConfig;
  /** Reception desk booking channels (not landing booking engine). */
  receptionBooking?: ReceptionBookingSettings;
  arrivalAccess?: ArrivalAccessConfig;
  /** @deprecated migrated to houseRules — read via getHouseRules() */
  activeRulesKeys?: string[];
  /** Guest house rules (templates + custom). */
  houseRules?: HouseRule[];
  /** Concierge Extras bento catalog (ops + partner offers). */
  guestExtras?: GuestExtraConfig[];
  /** Spots within walking distance — shown above city pack guide. */
  hostelPlaces?: HostelPlace[];
  /**
   * City pack place ids shown as first-visit essentials (guest Essentials).
   * When undefined, guest falls back to pack-level `needNow` on places.
   */
  cityPackNeedNowPlaceIds?: string[];
  faqPackId?: string;
  /** Hostel-specific final leg after the city pack route (overrides city default walk). */
  arrivalWalkToHostel?: LocalizedField;
  /** Per-route overrides for the final walk-to-hostel step. */
  arrivalWalkToHostelByRoute?: Partial<Record<'airport' | 'bus_central' | 'bus_istochno' | 'train_station', LocalizedField>>;
  /**
   * Per-route full Google Maps walking directions URL (A → hostel).
   * Required for enabled hubs — never autofilled from city pack or AI.
   */
  arrivalWalkMapsUrlByRoute?: Partial<
    Record<'airport' | 'bus_central' | 'bus_istochno' | 'train_station', string>
  >;
  /**
   * Per-route get-off override. Empty / missing inherits city pack `publicGetOffAt`.
   * Guest + last-mile AI use tenant value when set.
   * Only for city_shared hubs (ignored for tenant_local — use arrivalLocalByRoute.getOffAt).
   */
  arrivalGetOffAtByRoute?: Partial<
    Record<'airport' | 'bus_central' | 'bus_istochno' | 'train_station', LocalizedField>
  >;
  /**
   * Full hub→door path when city hub is `tenant_local`.
   * Shared hubs ignore this; they use walk + get-off override instead.
   */
  arrivalLocalByRoute?: Partial<
    Record<'airport' | 'bus_central' | 'bus_istochno' | 'train_station', TenantLocalArrivalPath>
  >;
  /** Hostel-specific tips merged with city pack tips in guest modal (max 5 total). */
  arrivalRouteTipsByRoute?: Partial<Record<'airport' | 'bus_central' | 'bus_istochno' | 'train_station', LocalizedText[]>>;
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
