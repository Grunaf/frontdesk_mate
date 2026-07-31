import 'server-only';

import { getSupabaseAdmin } from '@/shared/lib/db/admin';
import { resolveBookingComHotelId } from '@/entities/tenant/lib/normalizeReceptionBookingSettings';
import type { TenantSettings } from '@/entities/tenant';

/**
 * Resolve tenant slug from Booking.com hotel/property id configured in admin.
 * Scans tenants (small N for this product). Returns null if none or ambiguous.
 */
export async function findTenantSlugByBookingComHotelId(
  hotelId: string
): Promise<string | null> {
  const trimmed = hotelId.trim();
  if (!trimmed) return null;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin.from('tenants').select('slug, settings');
  if (error) {
    console.error('findTenantSlugByBookingComHotelId:', error.message);
    return null;
  }

  const matches: string[] = [];
  for (const row of data ?? []) {
    const slug = String((row as { slug: string }).slug ?? '');
    const settings = (row as { settings: TenantSettings | null }).settings ?? undefined;
    const configured = resolveBookingComHotelId(settings);
    if (configured && configured === trimmed) {
      matches.push(slug);
    }
  }

  if (matches.length !== 1) {
    if (matches.length > 1) {
      console.error('findTenantSlugByBookingComHotelId: ambiguous hotel_id', trimmed);
    }
    return null;
  }

  return matches[0] ?? null;
}
