import { describe, expect, it } from 'vitest';
import { buildBookingComReservationUrl } from './buildBookingComReservationUrl';

describe('buildBookingComReservationUrl', () => {
  it('builds extranet url with res_id and hotel_id', () => {
    expect(
      buildBookingComReservationUrl({
        reservationId: ' 9876543210 ',
        hotelId: ' 12345 ',
      })
    ).toBe(
      'https://admin.booking.com/hotel/hoteladmin/extranet_ng/manage/booking.html?res_id=9876543210&hotel_id=12345'
    );
  });

  it('returns null when reservation id or hotel id is empty', () => {
    expect(buildBookingComReservationUrl({ reservationId: '', hotelId: '1' })).toBeNull();
    expect(buildBookingComReservationUrl({ reservationId: '1', hotelId: '  ' })).toBeNull();
  });

  it('encodes special characters in ids', () => {
    const url = buildBookingComReservationUrl({
      reservationId: 'ab c',
      hotelId: '1',
    });
    expect(url).toContain('res_id=ab+c');
    expect(url).toContain('hotel_id=1');
  });
});
