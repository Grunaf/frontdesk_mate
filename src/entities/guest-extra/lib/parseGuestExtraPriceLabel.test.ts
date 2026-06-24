import { describe, expect, it } from 'vitest';
import { parseGuestExtraPriceLabel } from './parseGuestExtraPriceLabel';

describe('parseGuestExtraPriceLabel', () => {
  it('parses amount and currency without space', () => {
    expect(parseGuestExtraPriceLabel('30€')).toEqual({ amount: '30', currency: '€' });
  });

  it('parses amount and currency with space', () => {
    expect(parseGuestExtraPriceLabel('25 EUR')).toEqual({ amount: '25', currency: 'EUR' });
  });

  it('parses decimal amounts', () => {
    expect(parseGuestExtraPriceLabel('29,50 BAM')).toEqual({ amount: '29.50', currency: 'BAM' });
  });

  it('falls back to euro for amount-only labels', () => {
    expect(parseGuestExtraPriceLabel('30')).toEqual({ amount: '30', currency: '€' });
  });

  it('returns null for non-numeric labels', () => {
    expect(parseGuestExtraPriceLabel('ask reception')).toBeNull();
  });
});
