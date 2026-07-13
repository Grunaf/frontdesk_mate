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
  'reception-staff',
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
    description: 'Hours, availability hint, desk login URL, and WhatsApp options.',
  },
  {
    id: 'reception-staff',
    label: 'Reception staff accounts',
    description: 'Personal logins and PINs for the reception desk app.',
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
    case 'reception-staff':
      return 'Manage staff logins';
    case 'guest-access-message':
      return settings.reception?.guestAccessMessageTemplate?.trim()
        ? 'Custom template'
        : 'Uses built-in default';
    case 'phones-email': {
      const parts: string[] = [];
      if (settings.contacts?.email?.trim()) {
        parts.push('Email');
      }
      if (settings.contacts?.instagram?.trim() || settings.contacts?.facebook?.trim()) {
        parts.push('Social');
      }
      if (settings.contacts?.guestChatUrl?.trim() || settings.reception?.whatsappEnabled !== false) {
        parts.push('Guest WA');
      }
      if (settings.contacts?.phoneRaw?.trim()) {
        return parts.length > 0 ? parts.join(' · ') : 'Reception phone set';
      }
      return parts.length > 0 ? parts.join(' · ') : 'Add reception phone';
    }
    case 'stay-policy':
      if (!settings.checkInTime?.trim()) {
        return 'Set check-in from';
      }
      return settings.propertyTimeZone?.trim() ? 'Check-in time set' : 'Set property timezone';
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
    case 'reception-staff':
      return 'ready';
    case 'guest-access-message':
      return 'ready';
    case 'phones-email':
      return settings.contacts?.phoneRaw?.trim() ? 'ready' : 'preview';
    case 'stay-policy':
      return isTenantFieldMissing('checkInTime', readinessInput) ||
        isTenantFieldMissing('propertyTimeZone', readinessInput)
        ? 'preview'
        : 'ready';
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
