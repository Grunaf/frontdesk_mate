'use client';

import type { CityPackGateSnapshot } from '@/entities/city-pack';
import type { CityPackContent } from '@/entities/city-pack/model/types';
import type { CityPackId, TenantSettings } from '@/entities/tenant';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { ArrivalAccessFields } from '../ArrivalAccessFields';
import { AdminField } from '../ui/AdminField';
import { ArrivalTransportFields } from './ArrivalTransportFields';

export type ArrivalJourneyScope = 'full' | 'launch-core';

interface ArrivalJourneyFieldsProps {
  tenantSlug: string;
  settings?: TenantSettings;
  cityPackId: CityPackId;
  cityPackLabel?: string;
  cityPackGateSnapshot: CityPackGateSnapshot;
  cityPackContent?: CityPackContent;
  readinessInput: TenantReadinessInput;
  scope?: ArrivalJourneyScope;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</p>
  );
}

export function ArrivalJourneyFields({
  tenantSlug,
  settings,
  cityPackId,
  cityPackContent,
  readinessInput,
  scope = 'full',
}: ArrivalJourneyFieldsProps) {
  const isLaunch = scope === 'launch-core';

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <SectionHeading>Find the building</SectionHeading>
        <AdminField
          label="Property address"
          name="address"
          defaultValue={settings?.contacts?.address}
          missing={isTenantFieldMissing('address', readinessInput)}
          hint="Substituted into walk directions as {address}."
        />
        <AdminField label="Google Maps URL" name="mapsUrl" defaultValue={settings?.contacts?.mapsUrl} />
        <p className="text-sm text-muted-foreground">
          Phones and reception hours are in <strong>Reception & hostel</strong>.
        </p>
      </div>

      {!isLaunch ? (
        <>
          <div className="space-y-4 border-t pt-8">
            <SectionHeading>Last mile to the door</SectionHeading>
            <ArrivalTransportFields
              tenantSlug={tenantSlug}
              settings={settings}
              cityPackId={cityPackId}
              cityPackContent={cityPackContent}
            />
            <p className="text-sm text-muted-foreground">
              Taxi phone override is in <strong>Reception & hostel</strong>.
            </p>
          </div>

          <div className="space-y-4 border-t pt-8">
            <SectionHeading>Enter the building</SectionHeading>
            <ArrivalAccessFields tenantSlug={tenantSlug} settings={settings} />
          </div>
        </>
      ) : (
        <>
          <p className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Per-route walk overrides are in the full <strong>Arrival journey</strong> section (Advanced
            mode).
          </p>
          <div className="space-y-4 border-t pt-8">
            <SectionHeading>Enter the building</SectionHeading>
            <ArrivalAccessFields tenantSlug={tenantSlug} settings={settings} />
          </div>
        </>
      )}
    </div>
  );
}
