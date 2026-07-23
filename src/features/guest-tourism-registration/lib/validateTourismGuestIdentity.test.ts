import { describe, expect, it } from 'vitest';

import {
  isValidCountryOfBirth,
  isValidDocumentType,
  isValidPlaceOfBirth,
  normalizePlaceOfBirth,
} from './validateTourismGuestIdentity';

describe('validateTourismGuestIdentity birth/document helpers', () => {
  it('accepts known ISO country of birth', () => {
    expect(isValidCountryOfBirth('me')).toBe(true);
    expect(isValidCountryOfBirth('ZZ')).toBe(false);
  });

  it('validates place of birth length', () => {
    expect(isValidPlaceOfBirth('  Podgorica  ')).toBe(true);
    expect(isValidPlaceOfBirth('')).toBe(false);
    expect(isValidPlaceOfBirth('x'.repeat(121))).toBe(false);
    expect(normalizePlaceOfBirth('  Podgorica  ')).toBe('Podgorica');
  });

  it('accepts passport and id_card document types only', () => {
    expect(isValidDocumentType('passport')).toBe(true);
    expect(isValidDocumentType('id_card')).toBe(true);
    expect(isValidDocumentType('driver_license')).toBe(false);
  });
});
