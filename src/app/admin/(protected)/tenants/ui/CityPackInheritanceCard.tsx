import Link from 'next/link';
import { ROUTE_PRESETS } from '@/entities/city-pack';
import {
  resolveAdminCityPackEnabledRoutes,
} from '@/entities/city-pack/lib/resolveAdminCityPackTransport';
import {
  isCityPackReadyForTenant,
  resolveCityPackNotReadyReasonForTenant,
} from '@/entities/city-pack/lib/resolveCityPackGateForTenant';
import { resolveCityPackTransportReadiness } from '@/entities/city-pack/lib/resolveCityPackTransportReadiness';
import type { CityPackGateSnapshot } from '@/entities/city-pack';
import type { CityPackContent } from '@/entities/city-pack/model/types';
import { getCityPack, type CityPackId } from '@/entities/hostel';

interface CityPackInheritanceCardProps {
  cityPackId: CityPackId;
  cityPackLabel?: string;
  cityPackGateSnapshot: CityPackGateSnapshot;
  cityPackContent?: CityPackContent;
}

export function CityPackInheritanceCard({
  cityPackId,
  cityPackLabel,
  cityPackGateSnapshot,
  cityPackContent,
}: CityPackInheritanceCardProps) {
  const packReady = isCityPackReadyForTenant(cityPackId, cityPackGateSnapshot);
  const snapshotReason = resolveCityPackNotReadyReasonForTenant(cityPackId, cityPackGateSnapshot);
  const transportReadiness = resolveCityPackTransportReadiness({
    packId: cityPackId,
    content: cityPackContent,
  });
  const transportDetail =
    snapshotReason ?? transportReadiness.detail ?? 'City pack routes are not ready for guests yet.';
  const enabledRoutes = resolveAdminCityPackEnabledRoutes(cityPackId, cityPackContent);
  const routeLabels = enabledRoutes
    .map((routeId) => ROUTE_PRESETS.find((route) => route.id === routeId)?.label ?? routeId)
    .join(', ');
  const cityPack = getCityPack(cityPackId);
  const displayLabel = cityPackLabel ?? cityPackId;
  const taxiName =
    cityPackContent?.recommendedTaxi?.name ?? cityPack.recommendedTaxi?.name ?? 'Not set';

  return (
    <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        City transport (inherited)
      </p>
      <p className="mt-2 text-muted-foreground">
        Hub routes and transit copy are shared by all hostels in this city. Edit once in the city
        pack — this hostel only overrides address and last-mile walk below.
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Pack</dt>
          <dd className="font-medium">{displayLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd className="font-medium">{packReady ? 'Ready' : 'Not ready'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Enabled routes</dt>
          <dd className="font-medium">{routeLabels || 'None'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">City taxi</dt>
          <dd className="font-medium">{taxiName}</dd>
        </div>
      </dl>
      {!packReady ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {transportDetail}
        </p>
      ) : null}
      <Link
        href={`/admin/city-packs/${cityPackId}`}
        className="mt-3 inline-block text-sm font-semibold text-primary underline"
        target="_blank"
        rel="noreferrer"
      >
        Edit city transport →
      </Link>
    </div>
  );
}
