import { describe, expect, it } from 'vitest';
import type { GuestTourismRegistrationSummary } from '@/entities/guest-tourism-registration';
import {
  resolveAccessTabBadge,
  resolveTourismStatusBadge,
  resolveTourismTabBadge,
} from './resolveStayDetailTabBadge';

function makeRegistration(
  patch: Partial<GuestTourismRegistrationSummary> & {
    guests?: GuestTourismRegistrationSummary['guests'];
  } = {}
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
    ...patch,
  };
}

describe('resolveAccessTabBadge', () => {
  it('is muted when magic link is missing', () => {
    expect(
      resolveAccessTabBadge({ hasMagicLink: false, hasPinInSession: true })
    ).toBe('muted');
  });

  it('is muted when PIN is not in session', () => {
    expect(
      resolveAccessTabBadge({ hasMagicLink: true, hasPinInSession: false })
    ).toBe('muted');
  });

  it('has no badge when link and PIN are available', () => {
    expect(
      resolveAccessTabBadge({ hasMagicLink: true, hasPinInSession: true })
    ).toBe('none');
  });
});

describe('resolveTourismStatusBadge / resolveTourismTabBadge', () => {
  it('marks empty registration as not_started with amber tab badge', () => {
    const status = resolveTourismStatusBadge(null);
    expect(status).toBe('not_started');
    expect(resolveTourismTabBadge(status)).toBe('amber');
  });

  it('marks in-progress guests with amber tab badge', () => {
    const status = resolveTourismStatusBadge(
      makeRegistration({
        guests: [
          {
            id: 'g1',
            stay_id: 'stay-1',
            first_name: 'A',
            last_name: 'B',
            date_of_birth: '1990-01-01',
            country_of_birth: 'ME',
            place_of_birth: 'Podgorica',
            gender: 'male',
            citizenship: 'ME',
            document_type: 'passport',
            passport_number: 'X1',
            passport_storage_path: '',
            entry_stamp_date: null,
            entry_stamp_storage_path: '',
            entry_stamp_page: null,
            created_at: '',
          },
        ],
      })
    );
    expect(status).toBe('in_progress');
    expect(resolveTourismTabBadge(status)).toBe('amber');
  });

  it('marks purged documents as muted', () => {
    const status = resolveTourismStatusBadge(
      makeRegistration({
        tourism_registration_completed_at: '2026-01-01T00:00:00.000Z',
        guests: [],
      })
    );
    expect(status).toBe('documents_purged');
    expect(resolveTourismTabBadge(status)).toBe('muted');
  });
});
