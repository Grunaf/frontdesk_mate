import { describe, expect, it } from 'vitest';
import { resolveTenantBrand } from './resolveTenantBrand';

describe('resolveTenantBrand', () => {
  it('returns logo when logoUrl is set', () => {
    expect(
      resolveTenantBrand({ name: 'Vega Hostel', logoUrl: '/images/vega/logo.png' })
    ).toEqual({
      kind: 'logo',
      src: '/images/vega/logo.png',
      alt: 'Vega Hostel',
    });
  });

  it('returns name when logoUrl is missing', () => {
    expect(resolveTenantBrand({ name: 'Vega Hostel' })).toEqual({
      kind: 'name',
      name: 'Vega Hostel',
    });
  });

  it('falls back to Hostel when name is empty', () => {
    expect(resolveTenantBrand({ name: '  ' })).toEqual({
      kind: 'name',
      name: 'Hostel',
    });
  });
});
