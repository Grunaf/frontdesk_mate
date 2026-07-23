export type { TenantConfig } from './model/tenant-config';
export { useTenantCityPack } from './model/tenant-config';
export { CITY_PACK_LIST, isCityPackId } from '@/entities/hostel';
export { buildHostelConfig } from './lib/buildHostelConfig';
export { resolveCapabilities } from './lib/resolveCapabilities';
export {
  resolveArrivalAccessPlan,
  hasDoorAccessConfigured,
  hasNightDoorCodes,
  type ArrivalAccessPlan,
  type ArrivalAccessStep,
  type ArrivalDayMode,
  type ArrivalLandmark,
  type ArrivalBannerKeys,
} from './lib/resolveArrivalAccessPlan';
export { isOutsideReceptionHours } from './lib/isOutsideReceptionHours';
export {
  normalizeAccessPoints,
  resolveArrivalLandmark,
  resolveGuestFloor,
  filterAccessPointsForGuest,
  resolveLayoutKind,
} from './lib/normalizeAccessPoints';
export type { AccessPoint, ArrivalAccessConfig, ArrivalLayoutKind } from './model/accessPoints';
export type { AppModule, ModuleStatus, TenantCapabilities } from './model/capabilities';
export { useModuleStatus, useCapabilities } from './ui/useModuleStatus';
export { TenantContext } from './ui/tenant-context';
export { TenantProvider, useTenant } from './ui/TenantProvider';
export { useHostelConfig } from './ui/useHostelConfig';
export { TenantBrand, type TenantBrandProps } from './ui/TenantBrand';
export { resolveTenantBrand, type TenantBrandResolved } from './lib/resolveTenantBrand';
export type { HostelConfig } from './model/hostel-config';
export {
  hasLandingContent,
  hasLandingRooms,
  resolveLandingRooms,
  type ResolvedLandingRooms,
} from './lib/resolveLandingRooms';
export {
  resolveGuestBedId,
} from './lib/resolveGuestBedId';
export type { LandingRoomType, LandingRoomCard, TenantLandingSettings } from './model/landing';
export type { StayOffer } from './model/stayOffers';
export {
  normalizeStayOffers,
  normalizeStayOffersOnRead,
  finalizeStayOffersForSave,
  listStayOffers,
  listStayOffersForAdmin,
  coerceStayOffersForAdminEdit,
  resolveStayOfferById,
  migrateLegacyLandingRoomTypes,
} from './lib/normalizeStayOffers';
export type {
  LaundryMachine,
  LaundryMachinePrograms,
  LaundryProgram,
  LaundrySettings,
} from './model/laundry';
export {
  DEFAULT_LAUNDRY_PROGRAM_MINUTES,
  LAUNDRY_DURATION_MAX_MINUTES,
  LAUNDRY_DURATION_MIN_MINUTES,
  LAUNDRY_PROGRAMS,
} from './model/laundry';
export {
  clampLaundryDurationMinutes,
  coerceLaundryMachinesForAdminEdit,
  createEmptyLaundryMachine,
  finalizeLaundrySettingsForSave,
  isLaundryProgram,
  listLaundryMachines,
  listLaundryMachinesForAdmin,
  normalizeLaundryMachines,
  normalizeLaundryPrograms,
  normalizeLaundrySettings,
  resolveLaundryMachineById,
  resolveLaundryProgramDurationMinutes,
} from './lib/normalizeLaundrySettings';
export type {
  CityPackId,
  TenantHubTransferSettings,
  TenantLocalArrivalMode,
  TenantLocalArrivalPath,
  TenantRecord,
  TenantSettings,
} from './model/settings';
export { normalizeHubTransferForSave } from './lib/normalizeHubTransferSettings';
export {
  applyCityPackNeedNowPlaceIds,
  resolveCityPackNeedNowPlaceIdsForAdmin,
} from './lib/applyCityPackNeedNowPlaceIds';
export {
  resolveGuestStayPlan,
  resolveGuestFloorFromStay,
  hasGuestStayConfigured,
} from './lib/resolveGuestStayPlan';
export {
  resolveTourismRegistrationRequired,
  resolveTourismRegistrationConfig,
  resolveTourismRegistrationProfile,
  resolvePlanStayStatusEnabled,
  normalizeGuestStayComplianceOnRead,
  finalizeGuestStayForSave,
} from './lib/normalizeGuestStaySettings';
export type {
  GuestStayConfig,
  TourismRegistrationConfig,
  TourismRegistrationDataController,
  GuestStayPlan,
  GuestStayStep,
  StayBed,
  StayFloor,
  StayRoom,
} from './model/guestStay';
export type { BookingPlatformOption, ReceptionBookingSettings } from './model/receptionBooking';
export { SUGGESTED_RECEPTION_BOOKING_PLATFORMS } from './model/receptionBooking';
export {
  normalizeReceptionBookingForSave,
  normalizeReceptionBookingOnRead,
  listReceptionBookingPlatforms,
  resolveReceptionBookingPlatformLabel,
  formatReceptionBookingSourceSummary,
  slugifyBookingPlatformId,
} from './lib/normalizeReceptionBookingSettings';
export {
  BOOKING_PROVIDER_LABELS,
  isBookingProvider,
  type BookingProvider,
  type HostelBookingConfig,
  type TenantBookingSettings,
} from './model/booking';
export {
  buildBookingRoomUrl,
  buildBookingSearchUrl,
  readBookingSettings,
  resolveBookingConfig,
} from './lib/resolveBookingConfig';
export {
  DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE,
  DEFAULT_GUEST_ACCESS_PIN_MISSING_TEXT,
  resolveGuestAccessMessageTemplate,
  resolveGuestAccessPinMissingText,
} from './lib/guestAccessMessage';
