'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hashDeskPin } from '@/app/reception/lib/deskPin';
import { getTenantRecord, listTenants, setTenantArchived, upsertTenant } from '@/entities/tenant/server';
import { isCityPackId } from '@/entities/hostel';
import type { HouseRule } from '@/entities/house-rules';
import { HOUSE_RULE_DETAIL_MAX, HOUSE_RULE_SUMMARY_MAX, validateHouseRule } from '@/entities/house-rules';
import type { AccessPoint, ArrivalLayoutKind, TenantSettings } from '@/entities/tenant';
import { isBookingProvider } from '@/entities/tenant';
import { normalizeGuestStayForSave } from '@/entities/tenant/lib/resolveBedDisplay';
import {
  assertAdminAuthenticated,
  clearAdminSession,
  setAdminSession,
} from './lib/adminSession';
import {
  parseArrivalWalkByRouteJson,
  parseArrivalWalkToHostelJson,
} from './(protected)/tenants/lib/parseArrivalTransportSettings';

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
      .filter((rule) => rule?.id && rule?.templateId)
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

function readSettings(formData: FormData): TenantSettings {
  const roomMapEnabled = String(formData.get('roomMapEnabled') || '').trim() === 'true';
  const houseRules = parseHouseRules(formData);

  let highlightedBedId = roomMapEnabled
    ? String(formData.get('highlightedBedId') || '').trim() || undefined
    : undefined;
  let guestStay = parseGuestStay(formData);

  if (roomMapEnabled && guestStay) {
    const normalized = normalizeGuestStayForSave(guestStay, highlightedBedId);
    guestStay = normalized.guestStay;
    highlightedBedId = normalized.highlightedBedId;
  }

  const arrivalAccessInput = readArrivalAccess(formData);
  const accessPoints = arrivalAccessInput.accessPoints ?? [];

  const bookingProviderRaw = String(formData.get('bookingProvider') || 'none').trim();
  const bookingProvider = isBookingProvider(bookingProviderRaw) ? bookingProviderRaw : 'none';
  const bookingEngineId = String(formData.get('bookingEngineId') || '').trim() || undefined;
  const bookingUrl = String(formData.get('bookingUrl') || '').trim() || undefined;

  return {
    booking:
      bookingProvider === 'none'
        ? { provider: 'none' }
        : {
            provider: bookingProvider,
            engineId: bookingEngineId,
            url: bookingUrl,
          },
    checkInTime: String(formData.get('checkInTime') || '') || undefined,
    checkOutTime: String(formData.get('checkOutTime') || '') || undefined,
    cityTax: String(formData.get('cityTax') || '') || undefined,
    selfCheckInTimeAfter: String(formData.get('selfCheckInTimeAfter') || '') || undefined,
    laundryCost: String(formData.get('laundryCost') || '') || undefined,
    heroBgUrl: String(formData.get('heroBgUrl') || '') || undefined,
    logoUrl: String(formData.get('logoUrl') || '') || undefined,
    landing: parseLanding(formData),
    highlightedBedId,
    guestStay,
    arrivalAccess: {
      layoutKind: arrivalAccessInput.layoutKind,
      dayMode: arrivalAccessInput.dayMode,
      landmark: arrivalAccessInput.landmark,
      accessPoints,
      bedFloorMap: arrivalAccessInput.bedFloorMap,
    },
    houseRules,
    hostelPlaces: parseHostelPlaces(formData),
    wifi: {
      name: String(formData.get('wifiName') || '') || undefined,
      password: String(formData.get('wifiPassword') || '') || undefined,
    },
    reception: {
      open: String(formData.get('receptionOpen') || '') || undefined,
      close: String(formData.get('receptionClose') || '') || undefined,
      whatsappPhoneRaw: String(formData.get('receptionWhatsappPhoneRaw') || '') || undefined,
      availabilityHint: String(formData.get('receptionAvailabilityHint') || '') || undefined,
      whatsappEnabled: formData.get('receptionWhatsappEnabled') === 'true',
      canHelpWithTaxi: formData.get('receptionCanHelpWithTaxi') === 'true',
    },
    contacts: {
      phoneRaw: String(formData.get('phoneRaw') || '') || undefined,
      bookingWhatsappPhoneRaw: String(formData.get('bookingWhatsappPhoneRaw') || '') || undefined,
      phoneMask: String(formData.get('phoneMask') || '') || undefined,
      taxiPhoneRaw: String(formData.get('taxiPhoneRaw') || '') || undefined,
      taxiPhoneMask: String(formData.get('taxiPhoneMask') || '') || undefined,
      email: String(formData.get('email') || '') || undefined,
      address: String(formData.get('address') || '') || undefined,
      mapsUrl: String(formData.get('mapsUrl') || '') || undefined,
      feedbackPhoneRaw: String(formData.get('feedbackPhoneRaw') || '') || undefined,
    },
    arrivalWalkToHostel:
      parseArrivalWalkToHostelJson(String(formData.get('arrivalWalkToHostelJson') || '')) ??
      (String(formData.get('arrivalWalkToHostel') || '').trim() || undefined),
    arrivalWalkToHostelByRoute: parseArrivalWalkByRouteJson(
      String(formData.get('arrivalWalkByRouteJson') || '')
    ),
  };
}

