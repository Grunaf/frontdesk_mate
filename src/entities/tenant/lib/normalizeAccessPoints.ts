import type { AccessPoint, ArrivalLayoutKind } from '../model/accessPoints';
import type { TenantSettings } from '../model/settings';
import { resolveGuestBedId } from './resolveGuestBedId';
import { resolveGuestFloorFromStay } from './resolveGuestStayPlan';

const DEFAULT_POINT_TITLES: Record<string, { label: string; kind: AccessPoint['kind'] }> = {
  building_entrance: { label: 'Building entrance', kind: 'outside' },
  floor_1: { label: 'Floor 1', kind: 'zone' },
  floor_2: { label: 'Floor 2', kind: 'zone' },
  floor_3: { label: 'Floor 3', kind: 'zone' },
  hostel_door: { label: 'Hostel door', kind: 'zone' },
};

function sortPoints(points: AccessPoint[]): AccessPoint[] {
  return [...points].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function resolveArrivalLandmark(settings: TenantSettings): string | undefined {
  return settings.arrivalAccess?.landmark?.trim() || undefined;
}

export function resolveLayoutKind(settings: TenantSettings, points: AccessPoint[]): ArrivalLayoutKind {
  if (settings.arrivalAccess?.layoutKind) {
    return settings.arrivalAccess.layoutKind;
  }

  const hasOutside = points.some((point) => point.kind === 'outside' || point.id === 'building_entrance');
  const zoneCount = points.filter((point) => point.kind === 'zone' || point.id !== 'building_entrance').length;

  if (hasOutside && zoneCount > 0) {
    return 'building_then_zones';
  }

  return 'direct_to_floor';
}

export function normalizeAccessPoints(settings: TenantSettings): AccessPoint[] {
  const configured = settings.arrivalAccess?.accessPoints?.filter((point) => point.id?.trim());
  if (!configured?.length) {
    return [];
  }

  return sortPoints(
    configured.map((point, index) => {
      const id = point.id.trim();
      const defaults = DEFAULT_POINT_TITLES[id];

      return {
        id,
        kind: point.kind ?? defaults?.kind ?? (id === 'building_entrance' ? 'outside' : 'zone'),
        label: point.label?.trim() || defaults?.label || id,
        image: point.image?.trim() || undefined,
        code: point.code?.trim() || undefined,
        guideKey: point.guideKey?.trim() || undefined,
        forFloors: point.forFloors?.map((floor) => floor.trim()).filter(Boolean),
        alsoForFloors: point.alsoForFloors?.map((floor) => floor.trim()).filter(Boolean),
        sortOrder: point.sortOrder ?? index,
      };
    })
  );
}

export function resolveGuestFloor(
  settings: TenantSettings,
  guestBedId?: string | null
): string | null {
  const bedId = resolveGuestBedId(settings, guestBedId);
  if (!bedId) return null;

  const fromStay = resolveGuestFloorFromStay(settings, bedId);
  if (fromStay) return fromStay;

  const mapped = settings.arrivalAccess?.bedFloorMap?.[bedId]?.trim();
  return mapped || null;
}

export function filterAccessPointsForGuest(points: AccessPoint[], guestFloor: string | null): AccessPoint[] {
  if (!guestFloor) {
    return points;
  }

  return points.filter((point) => {
    const forFloors = point.forFloors ?? [];
    const alsoForFloors = point.alsoForFloors ?? [];

    if (forFloors.length === 0 && alsoForFloors.length === 0) {
      return true;
    }

    if (forFloors.includes(guestFloor)) {
      return true;
    }

    return alsoForFloors.includes(guestFloor);
  });
}

export function getAccessPointTitleKey(pointId: string): string {
  return `accessPoints.${pointId}.title`;
}

export function getAccessPointCodeLabelKey(pointId: string): string {
  return `accessPoints.${pointId}.codeLabel`;
}
