import { describe, expect, it } from 'vitest';

import type { GuestProfile } from '@/entities/guest';

import { guestProfileToTourismFormValues } from './guestProfileToTourismFormValues';

function makeGuest(overrides: Partial<GuestProfile> = {}): GuestProfile {
  return {
    id: 'g1',
    tenant_id: 't1',
    display_name: 'Ada Lovelace',
    contact_whatsapp: null,
    notes: null,
    first_name: 'Ada',
    last_name: 'Lovelace',
    citizenship: 'GB',
    passport_number: 'P123',
    date_of_birth: '1815-12-10',
    country_of_birth: 'GB',
    place_of_birth: 'London',
    gender: 'female',
    document_type: 'passport',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('guestProfileToTourismFormValues', () => {
  it('maps a complete profile', () => {
    const values = guestProfileToTourismFormValues(makeGuest());
    expect(values.guestId).toBe('g1');
    expect(values.passportNumber).toBe('P123');
    expect(values.gender).toBe('female');
  });

  it('falls back to display_name parts when identity is incomplete', () => {
    const values = guestProfileToTourismFormValues(
      makeGuest({
        first_name: null,
        last_name: null,
        passport_number: null,
        date_of_birth: null,
        gender: null,
        document_type: null,
        display_name: 'Nikola Tesla',
      })
    );
    expect(values.firstName).toBe('Nikola');
    expect(values.lastName).toBe('Tesla');
    expect(values.passportNumber).toBe('');
  });
});
