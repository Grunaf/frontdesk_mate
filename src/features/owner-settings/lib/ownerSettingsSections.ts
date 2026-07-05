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
