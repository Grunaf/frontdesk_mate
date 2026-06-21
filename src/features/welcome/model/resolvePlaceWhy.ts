import type { Place } from '@/entities/hostel';

type TranslateFn = (key: string) => string;

export function resolvePlaceWhy(place: Place, translate: TranslateFn): string | undefined {
  const adminDescription = place.description?.trim();
  if (adminDescription) {
    return adminDescription;
  }

  const translatedDescription = place.descriptionKey
    ? translate(place.descriptionKey).trim()
    : '';

  return translatedDescription || undefined;
}
