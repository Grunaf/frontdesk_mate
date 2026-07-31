import { resolveGuestSessionFromCookies } from '@/entities/guest-stay/server';
import {
  isBedReadyForGuestVisibility,
  resolveIsBedVisible,
} from '@/entities/guest-stay';
import {
  isEntryDateComplete,
  isTourismRegistrationComplete,
  resolveSharedEntryStampDate,
} from '@/entities/guest-tourism-registration';
import { getTourismRegistrationByStayId } from '@/entities/guest-tourism-registration/server';
import { resolveTourismRegistrationRequired } from '@/entities/tenant';
import { getTenantRecord } from '@/entities/tenant/server';
import { listHousekeepingBedStatuses } from '@/entities/housekeeping/server';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { isStayContactComplete } from './isStayContactComplete';

export type StaySetupStatus = {
  tourismRequired: boolean;
  tourismComplete: boolean;
  /** Guests on the tourism registration (0 when tourism not required / missing). */
  tourismGuestCount: number;
  entryDateComplete: boolean;
  entryStampDate: string | null;
  contactComplete: boolean;
  /** Desk admitted guest to settle in (`passport_checked_at` set). */
  passportVerified: boolean;
  /** Housekeeping marked bed ready. */
  bedReady: boolean;
  /** Guest may see bed assignment (ready + time/unlock/admit). */
  bedVisible: boolean;
  /** Confirmed phone (E.164), or tourism fallback for display/prefill. */
  contactPhone: string | null;
  /** Guest-proposed phone awaiting desk confirm. */
  contactPhonePending: string | null;
  /** Reception-set email (guest cannot edit). */
  contactEmail: string | null;
  /**
   * @deprecated Prefer `contactPhone`. Kept for existing callers during rename.
   */
  stayContactWhatsapp: string | null;
  completedSteps: number;
  totalSteps: number;
};

export type ResolveStaySetupStatusResult =
  | { ok: true; status: StaySetupStatus }
  | { ok: false; error: 'unauthorized' | 'db_unavailable' };

/** Shared stay-setup status for SSR pages and `getStaySetupStatusAction`. */
export async function resolveStaySetupStatus(
  tenantSlug: string
): Promise<ResolveStaySetupStatusResult> {
  const slug = tenantSlug.trim();
  if (!slug) {
    return { ok: false, error: 'unauthorized' };
  }

  const tenant = await getTenantRecord(slug);
  if (!tenant) {
    return { ok: false, error: 'unauthorized' };
  }

  const session = await resolveGuestSessionFromCookies(slug);
  if (!session) {
    return { ok: false, error: 'unauthorized' };
  }

  const tourismRequired = resolveTourismRegistrationRequired(tenant.settings);
  let tourismComplete = false;
  let tourismGuestCount = 0;
  let entryDateComplete = false;
  let entryStampDate: string | null = null;

  if (tourismRequired) {
    const registration = await getTourismRegistrationByStayId(session.stayId);
    tourismGuestCount = registration?.guests.length ?? 0;
    tourismComplete = registration ? isTourismRegistrationComplete(registration) : false;
    entryDateComplete = registration ? isEntryDateComplete(registration) : false;
    entryStampDate = registration ? resolveSharedEntryStampDate(registration) : null;
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: 'db_unavailable' };
  }

  const { data, error } = await admin
    .from('guest_reservations')
    .select(
      'bed_id, contact_phone, contact_phone_pending, contact_email, tourism_contact_whatsapp, passport_checked_at, desk_checked_in_at, bed_unlocked_at, check_in_at, check_in_date'
    )
    .eq('id', session.stayId)
    .maybeSingle();

  if (error) {
    console.error('resolveStaySetupStatus:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const contactPhone = data?.contact_phone ? String(data.contact_phone) : null;
  const contactPhonePending = data?.contact_phone_pending
    ? String(data.contact_phone_pending)
    : null;
  const contactEmail = data?.contact_email ? String(data.contact_email) : null;
  const legacyTourismContact = data?.tourism_contact_whatsapp
    ? String(data.tourism_contact_whatsapp)
    : null;

  const contactComplete = isStayContactComplete({
    contactPhone,
    legacyTourismContactWhatsapp: legacyTourismContact,
  });
  const passportVerified = Boolean(data?.passport_checked_at);
  const displayPhone = contactPhone ?? legacyTourismContact;

  const bedId = data?.bed_id ? String(data.bed_id) : session.bedId;
  const bedStatuses = await listHousekeepingBedStatuses(tenant.id);
  const bedStatus = bedStatuses.find((row) => row.bed_id === bedId)?.status;
  const bedReady = isBedReadyForGuestVisibility(bedStatus);
  const bedVisible = resolveIsBedVisible({
    bedStatus,
    passport_checked_at: data?.passport_checked_at ? String(data.passport_checked_at) : null,
    desk_checked_in_at: data?.desk_checked_in_at ? String(data.desk_checked_in_at) : null,
    bed_unlocked_at: data?.bed_unlocked_at ? String(data.bed_unlocked_at) : null,
    check_in_at: data?.check_in_at ? String(data.check_in_at) : session.checkInAt,
    check_in_date: data?.check_in_date
      ? String(data.check_in_date).slice(0, 10)
      : session.checkInDate,
    propertyTimeZone: tenant.settings?.propertyTimeZone,
    checkInTimeFallback: tenant.settings?.checkInTime,
  });

  const totalSteps = tourismRequired ? 3 : 2;
  let completedSteps = 0;
  if (tourismRequired && tourismComplete) {
    completedSteps += 1;
  }
  if (tourismRequired && entryDateComplete) {
    completedSteps += 1;
  }
  if (contactComplete) {
    completedSteps += 1;
  }

  return {
    ok: true,
    status: {
      tourismRequired,
      tourismComplete,
      tourismGuestCount,
      entryDateComplete,
      entryStampDate,
      contactComplete,
      passportVerified,
      bedReady,
      bedVisible,
      contactPhone: displayPhone,
      contactPhonePending,
      contactEmail,
      stayContactWhatsapp: displayPhone,
      completedSteps,
      totalSteps,
    },
  };
}
