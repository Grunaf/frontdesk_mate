import { describe, expect, it } from 'vitest';

import { isTourismRegistrationComplete } from '@/entities/guest-tourism-registration';
import type { GuestTourismRegistrationSummary } from '@/entities/guest-tourism-registration';

function summary(
  overrides: Partial<GuestTourismRegistrationSummary> = {}
): GuestTourismRegistrationSummary {
  return {
    stay_id: 'stay-1',
    tourism_contact_whatsapp: null,
    tourism_registration_completed_at: null,
    tourism_exported_at: null,
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
          guests: [
            {
              id: 'g1',
              stay_id: 'stay-1',
              first_name: 'A',
              last_name: 'B',
              passport_storage_path: 'p',
              entry_stamp_storage_path: 'e',
              created_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        })
      )
    ).toBe(false);
  });

  it('is true when completed and at least one guest exists', () => {
    expect(
      isTourismRegistrationComplete(
        summary({
          tourism_registration_completed_at: '2026-01-01T00:00:00.000Z',
          guests: [
            {
              id: 'g1',
              stay_id: 'stay-1',
              first_name: 'A',
              last_name: 'B',
              passport_storage_path: 'p',
              entry_stamp_storage_path: 'e',
              created_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        })
      )
    ).toBe(true);
  });
});
