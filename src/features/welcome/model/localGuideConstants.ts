import { PLACE_CATEGORY_IDS, type PlaceCategory } from '@/entities/hostel';

export const LOCAL_GUIDE_CATEGORY_TAB_IDS = PLACE_CATEGORY_IDS;

export type LocalGuideCategoryTabId = PlaceCategory;

export const DEFAULT_LOCAL_GUIDE_TAB: LocalGuideCategoryTabId = 'restaurants';
export const ALL_TAB_INITIAL_LIMIT = 6;
