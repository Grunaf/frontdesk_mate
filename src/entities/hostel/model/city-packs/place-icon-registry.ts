import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  Beer,
  Coffee,
  Landmark,
  MapPin,
  Moon,
  Mountain,
  Pizza,
  ShoppingBag,
  Stethoscope,
  UtensilsCrossed,
  Wine,
} from 'lucide-react';
import type { HostelPlaceCategory } from '@/entities/tenant/model/hostelPlaces';
import type { PlaceCategory } from './places.types';
import { isPlaceCategory, resolvePlaceCategoryLucideIcon } from './place-category-registry';

export const PLACE_ICON_IDS = [
  'default',
  'restaurant',
  'pizza',
  'cafe',
  'bar',
  'pub',
  'grocery',
  'atm',
  'pharmacy',
  'landmark',
  'viewpoint',
  'nightlife',
] as const;

export type PlaceIconId = (typeof PLACE_ICON_IDS)[number];

export const PLACE_ICON_PRESETS: {
  id: PlaceIconId;
  label: string;
  utilityLabelKey?: string;
}[] = [
  { id: 'default', label: 'Default (category)' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'pizza', label: 'Pizza / fast food', utilityLabelKey: 'essentials.lateFood' },
  { id: 'cafe', label: 'Café' },
  { id: 'bar', label: 'Bar' },
  { id: 'pub', label: 'Pub' },
  { id: 'grocery', label: 'Grocery / shop', utilityLabelKey: 'essentials.shop' },
  { id: 'atm', label: 'ATM / bank', utilityLabelKey: 'essentials.atm' },
  { id: 'pharmacy', label: 'Pharmacy', utilityLabelKey: 'essentials.pharmacy' },
  { id: 'landmark', label: 'Landmark / sight' },
  { id: 'viewpoint', label: 'Viewpoint' },
  { id: 'nightlife', label: 'Nightlife' },
];

const PLACE_LUCIDE_ICONS: Record<PlaceIconId, LucideIcon> = {
  default: MapPin,
  restaurant: UtensilsCrossed,
  pizza: Pizza,
  cafe: Coffee,
  bar: Wine,
  pub: Beer,
  grocery: ShoppingBag,
  atm: Banknote,
  pharmacy: Stethoscope,
  landmark: Landmark,
  viewpoint: Mountain,
  nightlife: Moon,
};

const HOSTEL_CATEGORY_ICONS: Record<HostelPlaceCategory, LucideIcon> = {
  food: UtensilsCrossed,
  shop: ShoppingBag,
  atm: Banknote,
  pharmacy: Stethoscope,
  nightlife: Moon,
  other: MapPin,
};

const UTILITY_LABEL_KEY_BY_ICON_ID = Object.fromEntries(
  PLACE_ICON_PRESETS.flatMap((preset) =>
    preset.utilityLabelKey ? [[preset.id, preset.utilityLabelKey] as const] : []
  )
) as Partial<Record<Exclude<PlaceIconId, 'default'>, string>>;

export function isPlaceIconId(value: string): value is PlaceIconId {
  return PLACE_ICON_IDS.includes(value as PlaceIconId);
}

export function normalizePlaceIconId(value?: string | null): PlaceIconId | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === 'default') {
    return undefined;
  }

  return isPlaceIconId(trimmed) ? trimmed : undefined;
}

export function resolvePlaceUtilityLabelKey(iconId?: PlaceIconId): string | undefined {
  if (!iconId || iconId === 'default') {
    return undefined;
  }

  return UTILITY_LABEL_KEY_BY_ICON_ID[iconId];
}

export function resolvePlaceLucideIcon(input: {
  iconId?: PlaceIconId;
  category?: string;
  scope?: 'hostel' | 'city';
}): LucideIcon {
  if (input.iconId && input.iconId !== 'default') {
    return PLACE_LUCIDE_ICONS[input.iconId];
  }

  if (input.scope === 'hostel' && input.category) {
    return (
      HOSTEL_CATEGORY_ICONS[input.category as HostelPlaceCategory] ?? MapPin
    );
  }

  if (input.category && isPlaceCategory(input.category)) {
    return resolvePlaceCategoryLucideIcon(input.category);
  }

  return MapPin;
}
