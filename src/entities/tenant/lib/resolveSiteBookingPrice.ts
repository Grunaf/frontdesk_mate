import type { TenantSettings } from '../model/settings';

/** Clamp / validate tenant site booking discount (0–100). */
export function normalizeSiteBookingDiscountPercent(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  if (value <= 0) return undefined;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

/** Apply tenant site discount to a base nightly price. */
export function applySiteBookingDiscount(
  basePrice: number,
  discountPercent: number | undefined
): number {
  const pct = normalizeSiteBookingDiscountPercent(discountPercent);
  if (pct === undefined) return basePrice;
  const discounted = basePrice * (1 - pct / 100);
  return Math.round(discounted * 100) / 100;
}

/**
 * Nightly unit price for website / direct web bookings:
 * StayOffer base price minus tenant-level site discount.
 */
export function resolveSiteBookingUnitPrice(
  settings: TenantSettings,
  basePrice: number | undefined
): number | undefined {
  if (typeof basePrice !== 'number' || !Number.isFinite(basePrice) || basePrice < 0) {
    return undefined;
  }
  return applySiteBookingDiscount(basePrice, settings.siteBookingDiscountPercent);
}
