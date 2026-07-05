import 'server-only';

import type { HouseRule } from '@/entities/house-rules';
import { HOUSE_RULE_DETAIL_MAX, HOUSE_RULE_SUMMARY_MAX, validateHouseRule } from '@/entities/house-rules';
import {
  GUEST_EXTRA_PRESET_IDS,
  type GuestExtraConfig,
  type GuestExtraPresetId,
} from '@/entities/guest-extra';
import type { AccessPoint, ArrivalLayoutKind, TenantSettings } from '@/entities/tenant';
import { isBookingProvider } from '@/entities/tenant';
import { normalizeGuestStayForSave } from '@/entities/tenant/lib/resolveBedDisplay';
import { finalizeGuestStayForSave } from '@/entities/tenant/lib/normalizeGuestStaySettings';
import {
  parseArrivalRouteTipsByRouteJson,
  parseArrivalWalkByRouteJson,
  parseArrivalWalkToHostelJson,
} from '@/app/admin/(protected)/tenants/lib/parseArrivalTransportSettings';
import { normalizePhoneDisplayPreset } from '@/shared/lib/phone-display-presets';
import { resolveStoredPhoneMask } from '@/shared/lib/phoneDisplay';
import { normalizeTimeValue } from '@/shared/lib/time';
import type { TenantHostelSettings } from '@/entities/tenant/model/hostelSettings';

function parseAccessPoints(formData: FormData): AccessPoint[] | undefined {
  const raw = String(formData.get('accessPointsJson') || '').trim();
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as AccessPoint[];
    if (!Array.isArray(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function parseBedFloorMap(formData: FormData): Record<string, string> | undefined {
  const raw = String(formData.get('bedFloorMapJson') || '').trim();
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== 'object') return undefined;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([bed, floor]) => [bed.trim(), String(floor).trim()])
        .filter(([bed, floor]) => bed && floor)
    );
  } catch {
    return undefined;
  }
}

function readArrivalAccess(formData: FormData): {
  layoutKind?: ArrivalLayoutKind;
  dayMode?: 'doorbell' | 'walk_in' | 'reception';
  landmark?: string;
  accessPoints?: AccessPoint[];
  bedFloorMap?: Record<string, string>;
} {
  const layoutKindRaw = String(formData.get('arrivalLayoutKind') || '').trim();
  const layoutKind: ArrivalLayoutKind | undefined =
    layoutKindRaw === 'building_then_zones' || layoutKindRaw === 'direct_to_floor'
      ? layoutKindRaw
      : undefined;

  const dayModeRaw = String(formData.get('arrivalDayMode') || '').trim();
  const dayMode =
    dayModeRaw === 'doorbell' || dayModeRaw === 'walk_in' || dayModeRaw === 'reception'
      ? dayModeRaw
      : undefined;

  const accessPoints = parseAccessPoints(formData);
  const bedFloorMap = parseBedFloorMap(formData);
  const landmark = String(formData.get('arrivalLandmark') || '').trim() || undefined;

  return {
    layoutKind,
    dayMode,
    landmark,
    accessPoints,
    bedFloorMap,
  };
}

function parseGuestStay(formData: FormData): TenantSettings['guestStay'] {
  const enabled = String(formData.get('roomMapEnabled') || '').trim() === 'true';
  if (!enabled) {
    return undefined;
  }

  const raw = String(formData.get('guestStayJson') || '').trim();
  if (!raw) return undefined;

  try {
    return JSON.parse(raw) as TenantSettings['guestStay'];
  } catch {
    return undefined;
  }
}

function parseLanding(formData: FormData): TenantSettings['landing'] {
  const raw = String(formData.get('landingJson') || '').trim();
  let landing: TenantSettings['landing'] = {};

  if (raw) {
    try {
      landing = JSON.parse(raw) as TenantSettings['landing'];
    } catch {
      landing = {};
    }
  }

  const roomsSectionTitle =
    String(formData.get('landingRoomsSectionTitle') || '').trim() || undefined;
  const roomsSectionSubtitle =
    String(formData.get('landingRoomsSectionSubtitle') || '').trim() || undefined;

  return {
    ...landing,
    roomsSectionTitle: roomsSectionTitle ?? landing?.roomsSectionTitle,
    roomsSectionSubtitle: roomsSectionSubtitle ?? landing?.roomsSectionSubtitle,
    roomTypes: landing?.roomTypes,
  };
}

