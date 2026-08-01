import 'server-only';

import { getTenantRecord } from '@/entities/tenant/server';
import { resolveBookingComHotelId } from '@/entities/tenant/lib/normalizeReceptionBookingSettings';
import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import type {
  BookingComExternalBookingInput,
  BookingComExternalBookingRecord,
  ListBookingComExternalBookingsFilter,
  PatchBookingComExternalBookingResult,
  ResolveBookingComExternalBookingResult,
  UpsertBookingComExternalBookingsResult,
} from '../model/types';

const COLUMNS =
  'id, tenant_id, hotel_id, booking_id, guest_name, phone_number, guest_email, adults, children, check_in, check_out, amount, currency, booking_status, room_name, inbox_status, source, captured_at, issued_stay_id, created_at, updated_at';

function mapRow(row: Record<string, unknown>): BookingComExternalBookingRecord {
  const checkIn = row.check_in;
  const checkOut = row.check_out;
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    hotel_id: String(row.hotel_id),
    booking_id: String(row.booking_id),
    guest_name: row.guest_name ? String(row.guest_name) : null,
    phone_number: row.phone_number ? String(row.phone_number) : null,
    guest_email: row.guest_email ? String(row.guest_email) : null,
    adults: typeof row.adults === 'number' ? row.adults : row.adults != null ? Number(row.adults) : null,
    children:
      typeof row.children === 'number' ? row.children : row.children != null ? Number(row.children) : null,
    check_in: checkIn ? String(checkIn).slice(0, 10) : null,
    check_out: checkOut ? String(checkOut).slice(0, 10) : null,
    amount: typeof row.amount === 'number' ? row.amount : row.amount != null ? Number(row.amount) : null,
    currency: row.currency ? String(row.currency) : null,
    booking_status: String(row.booking_status) as BookingComExternalBookingRecord['booking_status'],
    room_name: row.room_name ? String(row.room_name) : null,
    inbox_status: String(row.inbox_status) as BookingComExternalBookingRecord['inbox_status'],
    source: String(row.source) as BookingComExternalBookingRecord['source'],
    captured_at: row.captured_at ? String(row.captured_at) : null,
    issued_stay_id: row.issued_stay_id ? String(row.issued_stay_id) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function assertHotelMatch(
  tenantSlug: string,
  hotelId: string
): Promise<{ ok: true; tenantId: string } | { ok: false; error: 'tenant_not_found' | 'hotel_mismatch' }> {
  return getTenantRecord(tenantSlug).then((tenant) => {
    if (!tenant) return { ok: false as const, error: 'tenant_not_found' as const };
    const configured = resolveBookingComHotelId(tenant.settings);
    if (!configured || configured !== hotelId) {
      return { ok: false as const, error: 'hotel_mismatch' as const };
    }
    return { ok: true as const, tenantId: tenant.id };
  });
}

function buildUpsertRow(
  tenantId: string,
  input: BookingComExternalBookingInput,
  nowIso: string
): Record<string, unknown> {
  return {
    tenant_id: tenantId,
    hotel_id: input.hotel_id,
    booking_id: input.booking_id,
    guest_name: input.guest_name ?? null,
    adults: input.adults ?? null,
    children: input.children ?? null,
    check_in: input.check_in ?? null,
    check_out: input.check_out ?? null,
    amount: input.amount ?? null,
    currency: input.currency ?? null,
    booking_status: input.status ?? 'unknown',
    room_name: input.room_name ?? null,
    source: input.source ?? 'list_api',
    captured_at: input.captured_at ?? nowIso,
    updated_at: nowIso,
    ...(input.phone_number ? { phone_number: input.phone_number } : {}),
    ...(input.guest_email ? { guest_email: input.guest_email } : {}),
  };
}

export async function upsertBookingComExternalBookings(input: {
  tenantSlug: string;
  bookings: BookingComExternalBookingInput[];
}): Promise<UpsertBookingComExternalBookingsResult> {
  if (input.bookings.length === 0) {
    return { ok: false, error: 'invalid_payload' };
  }

  const hotelId = input.bookings[0]?.hotel_id;
  if (!hotelId || input.bookings.some((b) => b.hotel_id !== hotelId)) {
    return { ok: false, error: 'invalid_payload' };
  }

  const gate = await assertHotelMatch(input.tenantSlug, hotelId);
  if (!gate.ok) return gate;

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'db_unavailable' };

  const nowIso = new Date().toISOString();
  const bookingIds = input.bookings.map((b) => b.booking_id);

  const { data: existing, error: existingError } = await admin
    .from('booking_com_external_bookings')
    .select('booking_id, phone_number, guest_email')
    .eq('tenant_id', gate.tenantId)
    .eq('hotel_id', hotelId)
    .in('booking_id', bookingIds);

  if (existingError) {
    console.error('upsertBookingComExternalBookings existing phones:', existingError.message);
    return { ok: false, error: 'db_unavailable' };
  }

  const existingById = new Map(
    (existing ?? []).map((row) => {
      const r = row as { booking_id: string; phone_number: string | null; guest_email: string | null };
      return [
        String(r.booking_id),
        {
          phone: r.phone_number?.trim() || null,
          email: r.guest_email?.trim() || null,
        },
      ] as const;
    })
  );

  const rows = input.bookings.map((booking) => {
    const row = buildUpsertRow(gate.tenantId, booking, nowIso);
    const kept = existingById.get(booking.booking_id);
    if (!booking.phone_number && kept?.phone) row.phone_number = kept.phone;
    if (!booking.guest_email && kept?.email) row.guest_email = kept.email;
    return row;
  });

  const { error } = await admin.from('booking_com_external_bookings').upsert(rows, {
    onConflict: 'tenant_id,hotel_id,booking_id',
    ignoreDuplicates: false,
  });

  if (error) {
    console.error('upsertBookingComExternalBookings:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  return { ok: true, upserted: input.bookings.length };
}

export async function patchBookingComExternalBooking(input: {
  tenantSlug: string;
  booking: BookingComExternalBookingInput;
}): Promise<PatchBookingComExternalBookingResult> {
  const gate = await assertHotelMatch(input.tenantSlug, input.booking.hotel_id);
  if (!gate.ok) return gate;

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'db_unavailable' };

  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = {
    updated_at: nowIso,
    source: input.booking.source ?? 'detail_api',
  };
  if (input.booking.phone_number) patch.phone_number = input.booking.phone_number;
  if (input.booking.guest_email) patch.guest_email = input.booking.guest_email;
  if (input.booking.guest_name) patch.guest_name = input.booking.guest_name;
  if (input.booking.adults != null) patch.adults = input.booking.adults;
  if (input.booking.children != null) patch.children = input.booking.children;
  if (input.booking.check_in) patch.check_in = input.booking.check_in;
  if (input.booking.check_out) patch.check_out = input.booking.check_out;
  if (input.booking.amount != null) patch.amount = input.booking.amount;
  if (input.booking.currency) patch.currency = input.booking.currency;
  if (input.booking.status) patch.booking_status = input.booking.status;
  if (input.booking.room_name) patch.room_name = input.booking.room_name;
  if (input.booking.captured_at) patch.captured_at = input.booking.captured_at;

  const { data, error } = await admin
    .from('booking_com_external_bookings')
    .update(patch)
    .eq('tenant_id', gate.tenantId)
    .eq('hotel_id', input.booking.hotel_id)
    .eq('booking_id', input.booking.booking_id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('patchBookingComExternalBooking:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) {
    // Detail opened before list sync — upsert a minimal row.
    const upsert = await upsertBookingComExternalBookings({
      tenantSlug: input.tenantSlug,
      bookings: [{ ...input.booking, source: input.booking.source ?? 'detail_api' }],
    });
    if (!upsert.ok) {
      return { ok: false, error: upsert.error === 'invalid_payload' ? 'invalid_payload' : upsert.error };
    }
  }

  return { ok: true };
}

export async function listBookingComExternalBookings(
  tenantSlug: string,
  filter: ListBookingComExternalBookingsFilter
): Promise<BookingComExternalBookingRecord[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return [];

  const { data, error } = await admin
    .from('booking_com_external_bookings')
    .select(COLUMNS)
    .eq('tenant_id', tenant.id)
    .eq('inbox_status', filter)
    .order('check_in', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('listBookingComExternalBookings:', error.message);
    return [];
  }

  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function countOpenBookingComExternalBookings(tenantSlug: string): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin) return 0;

  const tenant = await getTenantRecord(tenantSlug);
  if (!tenant) return 0;

  const { count, error } = await admin
    .from('booking_com_external_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .eq('inbox_status', 'open');

  if (error) {
    console.error('countOpenBookingComExternalBookings:', error.message);
    return 0;
  }

  return count ?? 0;
}

export async function getBookingComExternalBooking(input: {
  tenantSlug: string;
  bookingRowId: string;
}): Promise<BookingComExternalBookingRecord | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) return null;

  const { data, error } = await admin
    .from('booking_com_external_bookings')
    .select(COLUMNS)
    .eq('tenant_id', tenant.id)
    .eq('id', input.bookingRowId)
    .maybeSingle();

  if (error) {
    console.error('getBookingComExternalBooking:', error.message);
    return null;
  }

  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function setBookingComExternalBookingInboxStatus(input: {
  tenantSlug: string;
  bookingRowId: string;
  inboxStatus: 'done' | 'dismissed';
  issuedStayId?: string | null;
}): Promise<ResolveBookingComExternalBookingResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: 'db_unavailable' };

  const tenant = await getTenantRecord(input.tenantSlug);
  if (!tenant) return { ok: false, error: 'not_found' };

  const { data, error } = await admin
    .from('booking_com_external_bookings')
    .update({
      inbox_status: input.inboxStatus,
      updated_at: new Date().toISOString(),
      ...(input.issuedStayId ? { issued_stay_id: input.issuedStayId } : {}),
    })
    .eq('id', input.bookingRowId)
    .eq('tenant_id', tenant.id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('setBookingComExternalBookingInboxStatus:', error.message);
    return { ok: false, error: 'db_unavailable' };
  }

  if (!data) return { ok: false, error: 'not_found' };
  return { ok: true };
}
