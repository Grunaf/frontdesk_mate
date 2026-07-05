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

export type CityPackInheritanceSurface = 'platform' | 'owner';

export type OwnerCityPackCardLabels = {
  inheritedTitle: string;
  inheritedDescription: string;
  managedHint: string;
  requestCityLink: string;
  statusReady: string;
  statusNotReady: string;
  enabledRoutes: string;
  cityTaxi: string;
  packLabel: string;
  none: string;
};

export interface CityPackInheritanceCardProps {
  cityPackId: CityPackId;
  cityPackLabel?: string;
  cityPackGateSnapshot: CityPackGateSnapshot;
  cityPackContent?: CityPackContent;
  surface?: CityPackInheritanceSurface;
  locale?: string;
  ownerLabels?: OwnerCityPackCardLabels;
  compact?: boolean;
}

export function CityPackInheritanceCard({
  cityPackId,
  cityPackLabel,
  cityPackGateSnapshot,
  cityPackContent,
  surface = 'platform',
  locale = 'en',
  ownerLabels,
  compact = false,
}: CityPackInheritanceCardProps) {
  const isOwner = surface === 'owner';
  const packReady = isCityPackReadyForTenant(cityPackId, cityPackGateSnapshot);
  const snapshotReason = resolveCityPackNotReadyReasonForTenant(cityPackId, cityPackGateSnapshot);
  const transportReadiness = resolveCityPackTransportReadiness({
    packId: cityPackId,
    content: cityPackContent,
  });
  const transportDetail =
    snapshotReason ??
    transportReadiness.detail ??
    'City pack routes are not ready for guests yet.';
  const enabledRoutes = resolveAdminCityPackEnabledRoutes(cityPackId, cityPackContent);
  const routeLabels = enabledRoutes
    .map((routeId) => ROUTE_PRESETS.find((route) => route.id === routeId)?.label ?? routeId)
    .join(', ');
  const cityPack = getCityPack(cityPackId);
  const displayLabel = cityPackLabel ?? cityPackId;
  const taxiName =
    cityPackContent?.recommendedTaxi?.name ?? cityPack.recommendedTaxi?.name ?? 'Not set';

  const title = isOwner
    ? (ownerLabels?.inheritedTitle ?? 'City transport (inherited)')
    : 'City transport (inherited)';
  const description = isOwner
    ? (ownerLabels?.inheritedDescription ??
      'Hub routes and transit copy are shared for your city. You only customize address and last-mile walk.')
    : 'Hub routes and transit copy are shared by all hostels in this city. Edit once in the city pack — this hostel only overrides address and last-mile walk below.';
  const statusLabel = packReady
    ? isOwner
      ? (ownerLabels?.statusReady ?? 'Ready')
      : 'Ready'
    : isOwner
      ? (ownerLabels?.statusNotReady ?? 'Not ready')
      : 'Not ready';
  const routesDt = isOwner ? (ownerLabels?.enabledRoutes ?? 'Enabled routes') : 'Enabled routes';
  const taxiDt = isOwner ? (ownerLabels?.cityTaxi ?? 'City taxi') : 'City taxi';
  const packDt = isOwner ? (ownerLabels?.packLabel ?? 'Pack') : 'Pack';
  const noneLabel = isOwner ? (ownerLabels?.none ?? 'None') : 'None';

  return (
    <div
      className={
        compact
          ? 'rounded-lg border bg-muted/20 px-3 py-2.5 text-sm'
          : 'rounded-lg border bg-muted/20 px-4 py-3 text-sm'
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {!compact ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
      <dl className={compact ? 'mt-2 grid gap-2 sm:grid-cols-2' : 'mt-3 grid gap-2 sm:grid-cols-2'}>
        <div>
          <dt className="text-xs text-muted-foreground">{packDt}</dt>
          <dd className="font-medium">{displayLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd className="font-medium">{statusLabel}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">{routesDt}</dt>
          <dd className="font-medium">{routeLabels || noneLabel}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">{taxiDt}</dt>
          <dd className="font-medium">{taxiName}</dd>
        </div>
      </dl>
      {!packReady ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {transportDetail}
        </p>
      ) : null}
      {isOwner ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {ownerLabels?.managedHint ?? 'City pack content is managed by Frontdesk Mate.'}{' '}
          <Link
            href={
              packReady
                ? `/${locale}/city-request`
                : `/${locale}/city-request?pack=${encodeURIComponent(cityPackId)}`
            }
            className="font-semibold text-primary underline"
          >
            {ownerLabels?.requestCityLink ?? 'Request city support →'}
          </Link>
        </p>
      ) : (
        <Link
          href={`/admin/city-packs/${cityPackId}`}
          className="mt-3 inline-block text-sm font-semibold text-primary underline"
          target="_blank"
          rel="noreferrer"
        >
          Edit city transport →
        </Link>
      )}
    </div>
  );
}