function parseHostelPlaces(formData: FormData): TenantSettings['hostelPlaces'] {
  const raw = String(formData.get('hostelPlacesJson') || '').trim();
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as TenantSettings['hostelPlaces'];
    if (!Array.isArray(parsed)) {
      return undefined;
    }
    return parsed
      .filter((place) => place?.id && place?.name?.trim())
      .map((place) => ({
        id: place.id,
        name: place.name.trim(),
        category: place.category,
        walkHint: place.walkHint?.trim() || undefined,
        mapsUrl: place.mapsUrl?.trim() || undefined,
        note: place.note?.trim() || undefined,
      }));
  } catch {
    return undefined;
  }
}

function parseCityPackNeedNowPlaceIds(
  formData: FormData
): TenantSettings['cityPackNeedNowPlaceIds'] {
  if (!formData.has('cityPackNeedNowPlaceIdsJson')) {
    return undefined;
  }

  const raw = String(formData.get('cityPackNeedNowPlaceIdsJson') || '').trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim());
  } catch {
    return [];
  }
}

function isGuestExtraPresetId(value: string): value is GuestExtraPresetId {
  return (GUEST_EXTRA_PRESET_IDS as readonly string[]).includes(value);
}

function parseGuestExtras(formData: FormData): GuestExtraConfig[] | undefined {
  const raw = String(formData.get('guestExtrasJson') || '').trim();
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as GuestExtraConfig[];
    if (!Array.isArray(parsed)) {
      return undefined;
    }

    return parsed
      .filter((entry) => entry?.presetId && isGuestExtraPresetId(entry.presetId))
      .map((entry) => ({
        presetId: entry.presetId,
        enabled: entry.enabled === true,
        highlight: entry.highlight === true ? true : undefined,
        imageUrl: String(entry.imageUrl ?? '').trim() || undefined,
        priceLabel: String(entry.priceLabel ?? '').trim() || undefined,
        scheduleLabel: String(entry.scheduleLabel ?? '').trim() || undefined,
        externalUrl: String(entry.externalUrl ?? '').trim() || undefined,
        whatsappEnabled: entry.whatsappEnabled === false ? false : undefined,
      }));
  } catch {
    return undefined;
  }
}

function parseHouseRules(formData: FormData): HouseRule[] | undefined {
  const raw = String(formData.get('houseRulesJson') || '').trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as HouseRule[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((rule) => rule?.id && rule?.templateId && String(rule.templateId) !== 'laundry')
      .map((rule) => {
        if (rule.templateId === 'custom') {
          return {
            id: rule.id,
            templateId: 'custom' as const,
            enabled: rule.enabled !== false,
            summary: String(rule.summary ?? '').trim(),
            detail: String(rule.detail ?? '').trim(),
            icon: rule.icon,
          };
        }

        return {
          id: rule.id,
          templateId: rule.templateId,
          enabled: rule.enabled !== false,
          params: rule.params,
        };
      })
      .filter((rule) => {
        if (rule.templateId === 'custom') {
          if (rule.summary.length > HOUSE_RULE_SUMMARY_MAX) return false;
          if (rule.detail.length > HOUSE_RULE_DETAIL_MAX) return false;
        }
        return validateHouseRule(rule).valid || !rule.enabled;
      });
  } catch {
    return [];
  }
}

function readPhoneField(
  formData: FormData,
  rawKey: string,
  maskKey: string,
  presetKey: string
): {
  raw?: string;
  mask?: string;
  preset?: string;
} {
  const raw = String(formData.get(rawKey) || '').trim() || undefined;
  const preset = normalizePhoneDisplayPreset(String(formData.get(presetKey) || ''));
  const maskInput = String(formData.get(maskKey) || '').trim() || undefined;

  if (!raw) {
    return {};
  }

  return {
    raw,
    preset: preset ?? 'auto',
    mask: resolveStoredPhoneMask(raw, maskInput, preset ?? 'auto'),
  };
}

function parseHostelJson(formData: FormData): TenantHostelSettings | undefined {
  const raw = String(formData.get('hostelJson') || '').trim();
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as TenantHostelSettings;
  } catch {
    return undefined;
  }
}

