import { describe, expect, it } from 'vitest';
import {
  HOSTEL_PLACE_CATEGORY_IDS,
  resolveHostelPlaceCategoryAdminLabel,
  resolveHostelPlaceCategoryLabelKey,
} from './hostelPlaces';

describe('hostel place categories', () => {
  it('lists all category ids', () => {
    expect(HOSTEL_PLACE_CATEGORY_IDS).toEqual([
      'food',
      'shop',
      'atm',
      'pharmacy',
      'nightlife',
      'other',
    ]);
  });

  it('resolves admin labels and guest label keys', () => {
    expect(resolveHostelPlaceCategoryAdminLabel('food')).toBe('Food');
    expect(resolveHostelPlaceCategoryLabelKey('pharmacy')).toBe(
      'hostelPlaceCategories.pharmacy'
    );
  });
});
