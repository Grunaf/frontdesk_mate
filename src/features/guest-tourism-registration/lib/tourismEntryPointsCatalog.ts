/**
 * Entry-point catalogs keyed by tourism registration profile id.
 * No country hardcoding in UI — only profiles that have a catalog are supported.
 * Montenegro (`me`) currently lists ME airports / common border points only.
 */

export type TourismEntryAirport = {
  code: string;
  label: string;
};

export type TourismEntryPlaceSuggestion = {
  id: string;
  label: string;
};

export type TourismEntryPointsCatalog = {
  airports: TourismEntryAirport[];
  placeSuggestions: TourismEntryPlaceSuggestion[];
};

const CATALOGS: Record<string, TourismEntryPointsCatalog> = {
  me: {
    airports: [
      { code: 'TIV', label: 'Tivat (TIV)' },
      { code: 'TGD', label: 'Podgorica (TGD)' },
    ],
    placeSuggestions: [
      { id: 'debelj-brijeg', label: 'Debeli Brijeg' },
      { id: 'sukobin', label: 'Sukobin' },
      { id: 'bozaj', label: 'Božaj' },
      { id: 'dobrakovo', label: 'Dobrakovo' },
      { id: 'sitnica', label: 'Sitnica' },
      { id: 'vracenovici', label: 'Vraćenovići' },
      { id: 'ilino-brdo', label: 'Ilino Brdo' },
      { id: 'podgorica-bus', label: 'Podgorica Bus Station' },
      { id: 'bar-port', label: 'Bar Port' },
    ],
  },
};

export function getTourismEntryPointsCatalog(
  profileId: string
): TourismEntryPointsCatalog | undefined {
  return CATALOGS[profileId.trim()];
}

export function findAirportInCatalog(
  catalog: TourismEntryPointsCatalog,
  code: string
): TourismEntryAirport | undefined {
  const normalized = code.trim().toUpperCase();
  return catalog.airports.find((airport) => airport.code.toUpperCase() === normalized);
}
