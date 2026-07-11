import { resolveArrivalWalkReadiness } from '@/entities/city-pack/lib/resolveArrivalTransportReadiness';
import type { ModuleStatus } from '@/entities/tenant';
import { hasDoorAccessConfigured } from '@/entities/tenant/lib/resolveArrivalAccessPlan';
import {
  isTenantFieldMissing,
  type TenantReadinessInput,
} from '@/entities/tenant/lib/resolveTenantReadiness';

export const ARRIVAL_JOURNEY_ADMIN_MODULE_IDS = [
  'find-building',
  'last-mile',
  'building-access',
  'hub-transfer',
] as const;

export type ArrivalJourneyAdminModuleId = (typeof ARRIVAL_JOURNEY_ADMIN_MODULE_IDS)[number];

export interface ArrivalJourneyAdminModuleDefinition {
  id: ArrivalJourneyAdminModuleId;
  label: string;
  description: string;
}

export const ARRIVAL_JOURNEY_ADMIN_MODULES: ArrivalJourneyAdminModuleDefinition[] = [
  {
    id: 'find-building',
    label: 'Find the building',
    description: 'Address and map link for guests.',
  },
  {
    id: 'last-mile',
    label: 'Last mile to the door',
    description: 'Walk directions and tips per city route.',
  },
  {
    id: 'building-access',
    label: 'Enter the building',
    description: 'Layout, day mode, doors, photos.',
  },
  {
    id: 'hub-transfer',
    label: 'Hub transfer',
    description:
      'Guests can request availability via WhatsApp; you configure which arrival hubs offer transfer.',
  },
];

export function normalizeArrivalJourneyAdminModuleId(
  value: string | null | undefined
): ArrivalJourneyAdminModuleId | null {
  if (!value) {
    return null;
  }
  return ARRIVAL_JOURNEY_ADMIN_MODULE_IDS.includes(value as ArrivalJourneyAdminModuleId)
    ? (value as ArrivalJourneyAdminModuleId)
    : null;
}

export function getArrivalJourneyAdminModuleLabel(moduleId: ArrivalJourneyAdminModuleId): string {
  return ARRIVAL_JOURNEY_ADMIN_MODULES.find((entry) => entry.id === moduleId)?.label ?? moduleId;
}

function countEnabledHubTransferCategories(settings: TenantReadinessInput['settings']): number {
  return settings?.hubTransfer?.enabledHubCategories?.length ?? 0;
}

export function getArrivalJourneyAdminModuleHint(
  moduleId: ArrivalJourneyAdminModuleId,
  readinessInput: TenantReadinessInput
): string | undefined {
  const settings = readinessInput.settings ?? {};

  switch (moduleId) {
    case 'find-building':
      return settings.contacts?.address?.trim()
        ? 'Address set'
        : 'Add property address';
    case 'last-mile': {
      const walkReadiness = resolveArrivalWalkReadiness({
        cityPackId: readinessInput.cityPackId,
        settings,
        cityPackContent: readinessInput.cityPackContent,
      });
      return walkReadiness.complete
        ? 'Walk directions configured'
        : walkReadiness.detail ?? 'Add walk directions';
    }
    case 'building-access':
      return hasDoorAccessConfigured(settings)
        ? 'Door access configured'
        : 'Add access points with codes or paths';
    case 'hub-transfer': {
      const count = countEnabledHubTransferCategories(settings);
      if (count === 0) {
        return 'None selected';
      }
      return count === 1 ? '1 hub enabled' : `${count} hubs enabled`;
    }
    default:
      return undefined;
  }
}

export function getArrivalJourneyAdminModuleStatus(
  moduleId: ArrivalJourneyAdminModuleId,
  readinessInput: TenantReadinessInput
): ModuleStatus | 'n/a' {
  const settings = readinessInput.settings ?? {};

  switch (moduleId) {
    case 'find-building':
      return isTenantFieldMissing('address', readinessInput) ? 'preview' : 'ready';
    case 'last-mile': {
      const walkReadiness = resolveArrivalWalkReadiness({
        cityPackId: readinessInput.cityPackId,
        settings,
        cityPackContent: readinessInput.cityPackContent,
      });
      return walkReadiness.complete ? 'ready' : 'preview';
    }
    case 'building-access':
      return hasDoorAccessConfigured(settings) ? 'ready' : 'preview';
    case 'hub-transfer':
      return countEnabledHubTransferCategories(settings) >= 1 ? 'ready' : 'preview';
    default:
      return 'n/a';
  }
}
