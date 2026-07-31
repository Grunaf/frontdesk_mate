import {
  bookingComExtensionZipResponse,
  buildBookingComExtensionZip,
} from '@/shared/lib/booking-com-extension/buildBookingComExtensionZip';
import { getOwnerSession } from '@/entities/hostel-owner';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getOwnerSession();
  if (!session) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const zip = await buildBookingComExtensionZip();
    return bookingComExtensionZipResponse(zip);
  } catch (error) {
    console.error('[owner booking-com extension zip]', error);
    return Response.json({ ok: false, error: 'zip_failed' }, { status: 500 });
  }
}
