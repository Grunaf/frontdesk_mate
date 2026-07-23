import type { TenantSettings } from '@/entities/tenant';

type Contacts = NonNullable<TenantSettings['contacts']>;

const CONTACT_FORM_KEYS: { form: string; key: keyof Contacts }[] = [
  { form: 'phoneRaw', key: 'phoneRaw' },
  { form: 'phoneMask', key: 'phoneMask' },
  { form: 'phoneFormatPreset', key: 'phoneFormatPreset' },
  { form: 'bookingWhatsappPhoneRaw', key: 'bookingWhatsappPhoneRaw' },
  { form: 'taxiPhoneRaw', key: 'taxiPhoneRaw' },
  { form: 'taxiPhoneMask', key: 'taxiPhoneMask' },
  { form: 'taxiPhoneFormatPreset', key: 'taxiPhoneFormatPreset' },
  { form: 'email', key: 'email' },
  { form: 'instagram', key: 'instagram' },
  { form: 'facebook', key: 'facebook' },
  { form: 'guestChatUrl', key: 'guestChatUrl' },
  { form: 'address', key: 'address' },
  { form: 'mapsUrl', key: 'mapsUrl' },
  { form: 'feedbackPhoneRaw', key: 'feedbackPhoneRaw' },
];

function mergeContactsFromForm(
  formData: FormData,
  incoming: TenantSettings['contacts'],
  previous: TenantSettings['contacts']
): TenantSettings['contacts'] {
  const base: Contacts = { ...(previous ?? {}) };

  for (const { form, key } of CONTACT_FORM_KEYS) {
    if (formData.has(form)) {
      base[key] = incoming?.[key];
    }
  }

  return Object.keys(base).length > 0 ? base : incoming;
}

/**
 * Admin tenant form mounts section fields conditionally. Missing inputs must not wipe DB values.
 */
export function mergeTenantSettingsWithPrevious(
  formData: FormData,
  settings: TenantSettings,
  previous: TenantSettings | undefined
): TenantSettings {
  if (!previous) {
    return settings;
  }

  let merged: TenantSettings = { ...settings };

  if (!formData.has('checkInTime')) {
    merged.checkInTime = previous.checkInTime;
  }
  if (!formData.has('checkOutTime')) {
    merged.checkOutTime = previous.checkOutTime;
  }
  if (!formData.has('selfCheckInTimeAfter')) {
    merged.selfCheckInTimeAfter = previous.selfCheckInTimeAfter;
  }
  if (!formData.has('operationalDayStartTime')) {
    merged.operationalDayStartTime = previous.operationalDayStartTime;
  }
  if (!formData.has('propertyTimeZone')) {
    merged.propertyTimeZone = previous.propertyTimeZone;
  }

  if (!formData.has('wifiName')) {
    merged.wifi = previous.wifi;
  }

  merged.contacts = mergeContactsFromForm(formData, settings.contacts, previous.contacts);

  if (!formData.has('receptionOpen')) {
    merged.reception = { ...previous.reception };
    if (formData.has('guestAccessMessageTemplate')) {
      merged.reception = {
        ...merged.reception,
        guestAccessMessageTemplate: settings.reception?.guestAccessMessageTemplate,
      };
    }
    if (formData.has('guestAccessPinMissingText')) {
      merged.reception = {
        ...merged.reception,
        guestAccessPinMissingText: settings.reception?.guestAccessPinMissingText,
      };
    }
  } else {
    merged.reception = {
      ...previous.reception,
      ...settings.reception,
    };
  }

  if (!formData.has('bookingProvider')) {
    merged.booking = previous.booking;
  }

  if (!formData.has('receptionBookingJson')) {
    merged.receptionBooking = previous.receptionBooking;
  }

  if (!formData.has('arrivalLayoutKind')) {
    merged.arrivalAccess = previous.arrivalAccess;
  } else {
    merged.arrivalAccess = {
      ...previous.arrivalAccess,
      ...settings.arrivalAccess,
    };
  }

  if (!settings.hostel && previous.hostel) {
    merged.hostel = previous.hostel;
  }

  if (!formData.has('stayOffersJson') && previous.stayOffers?.length) {
    merged.stayOffers = previous.stayOffers;
  }

  if (!formData.has('laundryJson') && previous.laundry?.machines?.length) {
    merged.laundry = previous.laundry;
  }

  const previousHasLandingRooms =
    Boolean(previous.landing?.roomCards?.length) || Boolean(previous.landing?.roomTypes?.length);
  const incomingHasLandingRooms =
    Boolean(settings.landing?.roomCards?.length) || Boolean(settings.landing?.roomTypes?.length);

  if (!incomingHasLandingRooms && previousHasLandingRooms) {
    merged.landing = {
      ...previous.landing,
      ...settings.landing,
      roomCards: previous.landing?.roomCards,
      roomTypes: previous.landing?.roomTypes,
    };
  }

  if (
    settings.guestExtras === undefined &&
    previous.guestExtras &&
    previous.guestExtras.length > 0
  ) {
    merged.guestExtras = previous.guestExtras;
  }

  if (
    settings.cityPackNeedNowPlaceIds === undefined &&
    previous.cityPackNeedNowPlaceIds !== undefined
  ) {
    merged.cityPackNeedNowPlaceIds = previous.cityPackNeedNowPlaceIds;
  }

  if (previous.houseRules?.length && (!merged.houseRules || merged.houseRules.length === 0)) {
    merged.houseRules = previous.houseRules;
  }

  return merged;
}
