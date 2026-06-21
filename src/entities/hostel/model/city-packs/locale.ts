export interface CityPackLocale {
  paymentNamespace: string;
  guideNamespace: string;
  preTripNamespace: string;
  marketingNamespace: string;
}

export function cityPackRoutesNamespace(id: string): string {
  return `domains.hostel.cityPacks.${id}.routes`;
}

export function buildCityPackLocale(id: string): CityPackLocale {
  const base = `domains.hostel.cityPacks.${id}`;

  return {
    paymentNamespace: `${base}.payment`,
    guideNamespace: `${base}.guide`,
    preTripNamespace: `${base}.preTrip`,
    marketingNamespace: `${base}.marketing`,
  };
}