export async function loginAdminAction(formData: FormData) {
  const password = formData.get('password')?.toString() ?? '';
  const next = String(formData.get('next') || '/admin/tenants');
  const expected = process.env.ADMIN_SECRET;

  if (!expected || password !== expected) {
    redirect('/admin/login?error=1');
  }

  await setAdminSession();
  redirect(next.startsWith('/admin') ? next : '/admin/tenants');
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect('/admin/login');
}

export async function saveTenantAction(formData: FormData) {
  await assertAdminAuthenticated();

  const slug = String(formData.get('slug') || '').trim();
  const originalSlug = String(formData.get('originalSlug') || '').trim() || null;
  const name = String(formData.get('name') || '').trim();
  const cityPackIdRaw = String(formData.get('cityPackId') || 'sarajevo');
  const subscriptionStartsAt = String(formData.get('subscriptionStartsAt') || '').trim();
  const subscriptionEndsAt = String(formData.get('subscriptionEndsAt') || '').trim();
  if (!isCityPackId(cityPackIdRaw)) {
    throw new Error('Unknown city pack');
  }
  const cityPackId = cityPackIdRaw;

  if (!slug || !name) {
    throw new Error('Slug and name are required');
  }

  const lookupSlug = originalSlug || slug;
  const previousTenant = lookupSlug ? await getTenantRecord(lookupSlug) : null;
  let settings = readSettings(formData);

  if (
    previousTenant?.settings.houseRules?.length &&
    (!settings.houseRules || settings.houseRules.length === 0)
  ) {
    settings = {
      ...settings,
      houseRules: previousTenant.settings.houseRules,
    };
  }
  const deskPin = String(formData.get('receptionDeskPin') || '').trim();
  const previousHash = previousTenant?.settings.reception?.deskPinHash;

  if (deskPin) {
    settings.reception = {
      ...settings.reception,
      deskPinHash: hashDeskPin(slug, deskPin),
    };
  } else if (previousHash) {
    settings.reception = {
      ...settings.reception,
      deskPinHash: previousHash,
    };
  }

  const result = await upsertTenant({
    slug,
    originalSlug,
    name,
    cityPackId,
    settings,
    subscriptionStartsAt,
    subscriptionEndsAt,
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  revalidatePath('/admin/tenants');
  if (originalSlug) {
    revalidatePath(`/admin/tenants/${originalSlug}`);
  }
  revalidatePath(`/admin/tenants/${slug}`);
  redirect(`/admin/tenants/${slug}?saved=1`);
}

export async function setTenantArchiveAction(formData: FormData) {
  await assertAdminAuthenticated();

  const slug = String(formData.get('slug') || '').trim();
  const originalSlug = String(formData.get('originalSlug') || '').trim() || null;
  const archived = formData.get('archived') === 'true';

  if (!slug) {
    throw new Error('Slug is required');
  }

  const lookupSlug = originalSlug || slug;
  const result = await setTenantArchived(lookupSlug, archived);

  if (!result.ok) {
    throw new Error(result.error);
  }

  revalidatePath('/admin/tenants');
  if (originalSlug) {
    revalidatePath(`/admin/tenants/${originalSlug}`);
  }
  revalidatePath(`/admin/tenants/${slug}`);
  redirect(`/admin/tenants/${slug}`);
}

export async function getTenantsForAdmin() {
  return listTenants();
}
