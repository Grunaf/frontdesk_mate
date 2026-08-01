import { describe, expect, it } from 'vitest';
import {
  normalizeBookingComExternalBookingBatch,
  normalizeBookingComExternalBookingInput,
  normalizeBookingComBookingStatus,
} from './normalizeBookingComExternalBookingInput';

describe('normalizeBookingComBookingStatus', () => {
  it('maps canceled spellings', () => {
    expect(normalizeBookingComBookingStatus('Canceled')).toBe('cancelled');
    expect(normalizeBookingComBookingStatus('cancelled')).toBe('cancelled');
    expect(normalizeBookingComBookingStatus('OK')).toBe('ok');
  });
});

describe('normalizeBookingComExternalBookingInput', () => {
  it('requires booking_id and hotel_id', () => {
    expect(normalizeBookingComExternalBookingInput({ booking_id: '1' })).toBeNull();
    expect(normalizeBookingComExternalBookingInput({ hotel_id: '9' })).toBeNull();
  });

  it('maps detail legacy amount to total_amount', () => {
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
      amount: null,
      list_amount: null,
      total_amount: 120.5,
      currency: 'EUR',
      status: 'ok',
      room_name: 'Dorm 8',
      source: 'detail_api',
      captured_at: '2026-07-30T05:00:00.000Z',
    });
  });

  it('maps list legacy amount to list_amount', () => {
    expect(
      normalizeBookingComExternalBookingInput({
        booking_id: '1',
        hotel_id: '9',
        amount: 32.4,
        source: 'list_api',
        status: 'Canceled',
      })
    ).toEqual(
      expect.objectContaining({
        list_amount: 32.4,
        total_amount: null,
        amount: 32.4,
        status: 'cancelled',
      })
    );
  });

  it('keeps explicit dual amounts', () => {
    expect(
      normalizeBookingComExternalBookingInput({
        booking_id: '1',
        hotel_id: '9',
        list_amount: 32.4,
        total_amount: 33.4,
        source: 'dom_fallback',
      })
    ).toEqual(
      expect.objectContaining({
        list_amount: 32.4,
        total_amount: 33.4,
        amount: 32.4,
      })
    );
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
