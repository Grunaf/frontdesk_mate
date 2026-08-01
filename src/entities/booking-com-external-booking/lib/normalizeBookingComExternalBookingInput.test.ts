import { describe, expect, it } from 'vitest';
import {
  normalizeBookingComExternalBookingBatch,
  normalizeBookingComExternalBookingInput,
} from './normalizeBookingComExternalBookingInput';

describe('normalizeBookingComExternalBookingInput', () => {
  it('requires booking_id and hotel_id', () => {
    expect(normalizeBookingComExternalBookingInput({ booking_id: '1' })).toBeNull();
    expect(normalizeBookingComExternalBookingInput({ hotel_id: '9' })).toBeNull();
  });

  it('normalizes a full payload', () => {
    expect(
      normalizeBookingComExternalBookingInput({
        booking_id: ' 9876543210 ',
        hotel_id: '12345',
        guest_name: 'Ada Lovelace',
      phone_number: '+34600111222',
      guest_email: 'Guest@Example.com',
      adults: '2',
        children: 1,
        check_in: '2026-08-01',
        check_out: '2026-08-03',
        amount: '120,50',
        currency: 'eur',
        status: 'ok',
        room_name: 'Dorm 8',
        source: 'detail_api',
        captured_at: '2026-07-30T05:00:00.000Z',
      })
    ).toEqual({
      booking_id: '9876543210',
      hotel_id: '12345',
      guest_name: 'Ada Lovelace',
      phone_number: '+34600111222',
      guest_email: 'guest@example.com',
      adults: 2,
      children: 1,
      check_in: '2026-08-01',
      check_out: '2026-08-03',
      amount: 120.5,
      currency: 'EUR',
      status: 'ok',
      room_name: 'Dorm 8',
      source: 'detail_api',
      captured_at: '2026-07-30T05:00:00.000Z',
    });
  });

  it('filters invalid batch items', () => {
    expect(
      normalizeBookingComExternalBookingBatch([
        { booking_id: '1', hotel_id: '9' },
        { booking_id: 'x' },
        null,
      ])
    ).toEqual([
      expect.objectContaining({ booking_id: '1', hotel_id: '9', status: 'unknown', source: 'list_api' }),
    ]);
  });
});
