export const LOCAL_GUIDE_CATEGORY_TAB_IDS = [
  'essential',
  'food',
  'bars',
  'cafes',
  'sights',
] as const;

export type LocalGuideCategoryTabId = (typeof LOCAL_GUIDE_CATEGORY_TAB_IDS)[number];

export const DEFAULT_LOCAL_GUIDE_TAB = 'food';
export const ALL_TAB_INITIAL_LIMIT = 6;
