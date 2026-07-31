'use server';

import { revalidatePath } from 'next/cache';
import {
  countOpenBookingComExternalBookings,
  getBookingComExternalBooking,
  listBookingComExternalBookings,
  setBookingComExternalBookingInboxStatus,
} from '@/entities/booking-com-external-booking/server';
import type {
  BookingComExternalBookingRecord,
  ListBookingComExternalBookingsFilter,
  ResolveBookingComExternalBookingResult,
} from '@/entities/booking-com-external-booking/server';
import {
  assertReceptionCheckInAccess,
  resolveReceptionStaffContext,
} from '../lib/resolveReceptionStaffContext';

async function requireCheckIn(tenantSlug: string) {
  const staff = await resolveReceptionStaffContext(tenantSlug);
  if (!staff.ok) return staff;
  const gate = assertReceptionCheckInAccess(staff.ctx);
  if (!gate.ok) return gate;
  return staff;
}

export async function listBookingComExternalBookingsAction(
  tenantSlug: string,
  filter: ListBookingComExternalBookingsFilter
): Promise<BookingComExternalBookingRecord[]> {
  const staff = await requireCheckIn(tenantSlug);
  if (!staff.ok) return [];

  return listBookingComExternalBookings(tenantSlug, filter);
}

export async function countOpenBookingComExternalBookingsAction(
  tenantSlug: string
): Promise<number> {
  const staff = await requireCheckIn(tenantSlug);
  if (!staff.ok) return 0;

  return countOpenBookingComExternalBookings(tenantSlug);
}

export async function getBookingComExternalBookingAction(input: {
  tenantSlug: string;
  bookingRowId: string;
}): Promise<BookingComExternalBookingRecord | null> {
  const staff = await requireCheckIn(input.tenantSlug);
  if (!staff.ok) return null;

  return getBookingComExternalBooking(input);
}

export async function dismissBookingComExternalBookingAction(input: {
  tenantSlug: string;
  bookingRowId: string;
}): Promise<ResolveBookingComExternalBookingResult> {
  const staff = await requireCheckIn(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: 'not_found' };
  }

  try {
    const result = await setBookingComExternalBookingInboxStatus({
      tenantSlug: input.tenantSlug,
      bookingRowId: input.bookingRowId,
      inboxStatus: 'dismissed',
    });
    if (result.ok) {
      revalidatePath('/');
    }
    return result;
  } catch (error) {
    console.error('dismissBookingComExternalBookingAction:', error);
    return { ok: false, error: 'db_unavailable' };
  }
}

export async function markBookingComExternalBookingIssuedAction(input: {
  tenantSlug: string;
  bookingRowId: string;
  issuedStayId: string;
}): Promise<ResolveBookingComExternalBookingResult> {
  const staff = await requireCheckIn(input.tenantSlug);
  if (!staff.ok) {
    return { ok: false, error: 'not_found' };
  }

  try {
    const result = await setBookingComExternalBookingInboxStatus({
      tenantSlug: input.tenantSlug,
      bookingRowId: input.bookingRowId,
      inboxStatus: 'done',
      issuedStayId: input.issuedStayId,
    });
    if (result.ok) {
      revalidatePath('/');
    }
    return result;
  } catch (error) {
    console.error('markBookingComExternalBookingIssuedAction:', error);
    return { ok: false, error: 'db_unavailable' };
  }
}
