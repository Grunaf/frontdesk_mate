import { resolveBookingConfig } from './resolveBookingConfig';
import { hasLandingRooms } from './resolveLandingRooms';
import type { TenantSettings } from '../model/settings';

export function needsLandingBookingEngine(settings: TenantSettings): boolean {
  return hasLandingRooms(settings) && !resolveBookingConfig(settings).enabled;
}
