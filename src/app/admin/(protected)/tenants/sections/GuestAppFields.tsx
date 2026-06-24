'use client';

import { useMemo } from 'react';
import type { CityPackGateSnapshot } from '@/entities/city-pack';
import type { CityPackId } from '@/entities/hostel';
import type { TenantSettings } from '@/entities/tenant';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import type { AdminSectionId } from '../lib/adminSections';
import { AdminModuleStatusPanel } from '../ui/AdminModuleStatusPanel';
import { mergeDraftSettings, useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { GuestStayFields } from './GuestStayFields';
import { GuestExtrasFields } from './GuestExtrasFields';
import { HostelPlacesFields } from './HostelPlacesFields';
import { HouseRulesFields } from './HouseRulesFields';

interface GuestAppFieldsProps {
  settings?: TenantSettings;
  cityPackId: CityPackId;
  cityPackGateSnapshot?: CityPackGateSnapshot;
  readinessInput: TenantReadinessInput;
  onJumpToSection?: (sectionId: AdminSectionId) => void;
  scope?: 'full' | 'rules-only';
}

export function GuestAppFields({
  settings,
  cityPackId,
  cityPackGateSnapshot,
  readinessInput,
  onJumpToSection,
  scope = 'full',
}: GuestAppFieldsProps) {
  const { draft } = useTenantFormDraft();

  const mergedSettings = useMemo(
    () => mergeDraftSettings(settings ?? {}, draft),
    [settings, draft]
  );

  return (
    <div className="space-y-6">
      {scope === 'full' ? (
        <>
          <AdminModuleStatusPanel
            cityPackId={cityPackId}
            cityPackGateSnapshot={cityPackGateSnapshot}
            settings={mergedSettings}
            onJumpToSection={onJumpToSection}
          />
          <GuestStayFields settings={settings} readinessInput={readinessInput} />
          <GuestExtrasFields settings={mergedSettings} />
        </>
      ) : null}

      <HostelPlacesFields settings={mergedSettings} />

      <HouseRulesFields
        settings={settings}
        readinessInput={readinessInput}
      />
    </div>
  );
}
