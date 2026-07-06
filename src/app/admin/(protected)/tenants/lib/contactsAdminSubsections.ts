import type { ModuleStatus, TenantSettings } from '@/entities/tenant';
import type { TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { isTenantFieldMissing } from '@/entities/tenant/lib/resolveTenantReadiness';
import {
  appendSettingsModuleToUrl,
  SETTINGS_MODULE_QUERY,
  stripSettingsModuleFromUrl,
} from './tenantSettingsModuleUrl';

export const CONTACTS_ADMIN_MODULE_QUERY = SETTINGS_MODULE_QUERY;

export const CONTACTS_ADMIN_MODULE_IDS = [
  'reception-desk',
  'guest-access-message',
  'phones-email',
  'stay-policy',
] as const;

export type ContactsAdminModuleId = (typeof CONTACTS_ADMIN_MODULE_IDS)[number];

export interface ContactsAdminModuleDefinition {
  id: ContactsAdminModuleId;
  label: string;
  description: string;
}

export const CONTACTS_ADMIN_MODULES: ContactsAdminModuleDefinition[] = [
  {
    id: 'reception-desk',
    label: 'Reception desk',
    description: 'Hours, availability hint, desk PIN, and WhatsApp options.',
  },
  {
    id: 'guest-access-message',
    label: 'Guest access message',
    description: 'Template reception copies after issuing guest access.',
  },
  {
    id: 'phones-email',
    label: 'Phones & email',
    description: 'Reception phone, channel overrides, and contact email.',
  },
  {
    id: 'stay-policy',
    label: 'Stay policy & money',
    description: 'Check-in/out times, self check-in, tax, and currency.',
  },
];

export function normalizeContactsAdminModuleId(
  value: string | null | undefined
): ContactsAdminModuleId | null {
  if (!value) {
    return null;
  }
  return CONTACTS_ADMIN_MODULE_IDS.includes(value as ContactsAdminModuleId)
    ? (value as ContactsAdminModuleId)
    : null;
}

export function getContactsAdminModuleLabel(moduleId: ContactsAdminModuleId): string {
  return CONTACTS_ADMIN_MODULES.find((entry) => entry.id === moduleId)?.label ?? moduleId;
}

export function getContactsAdminModuleHint(
  moduleId: ContactsAdminModuleId,
  settings: TenantSettings
): string | undefined {
  switch (moduleId) {
    case 'reception-desk': {
      const open = settings.reception?.open?.trim();
      const close = settings.reception?.close?.trim();
      if (open && close) {
        return `${open}–${close}`;
      }
      return open || close ? 'Set both open and close times' : 'Reception hours not set';
    }
    case 'guest-access-message':
      return settings.reception?.guestAccessMessageTemplate?.trim()
        ? 'Custom template'
        : 'Uses built-in default';
    case 'phones-email':
      return settings.contacts?.phoneRaw?.trim()
        ? 'Reception phone set'
        : 'Add reception phone';
    case 'stay-policy':
      return settings.checkInTime?.trim() ? 'Check-in time set' : 'Set check-in from';
    default:
      return undefined;
  }
}

export function getContactsAdminModuleStatus(
  moduleId: ContactsAdminModuleId,
  readinessInput: TenantReadinessInput
): ModuleStatus | 'n/a' {
  const settings = readinessInput.settings ?? {};

  switch (moduleId) {
    case 'reception-desk':
      return settings.reception?.open?.trim() && settings.reception?.close?.trim()
        ? 'ready'
        : 'preview';
    case 'guest-access-message':
      return 'ready';
    case 'phones-email':
      return settings.contacts?.phoneRaw?.trim() ? 'ready' : 'preview';
    case 'stay-policy':
      return isTenantFieldMissing('checkInTime', readinessInput) ? 'preview' : 'ready';
    default:
      return 'n/a';
  }
}

export function appendContactsModuleToUrl(pathname: string, moduleId: ContactsAdminModuleId): string {
  return appendSettingsModuleToUrl(pathname, moduleId);
}

export function stripContactsModuleFromUrl(pathname: string, search: string): string {
  return stripSettingsModuleFromUrl(pathname, search);
}

export { appendSettingsModuleToUrl, SETTINGS_MODULE_QUERY, stripSettingsModuleFromUrl };
