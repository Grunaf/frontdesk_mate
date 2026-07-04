export type PlaceCategory = 'bars' | 'restaurants' | 'cafes' | 'sights' | 'essential';

export type { PlaceIconId } from './place-icons';

export interface Place {
  id: string;
  category: PlaceCategory;
  name: string;
  descriptionKey?: string;
  /** Inline description for DB-authored packs. */
  description?: string;
  googleMapsUrl: string;
  isTopPick: boolean;
  needNow: boolean;
  walkHint?: string;
  iconId?: import('./place-icons').PlaceIconId;
}
