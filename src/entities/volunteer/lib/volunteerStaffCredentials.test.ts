import { describe, expect, it } from 'vitest';

import {
  buildVolunteerStaffLoginBase,
  buildVolunteerStaffLoginCandidate,
  formatVolunteerStaffLoginInstructions,
  generateVolunteerStaffPin,
} from './volunteerStaffCredentials';

describe('buildVolunteerStaffLoginBase', () => {
  it('slugifies display names', () => {
    expect(buildVolunteerStaffLoginBase('Anna Maria')).toBe('anna.maria');
  });

  it('falls back when empty after slugify', () => {
    expect(buildVolunteerStaffLoginBase('!!!')).toBe('volunteer');
  });
});

describe('buildVolunteerStaffLoginCandidate', () => {
  it('appends attempt suffix', () => {
    expect(buildVolunteerStaffLoginCandidate('anna', 1)).toBe('anna');
    expect(buildVolunteerStaffLoginCandidate('anna', 2)).toBe('anna2');
  });
});

describe('generateVolunteerStaffPin', () => {
  it('returns digits of at least min length', () => {
    const pin = generateVolunteerStaffPin();
    expect(pin).toMatch(/^\d{6,}$/);
  });
});

describe('formatVolunteerStaffLoginInstructions', () => {
  it('builds a pasteable message', () => {
    expect(
      formatVolunteerStaffLoginInstructions({
        receptionLoginUrl: 'http://vega.reception.localhost:3000/login',
        login: 'anna',
        pin: '123456',
      })
    ).toBe(
      [
        'Reception desk access',
        'URL: http://vega.reception.localhost:3000/login',
        'Login: anna',
        'PIN: 123456',
      ].join('\n')
    );
  });
});
