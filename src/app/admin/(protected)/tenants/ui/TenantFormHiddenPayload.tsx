'use client';

import { getHouseRules } from '@/entities/house-rules';
import type { TenantSettings } from '@/entities/tenant';
import { isRoomMapModuleEnabled } from '@/entities/tenant/lib/resolveGuestModuleToggles';

interface TenantFormHiddenPayloadProps {
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
  mergedSettings: TenantSettings;
}

/** Always-mounted form fields so launch wizard save works from any step. */
export function TenantFormHiddenPayload({
  subscriptionStartsAt,
  subscriptionEndsAt,
  mergedSettings,
}: TenantFormHiddenPayloadProps) {
  const roomMapEnabled = isRoomMapModuleEnabled(mergedSettings);
  const houseRules = getHouseRules(mergedSettings);

  return (
    <div aria-hidden className="hidden">
      <input type="hidden" name="subscriptionStartsAt" value={subscriptionStartsAt} />
      <input type="hidden" name="subscriptionEndsAt" value={subscriptionEndsAt} />
      <input type="hidden" name="houseRulesJson" value={JSON.stringify(houseRules)} />
      <input
        type="hidden"
        name="hostelPlacesJson"
        value={JSON.stringify(mergedSettings.hostelPlaces ?? [])}
      />
      <input type="hidden" name="roomMapEnabled" value={roomMapEnabled ? 'true' : 'false'} />
      <input
        type="hidden"
        name="guestStayJson"
        value={roomMapEnabled && mergedSettings.guestStay ? JSON.stringify(mergedSettings.guestStay) : ''}
      />
      <input
        type="hidden"
        name="highlightedBedId"
        value={roomMapEnabled ? (mergedSettings.highlightedBedId ?? '') : ''}
      />
    </div>
  );
}
