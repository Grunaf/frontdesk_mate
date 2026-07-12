import { formatPropertyLocalCheckInIso } from './stayCheckInMoment';
import { stayCalendarDay } from './stayCalendarDay';

export type ReservationStayPeriod = {
  checkInDate: string;
  checkOutDate: string;
  checkInAt: string;
  checkOutAt: string;
};

function fallbackCheckInIso(checkInDate: string, checkInTime: string): string {
  const time = checkInTime.trim() || '14:00';
  const [hours, minutes = '00'] = time.split(':');
  return `${checkInDate}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00.000Z`;
}

/** Calendar stay nights + derived access instants (policy check-in time in property TZ). */
export function resolveReservationStayPeriod(input: {
  checkInDate?: string | null;
  checkOutDate?: string | null;
  /** Legacy ISO; used only to recover calendar days when dates omitted. */
  checkInAt?: string | null;
  checkOutAt?: string | null;
  checkInTime?: string | null;
  propertyTimeZone?: string | null;
}): ReservationStayPeriod | null {
  const checkInDate = input.checkInDate?.trim() || stayCalendarDay(input.checkInAt) || null;
  const checkOutDate = input.checkOutDate?.trim() || stayCalendarDay(input.checkOutAt) || null;

  if (!checkInDate || !checkOutDate || checkOutDate < checkInDate) {
    return null;
  }

  const time = input.checkInTime?.trim() || '14:00';
  const checkInAt =
    formatPropertyLocalCheckInIso(checkInDate, time, input.propertyTimeZone) ??
    fallbackCheckInIso(checkInDate, time);

  return {
    checkInDate,
    checkOutDate,
    checkInAt,
    checkOutAt: `${checkOutDate}T23:59:59.999Z`,
  };
}

export function stayRecordCheckInDate(stay: {
  check_in_date?: string | null;
  check_in_at: string;
}): string {
  return stay.check_in_date?.trim() || stay.check_in_at.slice(0, 10);
}

export function stayRecordCheckOutDate(stay: {
  check_out_date?: string | null;
  check_out_at: string;
}): string {
  return stay.check_out_date?.trim() || stay.check_out_at.slice(0, 10);
}
