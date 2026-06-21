import type { CityPackId } from '@/entities/hostel';

export interface CityPackGateEntry {
  readyForTenants: boolean;
  notReadyReason: string | null;
  placesCount: number;
  routesGateMet: boolean;
  status: 'draft' | 'ready';
}

export type CityPackGateSnapshot = Record<string, CityPackGateEntry>;

export function buildCityPackGateSnapshot(
  packs: {
    id: string;
    status: 'draft' | 'ready';
    placesCount: number;
    routesGateMet: boolean;
    readyForTenants: boolean;
    notReadyReason: string | null;
  }[]
): CityPackGateSnapshot {
  return Object.fromEntries(
    packs.map((pack) => [
      pack.id,
      {
        readyForTenants: pack.readyForTenants,
        notReadyReason: pack.notReadyReason,
        placesCount: pack.placesCount,
        routesGateMet: pack.routesGateMet,
        status: pack.status,
      },
    ])
  );
}

export function isCityPackReadyForTenant(
  cityPackId: string,
  gateSnapshot: CityPackGateSnapshot
): boolean {
  const entry = gateSnapshot[cityPackId];
  if (entry) {
    return entry.readyForTenants;
  }

  return false;
}

export function resolveCityPackNotReadyReasonForTenant(
  cityPackId: string,
  gateSnapshot: CityPackGateSnapshot
): string | null {
  const entry = gateSnapshot[cityPackId];
  if (entry) {
    return entry.notReadyReason;
  }

  return 'Choose a ready city pack or finish it in City packs admin.';
}

export function resolveCityPackHasPlacesForTenant(
  cityPackId: CityPackId,
  gateSnapshot: CityPackGateSnapshot
): boolean {
  return isCityPackReadyForTenant(cityPackId, gateSnapshot);
}
