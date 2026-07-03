import { resolveHouseRulesReady } from '@/entities/house-rules';
import type { TenantSettings } from '../model/settings';

export function isRoomMapModuleEnabled(settings: TenantSettings | undefined): boolean {
  const stay = settings?.guestStay;
  if (!stay) {
    return false;
  }

  return (
    (stay.floors?.length ?? 0) > 0 &&
    (stay.rooms?.length ?? 0) > 0 &&
    (stay.beds?.length ?? 0) > 0
  );
}

export function isHouseRulesModuleEnabled(settings: TenantSettings | undefined): boolean {
  return resolveHouseRulesReady(settings).ready;
}

export function isHouseRulesModuleTracked(settings: TenantSettings | undefined): boolean {
  if (!settings) {
    return false;
  }
  return settings.houseRules !== undefined || settings.activeRulesKeys !== undefined;
}
