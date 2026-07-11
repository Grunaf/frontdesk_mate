'use client';

import { useMemo } from 'react';
import type { CityPackGateSnapshot } from '@/entities/city-pack';
import type { CityPackContent } from '@/entities/city-pack/model/types';
import type { CityPackId, TenantSettings } from '@/entities/tenant';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { ArrivalAccessFields } from '../ArrivalAccessFields';
import {
  ARRIVAL_JOURNEY_ADMIN_MODULES,
  getArrivalJourneyAdminModuleHint,
  getArrivalJourneyAdminModuleStatus,
  type ArrivalJourneyAdminModuleId,
} from '../lib/arrivalJourneyAdminSubsections';
import { AdminField } from '../ui/AdminField';
import { AdminSettingsDrillDown } from '../ui/AdminSettingsDrillDown';
import { mergeDraftSettings, useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { ArrivalTransportFields } from './ArrivalTransportFields';
import { HubTransferFields } from './HubTransferFields';

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
  activeModuleId?: ArrivalJourneyAdminModuleId | null;
  onModuleChange?: (moduleId: ArrivalJourneyAdminModuleId | null) => void;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</p>
  );
}

function useArrivalContactsDraft() {
  const { updateDraft } = useTenantFormDraft();

  const patchContacts = (patch: Partial<NonNullable<TenantSettings['contacts']>>) => {
    updateDraft({ contacts: patch });
  };

  return { patchContacts };
}

function FindBuildingFields({
  settings,
  readinessInput,
}: {
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
}) {
  const { patchContacts } = useArrivalContactsDraft();

  return (
    <div className="space-y-4">
      <AdminField
        label="Property address"
        value={settings?.contacts?.address ?? ''}
        onChange={(value) => patchContacts({ address: value || undefined })}
        missing={isTenantFieldMissing('address', readinessInput)}
        hint="Substituted into walk directions as {address}."
      />
      <AdminField
        label="Google Maps URL"
        value={settings?.contacts?.mapsUrl ?? ''}
        onChange={(value) => patchContacts({ mapsUrl: value || undefined })}
      />
      <p className="text-sm text-muted-foreground">
        Phones and reception hours are in <strong>Reception & hostel</strong>.
      </p>
    </div>
  );
}

export function ArrivalJourneyFields({
  tenantSlug,
  settings,
  cityPackId,
  cityPackLabel,
  cityPackContent,
  readinessInput,
  scope = 'full',
  activeModuleId = null,
  onModuleChange,
}: ArrivalJourneyFieldsProps) {
  const isLaunch = scope === 'launch-core';
  const { draft } = useTenantFormDraft();
  const mergedSettings = useMemo(
    () => mergeDraftSettings(settings ?? {}, draft),
    [draft, settings]
  );

  const modules = useMemo(
    () =>
      ARRIVAL_JOURNEY_ADMIN_MODULES.map((definition) => ({
        id: definition.id,
        label: definition.label,
        description: definition.description,
        hint: getArrivalJourneyAdminModuleHint(definition.id, {
          ...readinessInput,
          settings: mergedSettings,
        }),
        status: getArrivalJourneyAdminModuleStatus(definition.id, {
          ...readinessInput,
          settings: mergedSettings,
        }),
        render: () => {
          switch (definition.id) {
            case 'find-building':
              return (
                <FindBuildingFields settings={mergedSettings} readinessInput={readinessInput} />
              );
            case 'last-mile':
              return (
                <div className="space-y-4">
                  <ArrivalTransportFields
                    tenantSlug={tenantSlug}
                    settings={mergedSettings}
                    cityPackId={cityPackId}
                    cityPackContent={cityPackContent}
                    cityPackLabel={cityPackLabel}
                  />
                  <p className="text-sm text-muted-foreground">
                    Taxi phone override is in <strong>Reception & hostel</strong>.
                  </p>
                </div>
              );
            case 'building-access':
              return <ArrivalAccessFields tenantSlug={tenantSlug} settings={mergedSettings} />;
            case 'hub-transfer':
              return (
                <HubTransferFields
                  settings={mergedSettings}
                  cityPackId={cityPackId}
                  cityPackContent={cityPackContent}
                />
              );
            default:
              return null;
          }
        },
      })),
    [cityPackContent, cityPackId, cityPackLabel, mergedSettings, readinessInput, tenantSlug]
  );

  if (isLaunch) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <SectionHeading>Find the building</SectionHeading>
          <FindBuildingFields settings={mergedSettings} readinessInput={readinessInput} />
        </div>
        <p className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Per-route walk overrides are in the full <strong>Arrival journey</strong> section (Advanced
          mode).
        </p>
        <div className="space-y-4 border-t pt-8">
          <SectionHeading>Enter the building</SectionHeading>
          <ArrivalAccessFields tenantSlug={tenantSlug} settings={mergedSettings} />
        </div>
      </div>
    );
  }

  const handleModuleChange = (moduleId: string | null) => {
    onModuleChange?.(moduleId as ArrivalJourneyAdminModuleId | null);
  };

  return (
    <AdminSettingsDrillDown
      activeModuleId={activeModuleId}
      onModuleChange={handleModuleChange}
      modules={modules}
      detailChrome="external"
    />
  );
}
