import { describe, expect, it } from 'vitest';
import {
  isEntryDateComplete,
  isEntryTransportType,
  isValidEntryStampDate,
  parseEntryStampPage,
  resolveSharedEntryStampDate,
} from './isEntryDateComplete';
import type { GuestTourismGuest, GuestTourismRegistrationSummary } from '../model/types';

function guest(partial: Partial<GuestTourismGuest> & Pick<GuestTourismGuest, 'id'>): GuestTourismGuest {
  return {
    stay_id: 'stay-1',
    first_name: 'A',
    last_name: 'B',
    citizenship: 'RU',
    passport_number: 'X',
    date_of_birth: '1990-01-01',
    country_of_birth: 'RU',
    place_of_birth: '',
    gender: 'male',
    document_type: 'passport',
    passport_storage_path: 'p',
    entry_stamp_storage_path: '',
    entry_stamp_date: null,
    entry_stamp_page: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function summary(
  partial: Partial<GuestTourismRegistrationSummary> &
    Pick<GuestTourismRegistrationSummary, 'guests'>
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
    ...partial,
  };
}

describe('isValidEntryStampDate', () => {
  it('accepts calendar dates', () => {
    expect(isValidEntryStampDate('2026-07-22')).toBe(true);
  });

  it('rejects invalid calendar dates', () => {
    expect(isValidEntryStampDate('2026-02-30')).toBe(false);
    expect(isValidEntryStampDate('22-07-2026')).toBe(false);
  });
});

describe('parseEntryStampPage', () => {
  it('accepts page integers in range', () => {
    expect(parseEntryStampPage(12)).toBe(12);
    expect(parseEntryStampPage('3')).toBe(3);
  });

  it('rejects empty and out of range', () => {
    expect(parseEntryStampPage(null)).toBeNull();
    expect(parseEntryStampPage('')).toBeNull();
    expect(parseEntryStampPage(0)).toBeNull();
    expect(parseEntryStampPage(1000)).toBeNull();
  });
});

describe('isEntryTransportType', () => {
  it('accepts known transports', () => {
    expect(isEntryTransportType('plane')).toBe(true);
    expect(isEntryTransportType('boat')).toBe(false);
  });
});

describe('isEntryDateComplete', () => {
  it('is true when skipped', () => {
    expect(
      isEntryDateComplete(
        summary({
          entry_details_status: 'skipped',
          guests: [guest({ id: '1' })],
        })
      )
    ).toBe(true);
  });

  it('is true when complete', () => {
    expect(
      isEntryDateComplete(
        summary({
          entry_details_status: 'complete',
          guests: [guest({ id: '1', entry_stamp_date: '2026-07-01' })],
        })
      )
    ).toBe(true);
  });

  it('is false when incomplete even with dates', () => {
    expect(
      isEntryDateComplete(
        summary({
          entry_details_status: 'incomplete',
          guests: [guest({ id: '1', entry_stamp_date: '2026-07-01' })],
        })
      )
    ).toBe(false);
  });

  it('legacy: true when all guests have dates and status is null', () => {
    expect(
      isEntryDateComplete(
        summary({
          guests: [
            guest({ id: '1', entry_stamp_date: '2026-07-01' }),
            guest({ id: '2', entry_stamp_date: '2026-07-01' }),
          ],
        })
      )
    ).toBe(true);
  });

  it('legacy: false when a guest is missing a date', () => {
    expect(
      isEntryDateComplete(
        summary({
          guests: [
            guest({ id: '1', entry_stamp_date: '2026-07-01' }),
            guest({ id: '2', entry_stamp_date: null }),
          ],
        })
      )
    ).toBe(false);
  });
});

describe('resolveSharedEntryStampDate', () => {
  it('returns shared date when all match', () => {
    expect(
      resolveSharedEntryStampDate(
        summary({
          guests: [
            guest({ id: '1', entry_stamp_date: '2026-07-01' }),
            guest({ id: '2', entry_stamp_date: '2026-07-01' }),
          ],
        })
      )
    ).toBe('2026-07-01');
  });
});
