'use client';

import { useMemo, useState } from 'react';
import type { CityPackContent, CityPackGateSnapshot } from '@/entities/city-pack';
import type { CityPackId } from '@/entities/hostel';
import type { TenantSettings } from '@/entities/tenant';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import type { AdminSectionId } from '../lib/adminSections';
import { AdminModuleStatusPanel } from '../ui/AdminModuleStatusPanel';
import { mergeDraftSettings, useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { cn } from '@/shared/lib/utils';
import { CityPackNeedNowFields } from './CityPackNeedNowFields';
import { GuestStayFields } from './GuestStayFields';
import { GuestExtrasFields } from './GuestExtrasFields';
import { HostelPlacesFields } from './HostelPlacesFields';
import { HouseRulesFields } from './HouseRulesFields';
import type { CityPackInheritanceSurface } from '../ui/CityPackInheritanceCard';

type GuestAppTab = 'room-map' | 'rules' | 'extras' | 'near-hostel';

interface GuestAppFieldsProps {
  tenantSlug: string;
  settings?: TenantSettings;
  cityPackId: CityPackId;
  cityPackContent?: CityPackContent;
  cityPackGateSnapshot?: CityPackGateSnapshot;
  readinessInput: TenantReadinessInput;
  onJumpToSection?: (sectionId: AdminSectionId) => void;
  scope?: 'full' | 'rules-only';
  surface?: CityPackInheritanceSurface;
  locale?: string;
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
  cityPackContent,
  cityPackGateSnapshot,
  readinessInput,
  onJumpToSection,
  scope = 'full',
  surface = 'platform',
  locale = 'en',
}: GuestAppFieldsProps) {
  const { draft } = useTenantFormDraft();
  const [tab, setTab] = useState<GuestAppTab>(scope === 'rules-only' ? 'rules' : 'room-map');

  const mergedSettings = useMemo(
    () => mergeDraftSettings(settings ?? {}, draft),
    [settings, draft]
  );

  const nearHostelFields = (
    <>
      <CityPackNeedNowFields
        settings={mergedSettings}
        cityPackId={cityPackId}
        cityPackContent={cityPackContent}
        surface={surface}
        locale={locale}
      />
      <HostelPlacesFields settings={mergedSettings} />
    </>
  );

  if (scope === 'rules-only') {
    return (
      <div className="space-y-6">
        {nearHostelFields}
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
        surface={surface}
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
        <GuestStayFields tenantSlug={tenantSlug} settings={mergedSettings} readinessInput={readinessInput} />
      </div>
      <div className={cn(tab !== 'rules' && 'hidden')} aria-hidden={tab !== 'rules'}>
        <HouseRulesFields settings={settings} readinessInput={readinessInput} />
      </div>
      <div className={cn(tab !== 'extras' && 'hidden')} aria-hidden={tab !== 'extras'}>
        <GuestExtrasFields settings={mergedSettings} tenantSlug={tenantSlug} />
      </div>
      <div
        className={cn('space-y-6', tab !== 'near-hostel' && 'hidden')}
        aria-hidden={tab !== 'near-hostel'}
      >
        {nearHostelFields}
      </div>
    </div>
  );
}
