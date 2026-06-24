import type { RouteConfig, RouteGuestCopy } from '@/entities/hostel';

type RoutesTranslator = (key: string, values?: Record<string, string>) => string;

type RouteCopyField = keyof RouteGuestCopy;

const TRANSLATION_KEY_BY_FIELD: Record<RouteCopyField, keyof RouteConfig['translationKeys']> = {
  publicTitle: 'publicTitle',
  publicSummary: 'publicSummary',
  publicPreview: 'publicPreview',
  publicText: 'publicText',
  publicGetOffAt: 'publicGetOffAt',
  publicWalkToHostel: 'publicWalkToHostel',
  taxiCost: 'taxiCost',
  taxiPickupPoint: 'taxiPickupPoint',
  fareLabel: 'publicTitle',
  hint: 'publicTitle',
};

export function resolveRouteCopyField(
  route: RouteConfig,
  field: RouteCopyField,
  translate: RoutesTranslator,
  templateValues?: Record<string, string>
): string {
  const inline = route.guestCopy?.[field];
  if (inline) {
    return inline;
  }

  const translationKey = route.translationKeys[TRANSLATION_KEY_BY_FIELD[field]];
  if (!translationKey) {
    return '';
  }

  return translate(translationKey, templateValues);
}

export function resolveRouteFareLabel(
  route: RouteConfig,
  translate: RoutesTranslator
): string | undefined {
  if (route.guestCopy?.fareLabel) {
    return route.guestCopy.fareLabel;
  }

  const fareLabelKey = route.metadata.publicTransport.fareLabelKey;
  return fareLabelKey ? translate(fareLabelKey) : undefined;
}

export function resolveRouteHint(route: RouteConfig, translate: RoutesTranslator): string | undefined {
  if (route.guestCopy?.hint) {
    return route.guestCopy.hint;
  }

  return route.hintKey ? translate(route.hintKey) : undefined;
}