export function parseTenantSettingsFormData(formData: FormData): TenantSettings {
  const roomMapEnabled = String(formData.get('roomMapEnabled') || '').trim() === 'true';
  const tourismRegistrationRequired =
    String(formData.get('tourismRegistrationRequired') || '').trim() === 'true';
  const tourismProfileId = String(formData.get('tourismProfileId') || '').trim() || undefined;
  const houseRules = parseHouseRules(formData);

  let guestStay = parseGuestStay(formData);

  if (roomMapEnabled && guestStay) {
    guestStay = normalizeGuestStayForSave(guestStay);
  }

  guestStay = finalizeGuestStayForSave({
    roomMapEnabled,
    guestStay: roomMapEnabled ? guestStay : undefined,
    tourismRegistrationRequired,
    tourismProfileId,
  });

  const arrivalAccessInput = readArrivalAccess(formData);
  const accessPoints = arrivalAccessInput.accessPoints ?? [];

  const bookingProviderRaw = String(formData.get('bookingProvider') || 'none').trim();
  const bookingProvider = isBookingProvider(bookingProviderRaw) ? bookingProviderRaw : 'none';
  const bookingEngineId = String(formData.get('bookingEngineId') || '').trim() || undefined;
  const bookingUrl = String(formData.get('bookingUrl') || '').trim() || undefined;
  const guestExtras = parseGuestExtras(formData);
  const laundryPrice = guestExtras?.find(
    (entry) => entry.presetId === 'laundry' && entry.enabled
  )?.priceLabel;
  const hostel = parseHostelJson(formData);

  return {
    booking:
      bookingProvider === 'none'
        ? { provider: 'none' }
        : {
            provider: bookingProvider,
            engineId: bookingEngineId,
            url: bookingUrl,
          },
    checkInTime: normalizeTimeValue(String(formData.get('checkInTime') || '')),
    checkOutTime: normalizeTimeValue(String(formData.get('checkOutTime') || '')),
    selfCheckInTimeAfter: normalizeTimeValue(String(formData.get('selfCheckInTimeAfter') || '')),
    cityTax: undefined,
    laundryCost: laundryPrice,
    heroBgUrl: String(formData.get('heroBgUrl') || '') || undefined,
    logoUrl: String(formData.get('logoUrl') || '') || undefined,
    landing: parseLanding(formData),
    hostel,
    guestStay,
    arrivalAccess: {
      layoutKind: arrivalAccessInput.layoutKind,
      dayMode: arrivalAccessInput.dayMode,
      landmark: arrivalAccessInput.landmark,
      accessPoints,
      bedFloorMap: arrivalAccessInput.bedFloorMap,
    },
    houseRules,
    guestExtras,
    hostelPlaces: parseHostelPlaces(formData),
    cityPackNeedNowPlaceIds: parseCityPackNeedNowPlaceIds(formData),
    wifi: {
      name: String(formData.get('wifiName') || '') || undefined,
      password: String(formData.get('wifiPassword') || '') || undefined,
    },
    reception: {
      open: normalizeTimeValue(String(formData.get('receptionOpen') || '')),
      close: normalizeTimeValue(String(formData.get('receptionClose') || '')),
      whatsappPhoneRaw: String(formData.get('receptionWhatsappPhoneRaw') || '') || undefined,
      availabilityHint: String(formData.get('receptionAvailabilityHint') || '') || undefined,
      guestAccessMessageTemplate:
        String(formData.get('guestAccessMessageTemplate') || '').trim() || undefined,
      guestAccessPinMissingText:
        String(formData.get('guestAccessPinMissingText') || '').trim() || undefined,
      whatsappEnabled: formData.get('receptionWhatsappEnabled') === 'true',
      canHelpWithTaxi: formData.get('receptionCanHelpWithTaxi') === 'true',
    },
    contacts: (() => {
      const phone = readPhoneField(formData, 'phoneRaw', 'phoneMask', 'phoneFormatPreset');
      const taxiPhone = readPhoneField(
        formData,
        'taxiPhoneRaw',
        'taxiPhoneMask',
        'taxiPhoneFormatPreset'
      );

      return {
        phoneRaw: phone.raw,
        phoneMask: phone.mask,
        phoneFormatPreset: phone.preset,
        bookingWhatsappPhoneRaw:
          String(formData.get('bookingWhatsappPhoneRaw') || '') || undefined,
        taxiPhoneRaw: taxiPhone.raw,
        taxiPhoneMask: taxiPhone.mask,
        taxiPhoneFormatPreset: taxiPhone.preset,
        email: String(formData.get('email') || '') || undefined,
        address: String(formData.get('address') || '') || undefined,
        mapsUrl: String(formData.get('mapsUrl') || '') || undefined,
        feedbackPhoneRaw: String(formData.get('feedbackPhoneRaw') || '') || undefined,
      };
    })(),
    arrivalWalkToHostel:
      parseArrivalWalkToHostelJson(String(formData.get('arrivalWalkToHostelJson') || '')) ??
      (String(formData.get('arrivalWalkToHostel') || '').trim() || undefined),
    arrivalWalkToHostelByRoute: parseArrivalWalkByRouteJson(
      String(formData.get('arrivalWalkByRouteJson') || '')
    ),
    arrivalRouteTipsByRoute: parseArrivalRouteTipsByRouteJson(
      String(formData.get('arrivalRouteTipsByRouteJson') || '')
    ),
  };
}

