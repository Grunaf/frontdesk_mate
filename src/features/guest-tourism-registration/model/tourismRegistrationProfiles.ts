export type TourismDocumentKind = 'passport' | 'entry_stamp';

export interface TourismRegistrationProfile {
  profileId: string;
  countryNameKey: string;
  requiredDocumentKinds: TourismDocumentKind[];
}

const PROFILES: Record<string, TourismRegistrationProfile> = {
  me: {
    profileId: 'me',
    countryNameKey: 'Montenegro',
    requiredDocumentKinds: ['passport', 'entry_stamp'],
  },
};

export const TOURISM_PROFILE_IDS = Object.keys(PROFILES) as string[];

export function getTourismRegistrationProfile(
  profileId: string
): TourismRegistrationProfile | undefined {
  return PROFILES[profileId];
}

export const DEFAULT_TOURISM_PROFILE_ID = 'me';

export const DOCUMENT_KIND_FORM_KEY: Record<TourismDocumentKind, string> = {
  passport: 'passport',
  entry_stamp: 'entryStamp',
};

export const DOCUMENT_KIND_TO_STORAGE_KEY: Record<TourismDocumentKind, string> = {
  passport: 'passport',
  entry_stamp: 'entry-stamp',
};

export const DOCUMENT_KIND_TO_DB_COLUMN: Record<TourismDocumentKind, string> = {
  passport: 'passport_storage_path',
  entry_stamp: 'entry_stamp_storage_path',
};
