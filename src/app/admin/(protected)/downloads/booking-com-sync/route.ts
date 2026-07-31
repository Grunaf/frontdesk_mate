import {
  bookingComExtensionZipResponse,
  buildBookingComExtensionZip,
} from '@/shared/lib/booking-com-extension/buildBookingComExtensionZip';
import { isAdminAuthenticated } from '@/app/admin/lib/adminSession';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const zip = await buildBookingComExtensionZip();
    return bookingComExtensionZipResponse(zip);
  } catch (error) {
    console.error('[admin booking-com extension zip]', error);
    return Response.json({ ok: false, error: 'zip_failed' }, { status: 500 });
  }
}
