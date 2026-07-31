import {
  findTenantSlugByBookingComHotelId,
  normalizeBookingComExternalBookingBatch,
  normalizeBookingComExternalBookingInput,
  patchBookingComExternalBooking,
  upsertBookingComExternalBookings,
} from '@/entities/booking-com-external-booking/server';

export const runtime = 'nodejs';

function readBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')?.trim();
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export async function POST(request: Request) {
  const expectedSecret = process.env.BOOKING_COM_SYNC_SECRET?.trim();
  if (!expectedSecret) {
    console.error('[booking-com-webhook] BOOKING_COM_SYNC_SECRET is not configured');
    return Response.json({ ok: false, error: 'sync_not_configured' }, { status: 503 });
  }

  const provided = readBearerToken(request);
  if (!provided || !timingSafeEqual(provided, expectedSecret)) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const event = typeof record.event === 'string' ? record.event : '';

  if (event === 'bookings.upsert_batch') {
    const bookings = normalizeBookingComExternalBookingBatch(record.bookings);
    if (bookings.length === 0) {
      return Response.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }

    const hotelId = bookings[0]!.hotel_id;
    const tenantSlug = await findTenantSlugByBookingComHotelId(hotelId);
    if (!tenantSlug) {
      return Response.json({ ok: false, error: 'hotel_not_mapped' }, { status: 404 });
    }

    const result = await upsertBookingComExternalBookings({ tenantSlug, bookings });
    if (!result.ok) {
      const status =
        result.error === 'hotel_mismatch'
          ? 409
          : result.error === 'invalid_payload'
            ? 400
            : result.error === 'tenant_not_found'
              ? 404
              : 500;
      return Response.json({ ok: false, error: result.error }, { status });
    }

    return Response.json({ ok: true, upserted: result.upserted, tenantSlug });
  }

  if (event === 'bookings.patch') {
    const booking = normalizeBookingComExternalBookingInput(record.booking);
    if (!booking) {
      return Response.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }

    const tenantSlug = await findTenantSlugByBookingComHotelId(booking.hotel_id);
    if (!tenantSlug) {
      return Response.json({ ok: false, error: 'hotel_not_mapped' }, { status: 404 });
    }

    const result = await patchBookingComExternalBooking({ tenantSlug, booking });
    if (!result.ok) {
      const status =
        result.error === 'hotel_mismatch'
          ? 409
          : result.error === 'invalid_payload'
            ? 400
            : result.error === 'not_found' || result.error === 'tenant_not_found'
              ? 404
              : 500;
      return Response.json({ ok: false, error: result.error }, { status });
    }

    return Response.json({ ok: true, tenantSlug });
  }

  return Response.json({ ok: false, error: 'unknown_event' }, { status: 400 });
}
