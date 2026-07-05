export type CityPackRequestKind = 'new_city' | 'pack_not_ready' | 'other';

export type CityPackRequestStatus = 'pending' | 'reviewed' | 'fulfilled' | 'dismissed';

export type InsertCityPackRequestInput = {
  userId: string;
  tenantId: string | null;
  kind: CityPackRequestKind;
  cityName: string;
  countryOrRegion: string | null;
  message: string | null;
  relatedCityPackId: string | null;
};
