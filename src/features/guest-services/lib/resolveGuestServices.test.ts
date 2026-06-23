import { describe, expect, it } from 'vitest';
import { resolveGuestServices, shouldHideLaundryHouseRule } from './resolveGuestServices';

describe('resolveGuestServices', () => {
  it('includes laundry when laundryCost is set', () => {
    const services = resolveGuestServices({ laundryCost: '10€' });
    expect(services).toEqual([{ id: 'laundry', priceLabel: '10€' }]);
  });

  it('includes laundry when enabled laundry rule exists', () => {
    const services = resolveGuestServices({
      houseRules: [{ id: '1', enabled: true, templateId: 'laundry', params: { cost: '8€' } }],
    });
    expect(services[0]).toEqual({ id: 'laundry', priceLabel: '8€' });
  });

  it('omits laundry when not configured', () => {
    const services = resolveGuestServices({ checkOutTime: '11:00' });
    expect(services).toEqual([{ id: 'late_checkout', priceLabel: null }]);
  });
});

describe('shouldHideLaundryHouseRule', () => {
  it('returns true when laundry service is available', () => {
    expect(shouldHideLaundryHouseRule({ laundryCost: '10€' })).toBe(true);
  });

  it('returns false when laundry service is unavailable', () => {
    expect(shouldHideLaundryHouseRule({})).toBe(false);
  });
});
