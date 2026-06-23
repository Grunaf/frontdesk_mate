import { describe, expect, it } from 'vitest';
import { findStayByReference, normalizeStayReferenceQuery } from './findStayByReference';

const stays = [
  {
    id: '00000000-0000-0000-0000-0000123456',
    bed_id: '12',
  },
  {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeffffaaaa',
    bed_id: '3',
  },
];

describe('normalizeStayReferenceQuery', () => {
  it('strips hash and whitespace', () => {
    expect(normalizeStayReferenceQuery(' #123456 ')).toBe('123456');
  });
});

describe('findStayByReference', () => {
  it('finds stay by ref', () => {
    expect(findStayByReference(stays, '#123456')?.bed_id).toBe('12');
  });

  it('returns null when not found', () => {
    expect(findStayByReference(stays, 'ZZZZZZ')).toBeNull();
  });
});
