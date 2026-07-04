import type { RouteId } from '@/entities/hostel';
import type { LocalizedField } from '@/entities/city-pack/model/types';
import { copyLocalizedEnToRu } from '@/entities/city-pack/lib/resolveLocalizedLocaleStatus';
import type { TenantSettings } from '../model/settings';

function readWalkField(value: LocalizedField | undefined) {
  if (!value) {
    return { en: '' };
  }
  if (typeof value === 'string') {
    return { en: value };
  }
  return value;
}

export function copyTenantArrivalWalkEnToRu(settings: TenantSettings): Pick<
  TenantSettings,
  'arrivalWalkToHostel' | 'arrivalWalkToHostelByRoute' | 'arrivalRouteTipsByRoute'
> {
  const byRoute = settings.arrivalWalkToHostelByRoute ?? {};
  const nextByRoute: Partial<Record<RouteId, LocalizedField>> = {};

  for (const [routeId, walk] of Object.entries(byRoute) as [RouteId, LocalizedField | undefined][]) {
    if (walk) {
      nextByRoute[routeId] = copyLocalizedEnToRu(readWalkField(walk));
    }
  }

  const tipsByRoute = settings.arrivalRouteTipsByRoute ?? {};
  const nextTips: Partial<Record<RouteId, import('@/entities/city-pack/model/types').LocalizedText[]>> =
    {};

  for (const [routeId, tips] of Object.entries(tipsByRoute) as [
    RouteId,
    import('@/entities/city-pack/model/types').LocalizedText[] | undefined,
  ][]) {
    if (tips?.length) {
      nextTips[routeId] = tips.map((tip) => copyLocalizedEnToRu(tip));
    }
  }

  return {
    arrivalWalkToHostel: settings.arrivalWalkToHostel
      ? copyLocalizedEnToRu(readWalkField(settings.arrivalWalkToHostel))
      : settings.arrivalWalkToHostel,
    arrivalWalkToHostelByRoute: Object.keys(nextByRoute).length > 0 ? nextByRoute : undefined,
    arrivalRouteTipsByRoute: Object.keys(nextTips).length > 0 ? nextTips : undefined,
  };
}
