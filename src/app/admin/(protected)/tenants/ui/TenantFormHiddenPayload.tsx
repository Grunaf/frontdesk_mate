'use client';

import { getHouseRules } from '@/entities/house-rules';
import type { TenantSettings } from '@/entities/tenant';
import { readBookingSettings } from '@/entities/tenant/lib/resolveBookingConfig';
import { normalizeAccessPoints } from '@/entities/tenant/lib/normalizeAccessPoints';
import { resolveCityTaxAmount, resolveTenantCurrency } from '@/entities/tenant/lib/resolveHostelMoney';
import { isRoomMapModuleEnabled } from '@/entities/tenant/lib/resolveGuestModuleToggles';
import {
  resolvePlanStayStatusEnabled,
  resolveTourismRegistrationConfig,
  resolveTourismRegistrationRequired,
} from '@/entities/tenant/lib/normalizeGuestStaySettings';
import {
  parseArrivalWalkByRouteJson,
  parseArrivalWalkToHostelJson,
  serializeArrivalGetOffAtByRouteJson,
  serializeArrivalLocalByRouteJson,
  serializeArrivalRouteTipsByRouteJson,
  serializeArrivalWalkByRouteJson,
  serializeArrivalWalkMapsUrlByRouteJson,
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
  const tourismRegistrationRequired = resolveTourismRegistrationRequired(mergedSettings);
  const tourismConfig = resolveTourismRegistrationConfig(mergedSettings);
  const tourismProfileId = tourismConfig?.profileId ?? '';
  const planStayStatusEnabled = resolvePlanStayStatusEnabled(mergedSettings);
  const guestStayJson =
    roomMapEnabled && mergedSettings.guestStay ? JSON.stringify(mergedSettings.guestStay) : '';
  const booking = readBookingSettings(mergedSettings);
  const accessPoints = normalizeAccessPoints(mergedSettings);
  const bedFloorMapJson = mergedSettings.arrivalAccess?.bedFloorMap
    ? JSON.stringify(mergedSettings.arrivalAccess.bedFloorMap)
    : '';

  return (
    <div aria-hidden className="hidden">
      <input type="hidden" name="logoUrl" value={mergedSettings.logoUrl ?? ''} />
      <input type="hidden" name="heroBgUrl" value={mergedSettings.heroBgUrl ?? ''} />
      <input type="hidden" name="subscriptionStartsAt" value={subscriptionStartsAt} />
      <input type="hidden" name="subscriptionEndsAt" value={subscriptionEndsAt} />
      <input type="hidden" name="houseRulesJson" value={JSON.stringify(houseRules)} />
      <input
        type="hidden"
        name="hostelPlacesJson"
        value={JSON.stringify(mergedSettings.hostelPlaces ?? [])}
      />
      {mergedSettings.cityPackNeedNowPlaceIds !== undefined ? (
        <input
          type="hidden"
          name="cityPackNeedNowPlaceIdsJson"
          value={JSON.stringify(mergedSettings.cityPackNeedNowPlaceIds)}
        />
      ) : null}
      <input
        type="hidden"
        name="guestExtrasJson"
        value={JSON.stringify(mergedSettings.guestExtras ?? [])}
      />
      <input type="hidden" name="roomMapEnabled" value={roomMapEnabled ? 'true' : 'false'} />
      <input
        type="hidden"
        name="tourismRegistrationRequired"
        value={tourismRegistrationRequired ? 'true' : 'false'}
      />
      <input type="hidden" name="tourismProfileId" value={tourismProfileId} />
      <input
        type="hidden"
        name="planStayStatusEnabled"
        value={planStayStatusEnabled ? 'true' : 'false'}
      />
      <input type="hidden" name="guestStayJson" value={guestStayJson} />
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
      <input
        type="hidden"
        name="arrivalWalkMapsUrlByRouteJson"
        value={serializeArrivalWalkMapsUrlByRouteJson(mergedSettings.arrivalWalkMapsUrlByRoute)}
      />
      <input
        type="hidden"
        name="arrivalGetOffAtByRouteJson"
        value={serializeArrivalGetOffAtByRouteJson(mergedSettings.arrivalGetOffAtByRoute)}
      />
      <input
        type="hidden"
        name="arrivalLocalByRouteJson"
        value={serializeArrivalLocalByRouteJson(mergedSettings.arrivalLocalByRoute)}
      />
      <input
        type="hidden"
        name="arrivalRouteTipsByRouteJson"
        value={serializeArrivalRouteTipsByRouteJson(mergedSettings.arrivalRouteTipsByRoute)}
      />
      <input
        type="hidden"
        name="hubTransferJson"
        value={JSON.stringify(mergedSettings.hubTransfer ?? { enabledHubCategories: [] })}
      />
      <input type="hidden" name="landingJson" value={serializeLandingJson(mergedSettings)} />
      <input type="hidden" name="hostelJson" value={serializeHostelJson(mergedSettings)} />
      <input type="hidden" name="checkInTime" value={mergedSettings.checkInTime ?? ''} />
      <input type="hidden" name="checkOutTime" value={mergedSettings.checkOutTime ?? ''} />
      <input type="hidden" name="propertyTimeZone" value={mergedSettings.propertyTimeZone ?? ''} />
      <input type="hidden" name="selfCheckInTimeAfter" value={mergedSettings.selfCheckInTimeAfter ?? ''} />
      <input
        type="hidden"
        name="operationalDayStartTime"
        value={mergedSettings.operationalDayStartTime ?? ''}
      />
      <input type="hidden" name="wifiName" value={mergedSettings.wifi?.name ?? ''} />
      <input type="hidden" name="wifiPassword" value={mergedSettings.wifi?.password ?? ''} />
      <input type="hidden" name="phoneRaw" value={mergedSettings.contacts?.phoneRaw ?? ''} />
      <input type="hidden" name="phoneMask" value={mergedSettings.contacts?.phoneMask ?? ''} />
      <input
        type="hidden"
        name="phoneFormatPreset"
        value={mergedSettings.contacts?.phoneFormatPreset ?? 'auto'}
      />
      <input
        type="hidden"
        name="bookingWhatsappPhoneRaw"
        value={mergedSettings.contacts?.bookingWhatsappPhoneRaw ?? ''}
      />
      <input type="hidden" name="taxiPhoneRaw" value={mergedSettings.contacts?.taxiPhoneRaw ?? ''} />
      <input type="hidden" name="taxiPhoneMask" value={mergedSettings.contacts?.taxiPhoneMask ?? ''} />
      <input
        type="hidden"
        name="taxiPhoneFormatPreset"
        value={mergedSettings.contacts?.taxiPhoneFormatPreset ?? 'auto'}
      />
      <input type="hidden" name="email" value={mergedSettings.contacts?.email ?? ''} />
      <input type="hidden" name="instagram" value={mergedSettings.contacts?.instagram ?? ''} />
      <input type="hidden" name="facebook" value={mergedSettings.contacts?.facebook ?? ''} />
      <input type="hidden" name="guestChatUrl" value={mergedSettings.contacts?.guestChatUrl ?? ''} />
      <input type="hidden" name="address" value={mergedSettings.contacts?.address ?? ''} />
      <input type="hidden" name="mapsUrl" value={mergedSettings.contacts?.mapsUrl ?? ''} />
      <input type="hidden" name="feedbackPhoneRaw" value={mergedSettings.contacts?.feedbackPhoneRaw ?? ''} />
      <input type="hidden" name="receptionOpen" value={mergedSettings.reception?.open ?? ''} />
      <input type="hidden" name="receptionClose" value={mergedSettings.reception?.close ?? ''} />
      <input
        type="hidden"
        name="receptionWhatsappPhoneRaw"
        value={mergedSettings.reception?.whatsappPhoneRaw ?? ''}
      />
      <input
        type="hidden"
        name="receptionAvailabilityHint"
        value={mergedSettings.reception?.availabilityHint ?? ''}
      />
      <input
        type="hidden"
        name="receptionWhatsappEnabled"
        value={mergedSettings.reception?.whatsappEnabled === false ? 'false' : 'true'}
      />
      <input
        type="hidden"
        name="receptionCanHelpWithTaxi"
        value={mergedSettings.reception?.canHelpWithTaxi === false ? 'false' : 'true'}
      />
      <input
        type="hidden"
        name="guestAccessMessageTemplate"
        value={mergedSettings.reception?.guestAccessMessageTemplate ?? ''}
      />
      <input
        type="hidden"
        name="guestAccessPinMissingText"
        value={mergedSettings.reception?.guestAccessPinMissingText ?? ''}
      />
      <input type="hidden" name="bookingProvider" value={booking.provider} />
      <input type="hidden" name="bookingEngineId" value={booking.engineId} />
      <input type="hidden" name="bookingUrl" value={booking.url} />
      <input
        type="hidden"
        name="arrivalLayoutKind"
        value={mergedSettings.arrivalAccess?.layoutKind ?? ''}
      />
      <input type="hidden" name="arrivalDayMode" value={mergedSettings.arrivalAccess?.dayMode ?? ''} />
      <input type="hidden" name="accessPointsJson" value={JSON.stringify(accessPoints)} />
      <input type="hidden" name="arrivalLandmark" value={mergedSettings.arrivalAccess?.landmark ?? ''} />
      <input type="hidden" name="bedFloorMapJson" value={bedFloorMapJson} />
      <input
        type="hidden"
        name="receptionBookingJson"
        value={JSON.stringify(mergedSettings.receptionBooking ?? { platforms: [] })}
      />
    </div>
  );
}
