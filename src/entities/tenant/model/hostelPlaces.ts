export type HostelPlaceCategory = 'food' | 'shop' | 'atm' | 'pharmacy' | 'nightlife' | 'other';

export interface HostelPlace {
  id: string;
  name: string;
  category: HostelPlaceCategory;
  walkHint?: string;
  mapsUrl?: string;
  note?: string;
}

export const HOSTEL_PLACE_CATEGORIES: { id: HostelPlaceCategory; label: string }[] = [
  { id: 'food', label: 'Food' },
  { id: 'shop', label: 'Shop / grocery' },
  { id: 'atm', label: 'ATM' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'other', label: 'Other' },
];
