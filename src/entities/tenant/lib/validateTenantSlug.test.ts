import { describe, expect, it } from 'vitest';
import { isReservedTenantSlug, validateTenantSlugInput } from './validateTenantSlug';

describe('validateTenantSlugInput', () => {
  it('normalizes and accepts valid slugs', () => {
    expect(validateTenantSlugInput('  Balkan Han ')).toEqual({ ok: true, slug: 'balkan-han' });
    expect(validateTenantSlugInput('kotor-demo')).toEqual({ ok: true, slug: 'kotor-demo' });
  });

  it('rejects empty and invalid format', () => {
    expect(validateTenantSlugInput('')).toEqual({ ok: false, code: 'empty' });
    expect(validateTenantSlugInput('A')).toEqual({ ok: false, code: 'invalid_format' });
    expect(validateTenantSlugInput('-bad')).toEqual({ ok: false, code: 'invalid_format' });
  });

  it('rejects reserved hostname labels', () => {
    for (const reserved of ['admin', 'app', 'reception', 'dashboard', 'www']) {
      expect(validateTenantSlugInput(reserved)).toEqual({ ok: false, code: 'reserved' });
      expect(isReservedTenantSlug(reserved)).toBe(true);
    }
  });

  it('allows slugs that merely contain reserved words', () => {
    expect(validateTenantSlugInput('my-admin-hostel')).toEqual({ ok: true, slug: 'my-admin-hostel' });
    expect(isReservedTenantSlug('my-admin-hostel')).toBe(false);
  });
});
