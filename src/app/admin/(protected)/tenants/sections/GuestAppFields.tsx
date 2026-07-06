'use client';

import { useMemo } from 'react';
import type { CityPackContent, CityPackGateSnapshot } from '@/entities/city-pack';
import type { CityPackId } from '@/entities/hostel';
import type { TenantSettings } from '@/entities/tenant';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import type { AdminSectionId } from '../lib/adminSections';
import {
  GUEST_APP_ADMIN_MODULES,
  getGuestAppAdminModuleHint,
  getGuestAppAdminModuleIdentityAction,
  getGuestAppAdminModuleStatus,
  type GuestAppAdminModuleId,
  type GuestAppAdminSubsectionContext,
} from '../lib/guestAppAdminSubsections';
import { AdminSettingsDrillDown } from '../ui/AdminSettingsDrillDown';
import { mergeDraftSettings, useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { CityPackNeedNowFields } from './CityPackNeedNowFields';
import { GuestStayFields } from './GuestStayFields';
import { GuestExtrasFields } from './GuestExtrasFields';
import { HostelPlacesFields } from './HostelPlacesFields';
import { HouseRulesFields } from './HouseRulesFields';
import type { CityPackInheritanceSurface } from '../ui/CityPackInheritanceCard';
import { GuestTourismRegistrationComplianceField } from '@/features/guest-tourism-registration';

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
  readOnly?: boolean;
  activeModuleId?: GuestAppAdminModuleId | null;
  onModuleChange?: (moduleId: GuestAppAdminModuleId | null) => void;
}

function NearHostelModule({
  mergedSettings,
  cityPackId,
  cityPackContent,
  surface,
  locale,
  subsectionContext,
  onJumpToSection,
}: {
  mergedSettings: TenantSettings;
  cityPackId: CityPackId;
  cityPackContent?: CityPackContent;
  surface: CityPackInheritanceSurface;
  locale: string;
  subsectionContext: GuestAppAdminSubsectionContext;
  onJumpToSection?: (sectionId: AdminSectionId) => void;
}) {
  return (
    <div className="space-y-6">
      {getGuestAppAdminModuleIdentityAction('near-hostel', subsectionContext) &&
      onJumpToSection ? (
        <p className="text-sm text-muted-foreground">
          Local guide needs a ready city pack.{' '}
          <button
            type="button"
            onClick={() => onJumpToSection('identity')}
            className="font-semibold text-primary hover:underline"
          >
            {surface === 'owner' ? 'Open Identity section' : 'Go to Identity'}
          </button>
        </p>
      ) : null}
      <CityPackNeedNowFields
        settings={mergedSettings}
        cityPackId={cityPackId}
        cityPackContent={cityPackContent}
        surface={surface}
        locale={locale}
      />
      <HostelPlacesFields settings={mergedSettings} />
    </div>
  );
}

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
  readOnly = false,
  activeModuleId = null,
  onModuleChange,
}: GuestAppFieldsProps) {
  const { draft } = useTenantFormDraft();

  const mergedSettings = useMemo(
    () => mergeDraftSettings(settings ?? {}, draft),
    [settings, draft]
  );

  const subsectionContext = useMemo(
    () => ({
      readinessInput: { ...readinessInput, settings: mergedSettings },
      cityPackGateSnapshot,
    }),
    [cityPackGateSnapshot, mergedSettings, readinessInput]
  );

  const modules = useMemo(() => {
    if (scope !== 'full') {
      return [];
    }
    return GUEST_APP_ADMIN_MODULES.map((definition) => ({
      id: definition.id,
      label: definition.label,
      description: definition.description,
      hint: getGuestAppAdminModuleHint(definition.id, subsectionContext),
      status: getGuestAppAdminModuleStatus(definition.id, subsectionContext),
      render: () => {
        switch (definition.id) {
          case 'room-map':
            return (
              <GuestStayFields
                tenantSlug={tenantSlug}
                settings={mergedSettings}
                readinessInput={readinessInput}
              />
            );
          case 'house-rules':
            return <HouseRulesFields settings={settings} readinessInput={readinessInput} />;
          case 'extras':
            return <GuestExtrasFields settings={mergedSettings} tenantSlug={tenantSlug} />;
          case 'near-hostel':
            return (
              <NearHostelModule
                mergedSettings={mergedSettings}
                cityPackId={cityPackId}
                cityPackContent={cityPackContent}
                surface={surface}
                locale={locale}
                subsectionContext={subsectionContext}
                onJumpToSection={onJumpToSection}
              />
            );
          default:
            return null;
        }
      },
    }));
  }, [
    cityPackContent,
    cityPackId,
    locale,
    mergedSettings,
    onJumpToSection,
    readinessInput,
    scope,
    settings,
    subsectionContext,
    surface,
    tenantSlug,
  ]);

  if (scope === 'rules-only') {
    return (
      <div className="space-y-6">
        <NearHostelModule
          mergedSettings={mergedSettings}
          cityPackId={cityPackId}
          cityPackContent={cityPackContent}
          surface={surface}
          locale={locale}
          subsectionContext={subsectionContext}
          onJumpToSection={onJumpToSection}
        />
        <HouseRulesFields settings={settings} readinessInput={readinessInput} />
      </div>
    );
  }

  const handleModuleChange = (moduleId: string | null) => {
    onModuleChange?.(moduleId as GuestAppAdminModuleId | null);
  };

  const showHubCompliance = activeModuleId === null;

  return (
    <div className="space-y-6">
      {showHubCompliance ? (
        <GuestTourismRegistrationComplianceField mergedSettings={mergedSettings} disabled={readOnly} />
      ) : null}
      <AdminSettingsDrillDown
        activeModuleId={activeModuleId}
        onModuleChange={handleModuleChange}
        modules={modules}
        detailChrome="external"
      />
    </div>
  );
}
