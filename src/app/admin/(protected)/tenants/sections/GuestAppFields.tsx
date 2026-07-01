'use client';

import { useMemo, useState } from 'react';
import type { CityPackGateSnapshot } from '@/entities/city-pack';
import type { CityPackId } from '@/entities/hostel';
import type { TenantSettings } from '@/entities/tenant';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import type { AdminSectionId } from '../lib/adminSections';
import { AdminModuleStatusPanel } from '../ui/AdminModuleStatusPanel';
import { mergeDraftSettings, useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { cn } from '@/shared/lib/utils';
import { GuestStayFields } from './GuestStayFields';
import { GuestExtrasFields } from './GuestExtrasFields';
import { HostelPlacesFields } from './HostelPlacesFields';
import { HouseRulesFields } from './HouseRulesFields';

type GuestAppTab = 'room-map' | 'rules' | 'extras' | 'near-hostel';

interface GuestAppFieldsProps {
  tenantSlug: string;
  settings?: TenantSettings;
  cityPackId: CityPackId;
  cityPackGateSnapshot?: CityPackGateSnapshot;
  readinessInput: TenantReadinessInput;
  onJumpToSection?: (sectionId: AdminSectionId) => void;
  scope?: 'full' | 'rules-only';
}

const TAB_LABELS: Record<GuestAppTab, string> = {
  'room-map': 'Room map',
  rules: 'House rules',
  extras: 'Extras',
  'near-hostel': 'Near hostel',
};

export function GuestAppFields({
  tenantSlug,
  settings,
  cityPackId,
  cityPackGateSnapshot,
  readinessInput,
  onJumpToSection,
  scope = 'full',
}: GuestAppFieldsProps) {
  const { draft } = useTenantFormDraft();
  const [tab, setTab] = useState<GuestAppTab>(scope === 'rules-only' ? 'rules' : 'room-map');

  const mergedSettings = useMemo(
    () => mergeDraftSettings(settings ?? {}, draft),
    [settings, draft]
  );

  if (scope === 'rules-only') {
    return (
      <div className="space-y-6">
        <HostelPlacesFields settings={mergedSettings} />
        <HouseRulesFields settings={settings} readinessInput={readinessInput} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminModuleStatusPanel
        cityPackId={cityPackId}
        cityPackGateSnapshot={cityPackGateSnapshot}
        settings={mergedSettings}
        onJumpToSection={onJumpToSection}
      />

      <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/20 p-1">
        {(Object.keys(TAB_LABELS) as GuestAppTab[]).map((tabId) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              tab === tabId
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {TAB_LABELS[tabId]}
          </button>
        ))}
      </div>

      <div className={cn(tab !== 'room-map' && 'hidden')} aria-hidden={tab !== 'room-map'}>
        <GuestStayFields tenantSlug={tenantSlug} settings={settings} readinessInput={readinessInput} />
      </div>
      <div className={cn(tab !== 'rules' && 'hidden')} aria-hidden={tab !== 'rules'}>
        <HouseRulesFields settings={settings} readinessInput={readinessInput} />
      </div>
      <div className={cn(tab !== 'extras' && 'hidden')} aria-hidden={tab !== 'extras'}>
        <GuestExtrasFields settings={mergedSettings} tenantSlug={tenantSlug} />
      </div>
      <div className={cn(tab !== 'near-hostel' && 'hidden')} aria-hidden={tab !== 'near-hostel'}>
        <HostelPlacesFields settings={mergedSettings} />
      </div>
    </div>
  );
}
