import { describe, expect, it } from 'vitest';
import { sanitizeReceptionLoginNext } from './sanitizeReceptionLoginNext';

describe('sanitizeReceptionLoginNext', () => {
  it('accepts relative desk paths with query', () => {
    expect(sanitizeReceptionLoginNext('/?tab=plan&stayId=abc-123')).toBe(
      '/?tab=plan&stayId=abc-123'
    );
  });

  it('accepts plain root and login-adjacent paths', () => {
    expect(sanitizeReceptionLoginNext('/')).toBe('/');
    expect(sanitizeReceptionLoginNext('/plan')).toBe('/plan');
  });

  it('rejects empty, absolute, and protocol-relative values', () => {
    expect(sanitizeReceptionLoginNext(null)).toBeNull();
    expect(sanitizeReceptionLoginNext(undefined)).toBeNull();
    expect(sanitizeReceptionLoginNext('')).toBeNull();
    expect(sanitizeReceptionLoginNext('   ')).toBeNull();
    expect(sanitizeReceptionLoginNext('https://evil.com')).toBeNull();
    expect(sanitizeReceptionLoginNext('//evil.com')).toBeNull();
    expect(sanitizeReceptionLoginNext('/https://evil.com')).toBeNull();
  });

  it('rejects backslash and null-byte injection', () => {
    expect(sanitizeReceptionLoginNext('/\\evil')).toBeNull();
    expect(sanitizeReceptionLoginNext('/ok\0evil')).toBeNull();
  });
});
