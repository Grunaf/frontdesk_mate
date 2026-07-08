import type { RouteId } from '@/entities/hostel';
import type { LocalizedField } from '@/entities/city-pack/model/types';
import { copyLocalizedEnToRu } from '@/entities/city-pack/lib/resolveLocalizedLocaleStatus';
import type { TenantLocalArrivalPath, TenantSettings } from '../model/settings';

function readWalkField(value: LocalizedField | undefined) {
  if (!value) {
    return { en: '' };
  }
  if (typeof value === 'string') {
    return { en: value };
  }
  return value;
}

function copyLocalPathEnToRu(path: TenantLocalArrivalPath): TenantLocalArrivalPath {
  return {
    mode: path.mode,
    title: path.title ? copyLocalizedEnToRu(readWalkField(path.title)) : path.title,
    summary: path.summary ? copyLocalizedEnToRu(readWalkField(path.summary)) : path.summary,
    primaryText: copyLocalizedEnToRu(readWalkField(path.primaryText)),
    getOffAt: path.getOffAt ? copyLocalizedEnToRu(readWalkField(path.getOffAt)) : path.getOffAt,
    walkToHostel: path.walkToHostel
      ? copyLocalizedEnToRu(readWalkField(path.walkToHostel))
      : path.walkToHostel,
  };
}

export function copyTenantArrivalWalkEnToRu(settings: TenantSettings): Pick<
  TenantSettings,
  | 'arrivalWalkToHostel'
  | 'arrivalWalkToHostelByRoute'
  | 'arrivalGetOffAtByRoute'
  | 'arrivalLocalByRoute'
  | 'arrivalRouteTipsByRoute'
> {
  const byRoute = settings.arrivalWalkToHostelByRoute ?? {};
  const nextByRoute: Partial<Record<RouteId, LocalizedField>> = {};

  for (const [routeId, walk] of Object.entries(byRoute) as [RouteId, LocalizedField | undefined][]) {
    if (walk) {
      nextByRoute[routeId] = copyLocalizedEnToRu(readWalkField(walk));
    }
  }

  const getOffByRoute = settings.arrivalGetOffAtByRoute ?? {};
  const nextGetOff: Partial<Record<RouteId, LocalizedField>> = {};

  for (const [routeId, getOff] of Object.entries(getOffByRoute) as [
    RouteId,
    LocalizedField | undefined,
  ][]) {
    if (getOff) {
      nextGetOff[routeId] = copyLocalizedEnToRu(readWalkField(getOff));
    }
  }

  const localByRoute = settings.arrivalLocalByRoute ?? {};
  const nextLocal: Partial<Record<RouteId, TenantLocalArrivalPath>> = {};

  for (const [routeId, path] of Object.entries(localByRoute) as [
    RouteId,
    TenantLocalArrivalPath | undefined,
  ][]) {
    if (path) {
      nextLocal[routeId] = copyLocalPathEnToRu(path);
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
    arrivalGetOffAtByRoute: Object.keys(nextGetOff).length > 0 ? nextGetOff : undefined,
    arrivalLocalByRoute: Object.keys(nextLocal).length > 0 ? nextLocal : undefined,
    arrivalRouteTipsByRoute: Object.keys(nextTips).length > 0 ? nextTips : undefined,
  };
}
