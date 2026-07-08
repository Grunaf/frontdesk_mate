import { describe, expect, it } from 'vitest';
import {
  averageInRange,
  buildTaxiRouteSummaryChipLabels,
} from './formatTaxiRouteSummaryChips';

describe('formatTaxiRouteSummaryChips', () => {
  it('averages min/max for approx chip values', () => {
    expect(averageInRange({ min: 10, max: 20 })).toBe(15);
    expect(averageInRange({ min: 17, max: 22 })).toBe(20);
  });

  it('builds fair price and duration chip labels (eur_only)', () => {
    const labels = buildTaxiRouteSummaryChipLabels({
      currencyMode: 'eur_only',
      taxiPriceKM: { min: 0, max: 0 },
      taxiPriceEUR: { min: 18, max: 22 },
      taxiDurationMin: { min: 12, max: 18 },
      fairPricePrefix: 'Fair price',
      taxiPriceApprox: ({ valueKM, valueEUR }) => `~${valueKM} KM / ~${valueEUR} €`,
      taxiPriceEurOnlyApprox: ({ valueEUR }) => `~${valueEUR} €`,
      taxiDurationApprox: ({ value }) => `~${value} min`,
    });

    expect(labels.fairPriceLabel).toBe('Fair price: ~20 €');
    expect(labels.durationLabel).toBe('~15 min');
  });

  it('builds dual-currency fair price chip (local_and_eur)', () => {
    const labels = buildTaxiRouteSummaryChipLabels({
      currencyMode: 'local_and_eur',
      taxiPriceKM: { min: 25, max: 35 },
      taxiPriceEUR: { min: 12, max: 18 },
      taxiDurationMin: { min: 20, max: 30 },
      fairPricePrefix: 'Fair price',
      taxiPriceApprox: ({ valueKM, valueEUR }) => `~${valueKM} KM / ~${valueEUR} €`,
      taxiPriceEurOnlyApprox: ({ valueEUR }) => `~${valueEUR} €`,
      taxiDurationApprox: ({ value }) => `~${value} min`,
    });

    expect(labels.fairPriceLabel).toBe('Fair price: ~30 KM / ~15 €');
    expect(labels.durationLabel).toBe('~25 min');
  });
});
