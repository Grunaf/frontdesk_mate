import { describe, expect, it } from 'vitest';

import { guestProfileToIdentityPrefill } from './guestProfileToIdentityPrefill';
import type { GuestProfile } from '../model/types';

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

describe('guestProfileToIdentityPrefill', () => {
  it('returns identity when complete', () => {
    expect(guestProfileToIdentityPrefill(makeGuest())?.passportNumber).toBe('P123');
  });

  it('returns null when passport missing', () => {
    expect(guestProfileToIdentityPrefill(makeGuest({ passport_number: null }))).toBeNull();
  });
});
