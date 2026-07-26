import { describe, expect, it } from 'vitest';
import {
  applySiteBookingDiscount,
  normalizeSiteBookingDiscountPercent,
  resolveSiteBookingUnitPrice,
} from './resolveSiteBookingPrice';

describe('resolveSiteBookingPrice', () => {
  it('normalizes percent bounds', () => {
    expect(normalizeSiteBookingDiscountPercent(0)).toBeUndefined();
    expect(normalizeSiteBookingDiscountPercent(-5)).toBeUndefined();
    expect(normalizeSiteBookingDiscountPercent(10)).toBe(10);
    expect(normalizeSiteBookingDiscountPercent(150)).toBe(100);
  });

  it('applies discount to base price', () => {
    expect(applySiteBookingDiscount(20, 10)).toBe(18);
    expect(applySiteBookingDiscount(20, undefined)).toBe(20);
  });

  it('resolves unit price from tenant settings', () => {
    expect(resolveSiteBookingUnitPrice({ siteBookingDiscountPercent: 25 }, 40)).toBe(30);
    expect(resolveSiteBookingUnitPrice({}, 40)).toBe(40);
    expect(resolveSiteBookingUnitPrice({ siteBookingDiscountPercent: 10 }, undefined)).toBeUndefined();
  });
});
