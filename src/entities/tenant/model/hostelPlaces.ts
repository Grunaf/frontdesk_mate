export type HostelPlaceCategory = 'food' | 'shop' | 'atm' | 'pharmacy' | 'nightlife' | 'other';

export interface HostelPlace {
  id: string;
  name: string;
  category: HostelPlaceCategory;
  walkHint?: string;
  mapsUrl?: string;
  note?: string;
}

export const HOSTEL_PLACE_CATEGORY_REGISTRY: {
  id: HostelPlaceCategory;
  adminLabel: string;
  labelKey: string;
}[] = [
  { id: 'food', adminLabel: 'Food', labelKey: 'hostelPlaceCategories.food' },
  { id: 'shop', adminLabel: 'Shop / grocery', labelKey: 'hostelPlaceCategories.shop' },
  { id: 'atm', adminLabel: 'ATM', labelKey: 'hostelPlaceCategories.atm' },
  { id: 'pharmacy', adminLabel: 'Pharmacy', labelKey: 'hostelPlaceCategories.pharmacy' },
  { id: 'nightlife', adminLabel: 'Nightlife', labelKey: 'hostelPlaceCategories.nightlife' },
  { id: 'other', adminLabel: 'Other', labelKey: 'hostelPlaceCategories.other' },
];

export const HOSTEL_PLACE_CATEGORY_IDS = HOSTEL_PLACE_CATEGORY_REGISTRY.map((entry) => entry.id);

const CATEGORY_BY_ID = Object.fromEntries(
  HOSTEL_PLACE_CATEGORY_REGISTRY.map((entry) => [entry.id, entry])
) as Record<HostelPlaceCategory, (typeof HOSTEL_PLACE_CATEGORY_REGISTRY)[number]>;

export function isHostelPlaceCategory(value: string): value is HostelPlaceCategory {
  return value in CATEGORY_BY_ID;
}

export function resolveHostelPlaceCategoryAdminLabel(category: HostelPlaceCategory): string {
  return CATEGORY_BY_ID[category].adminLabel;
}

export function resolveHostelPlaceCategoryLabelKey(category: HostelPlaceCategory): string {
  return CATEGORY_BY_ID[category].labelKey;
}

/** Admin select options — English labels until admin i18n is added. */
export const HOSTEL_PLACE_CATEGORIES = HOSTEL_PLACE_CATEGORY_REGISTRY.map(({ id, adminLabel }) => ({
  id,
  label: adminLabel,
}));
