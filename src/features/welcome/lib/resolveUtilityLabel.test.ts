import { describe, expect, it } from 'vitest';
import { buildUtilityTriggerLabel, resolveUtilityShortLabel } from './resolveUtilityLabel';
import type { GuestRecommendation } from '../model/guestRecommendation';

const translate = (key: string) => {
  const labels: Record<string, string> = {
    'essentials.lateFood': 'Late food',
    'essentials.atm': 'ATM',
    'essentials.pharmacy': 'Pharmacy',
    'essentials.shop': 'Shop',
  };

  return labels[key] ?? key;
};

describe('resolveUtilityLabel', () => {
  it('uses late food label for need-now food places', () => {
    const recommendation: GuestRecommendation = {
      id: 'u2',
      scope: 'city',
      name: 'U2 Pizza',
      category: 'food',
      needNow: true,
    };

    expect(resolveUtilityShortLabel(recommendation, translate)).toBe('Late food');
  });

  it('builds trigger label from utility short labels', () => {
    const utilities: GuestRecommendation[] = [
      { id: 'atm', scope: 'city', name: 'ATM UniCredit', category: 'essential', iconId: 'atm' },
      { id: 'shop', scope: 'city', name: 'Konzum', category: 'essential', iconId: 'grocery' },
    ];

    expect(buildUtilityTriggerLabel(utilities, translate)).toBe('ATM · Shop');
  });
});
