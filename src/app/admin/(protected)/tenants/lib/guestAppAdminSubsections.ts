import type { CityPackGateSnapshot } from '@/entities/city-pack';
import type { ModuleStatus } from '@/entities/tenant';
import {
  resolveGuestAppModules,
  type GuestAppModuleId,
} from '@/entities/tenant/lib/resolveGuestAppModules';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';

export const GUEST_APP_ADMIN_MODULE_IDS = [
  'room-map',
  'house-rules',
  'extras',
  'near-hostel',
] as const;

export type GuestAppAdminModuleId = (typeof GUEST_APP_ADMIN_MODULE_IDS)[number];

export interface GuestAppAdminModuleDefinition {
  id: GuestAppAdminModuleId;
  label: string;
  description: string;
}

export const GUEST_APP_ADMIN_MODULES: GuestAppAdminModuleDefinition[] = [
  {
    id: 'room-map',
    label: 'Room map',
    description: 'Beds, wayfinding, and module toggle.',
  },
  {
    id: 'house-rules',
    label: 'House rules',
    description: 'FAQ and rules guests see in the app.',
  },
  {
    id: 'extras',
    label: 'Extras',
    description: 'Laundry, early check-in, and partner tiles.',
  },
  {
    id: 'near-hostel',
    label: 'Near hostel',
    description: 'Need-now picks and curated places.',
  },
];

export interface GuestAppAdminSubsectionContext {
  readinessInput: TenantReadinessInput;
  cityPackGateSnapshot?: CityPackGateSnapshot;
}

function guestAppCapabilityId(moduleId: GuestAppAdminModuleId): GuestAppModuleId | null {
  switch (moduleId) {
    case 'room-map':
      return 'roomMap';
    case 'house-rules':
      return 'houseRules';
    case 'near-hostel':
      return 'localGuide';
    case 'extras':
      return null;
    default:
      return null;
  }
}

function resolveGuestAppCapability(
  moduleId: GuestAppAdminModuleId,
  context: GuestAppAdminSubsectionContext
) {
  const capabilityId = guestAppCapabilityId(moduleId);
  if (!capabilityId) {
    return null;
  }
  const modules = resolveGuestAppModules({
    cityPackId: context.readinessInput.cityPackId,
    settings: context.readinessInput.settings ?? {},
    cityPackGateSnapshot: context.cityPackGateSnapshot,
  });
  return modules.find((entry) => entry.id === capabilityId) ?? null;
}

export function normalizeGuestAppAdminModuleId(
  value: string | null | undefined
): GuestAppAdminModuleId | null {
  if (!value) {
    return null;
  }
  return GUEST_APP_ADMIN_MODULE_IDS.includes(value as GuestAppAdminModuleId)
    ? (value as GuestAppAdminModuleId)
    : null;
}

export function getGuestAppAdminModuleLabel(moduleId: GuestAppAdminModuleId): string {
  return GUEST_APP_ADMIN_MODULES.find((entry) => entry.id === moduleId)?.label ?? moduleId;
}

export function getGuestAppAdminModuleHint(
  moduleId: GuestAppAdminModuleId,
  context: GuestAppAdminSubsectionContext
): string | undefined {
  if (moduleId === 'extras') {
    return 'Optional upsells for guests';
  }

  const capability = resolveGuestAppCapability(moduleId, context);
  if (!capability) {
    return undefined;
  }

  if (capability.status === 'ready') {
    return 'Live for guests';
  }

  return capability.detail ?? 'Finish setup below';
}

export function getGuestAppAdminModuleStatus(
  moduleId: GuestAppAdminModuleId,
  context: GuestAppAdminSubsectionContext
): ModuleStatus | 'n/a' {
  if (moduleId === 'extras') {
    return 'n/a';
  }

  const capability = resolveGuestAppCapability(moduleId, context);
  return capability?.status ?? 'n/a';
}

export function getGuestAppAdminModuleIdentityAction(
  moduleId: GuestAppAdminModuleId,
  context: GuestAppAdminSubsectionContext
): boolean {
  if (moduleId !== 'near-hostel') {
    return false;
  }
  const capability = resolveGuestAppCapability(moduleId, context);
  return capability?.actionSectionId === 'identity';
}
