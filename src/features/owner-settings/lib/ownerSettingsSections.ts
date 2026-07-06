import {
  ADMIN_SECTION_IDS,
  ADMIN_SECTIONS,
  type AdminSectionId,
} from '@/app/admin/(protected)/tenants/lib/adminSections';

export const OWNER_SETTINGS_SECTION_IDS = ADMIN_SECTION_IDS.filter(
  (id): id is Exclude<AdminSectionId, 'subscription'> => id !== 'subscription'
);

export type OwnerSettingsSectionId = (typeof OWNER_SETTINGS_SECTION_IDS)[number];

export function getOwnerSettingsSections() {
  return ADMIN_SECTIONS.filter((section) => section.id !== 'subscription');
}

export function ownerSettingsSectionPath(locale: string, sectionId: OwnerSettingsSectionId): string {
  return `/${locale}/settings/${sectionId}`;
}

export function ownerSettingsDefaultPath(locale: string): string {
  return ownerSettingsSectionPath(locale, 'identity');
}

export function normalizeOwnerSettingsSectionId(
  sectionId: string | null | undefined
): OwnerSettingsSectionId | null {
  const normalized = sectionId === 'arrival' ? 'arrival-journey' : sectionId;
  if (!normalized || normalized === 'subscription') {
    return null;
  }
  return OWNER_SETTINGS_SECTION_IDS.includes(normalized as OwnerSettingsSectionId)
    ? (normalized as OwnerSettingsSectionId)
    : null;
}
