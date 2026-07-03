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
export type { LandingRoomType, TenantLandingSettings } from './model/landing';
export type { CityPackId, TenantRecord, TenantSettings } from './model/settings';
export {
  resolveGuestStayPlan,
  resolveGuestFloorFromStay,
  hasGuestStayConfigured,
} from './lib/resolveGuestStayPlan';
export type {
  GuestStayConfig,
  GuestStayPlan,
  GuestStayStep,
  StayBed,
  StayFloor,
  StayRoom,
} from './model/guestStay';
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
