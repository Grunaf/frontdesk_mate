'use client';

import { getHouseRules } from '@/entities/house-rules';
import type { TenantSettings } from '@/entities/tenant';
import { resolveCityTaxAmount, resolveTenantCurrency } from '@/entities/tenant/lib/resolveHostelMoney';
import { isRoomMapModuleEnabled } from '@/entities/tenant/lib/resolveGuestModuleToggles';
import {
  parseArrivalWalkByRouteJson,
  parseArrivalWalkToHostelJson,
  serializeArrivalWalkByRouteJson,
  serializeArrivalWalkToHostelJson,
} from '../lib/parseArrivalTransportSettings';

interface TenantFormHiddenPayloadProps {
  subscriptionStartsAt: string;
  subscriptionEndsAt: string;
  mergedSettings: TenantSettings;
  roomMapEnabled?: boolean;
}

function serializeHostelJson(settings: TenantSettings): string {
  const currency = resolveTenantCurrency(settings);
  const cityTax = resolveCityTaxAmount(settings);

  return JSON.stringify({
    ...settings.hostel,
    currency,
    cityTax: cityTax ?? settings.hostel?.cityTax,
  });
}

function serializeLandingJson(settings: TenantSettings): string {
  return JSON.stringify({
    roomsSectionTitle: settings.landing?.roomsSectionTitle,
    roomsSectionSubtitle: settings.landing?.roomsSectionSubtitle,
    roomTypes: settings.landing?.roomTypes ?? [],
  });
}

/** Always-mounted form fields so launch wizard save works from any step. */
export function TenantFormHiddenPayload({
  subscriptionStartsAt,
  subscriptionEndsAt,
  mergedSettings,
  roomMapEnabled: roomMapEnabledOverride,
}: TenantFormHiddenPayloadProps) {
  const roomMapEnabled = roomMapEnabledOverride ?? isRoomMapModuleEnabled(mergedSettings);
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
      <input
        type="hidden"
        name="guestExtrasJson"
        value={JSON.stringify(mergedSettings.guestExtras ?? [])}
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
      <input
        type="hidden"
        name="arrivalWalkToHostelJson"
        value={serializeArrivalWalkToHostelJson(mergedSettings.arrivalWalkToHostel)}
      />
      <input
        type="hidden"
        name="arrivalWalkByRouteJson"
        value={serializeArrivalWalkByRouteJson(mergedSettings.arrivalWalkToHostelByRoute)}
      />
      <input type="hidden" name="landingJson" value={serializeLandingJson(mergedSettings)} />
      <input type="hidden" name="hostelJson" value={serializeHostelJson(mergedSettings)} />
    </div>
  );
}
