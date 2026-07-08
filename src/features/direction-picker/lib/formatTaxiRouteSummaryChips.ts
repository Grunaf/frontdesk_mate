export function averageInRange(range: { min: number; max: number }): number {
  return Math.round((range.min + range.max) / 2);
}

export type TaxiRouteSummaryChipLabels = {
  fairPriceLabel: string;
  durationLabel: string;
};

export function buildTaxiRouteSummaryChipLabels(input: {
  currencyMode: 'eur_only' | 'local_and_eur';
  taxiPriceKM: { min: number; max: number };
  taxiPriceEUR: { min: number; max: number };
  taxiDurationMin: { min: number; max: number };
  fairPricePrefix: string;
  taxiPriceApprox: (params: { valueKM: number; valueEUR: number }) => string;
  taxiPriceEurOnlyApprox: (params: { valueEUR: number }) => string;
  taxiDurationApprox: (params: { value: number }) => string;
}): TaxiRouteSummaryChipLabels {
  const avgTaxiPriceKM = averageInRange(input.taxiPriceKM);
  const avgTaxiPriceEUR = averageInRange(input.taxiPriceEUR);
  const avgTaxiDurationMin = averageInRange(input.taxiDurationMin);

  const priceLabel =
    input.currencyMode === 'local_and_eur'
      ? input.taxiPriceApprox({ valueKM: avgTaxiPriceKM, valueEUR: avgTaxiPriceEUR })
      : input.taxiPriceEurOnlyApprox({ valueEUR: avgTaxiPriceEUR });

  return {
    fairPriceLabel: `${input.fairPricePrefix}: ${priceLabel}`,
    durationLabel: input.taxiDurationApprox({ value: avgTaxiDurationMin }),
  };
}
