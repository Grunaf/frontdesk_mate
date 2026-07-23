import { describe, expect, it } from 'vitest';

import { isTourismRegistrationComplete } from '@/entities/guest-tourism-registration';
import type { GuestTourismGuest, GuestTourismRegistrationSummary } from '@/entities/guest-tourism-registration';

const sampleGuest: GuestTourismGuest = {
  id: 'g1',
  stay_id: 'stay-1',
  first_name: 'A',
  last_name: 'B',
  citizenship: 'ME',
  passport_number: 'AB123456',
  date_of_birth: '1990-01-01',
  country_of_birth: 'ME',
  place_of_birth: 'Podgorica',
  gender: 'male',
  document_type: 'passport',
  passport_storage_path: 'p',
  entry_stamp_storage_path: 'e',
  entry_stamp_date: null,
  entry_stamp_page: null,
  created_at: '2026-01-01T00:00:00.000Z',
};

function summary(
  overrides: Partial<GuestTourismRegistrationSummary> = {}
): GuestTourismRegistrationSummary {
  return {
    stay_id: 'stay-1',
    tourism_contact_whatsapp: null,
    tourism_registration_completed_at: null,
    tourism_exported_at: null,
    entry_transport_type: null,
    entry_point_code: null,
    entry_point_label: null,
    entry_details_status: null,
    guests: [],
    ...overrides,
  };
}

describe('isTourismRegistrationComplete', () => {
  it('is false without completion timestamp or guests', () => {
    expect(isTourismRegistrationComplete(summary())).toBe(false);
    expect(
      isTourismRegistrationComplete(
        summary({ tourism_registration_completed_at: '2026-01-01T00:00:00.000Z' })
      )
    ).toBe(false);
    expect(
      isTourismRegistrationComplete(
        summary({
          guests: [sampleGuest],
        })
      )
    ).toBe(false);
  });

  it('is true when completed and at least one guest exists', () => {
    expect(
      isTourismRegistrationComplete(
        summary({
          tourism_registration_completed_at: '2026-01-01T00:00:00.000Z',
          guests: [sampleGuest],
        })
      )
    ).toBe(true);
  });
});
