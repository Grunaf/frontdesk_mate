import type {
  TourismGuestDocumentType,
  TourismGuestGender,
} from './validateTourismGuestIdentity';

export type TourismGuestFormValues = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  countryOfBirth: string;
  placeOfBirth: string;
  gender: TourismGuestGender | '';
  citizenship: string;
  documentType: TourismGuestDocumentType;
  passportNumber: string;
};

export type TourismGuestDraft = {
  id: string;
  values: TourismGuestFormValues;
  updatedAt: string;
};

const STORAGE_PREFIX = 'tourism-guest-draft:';

function storageKey(stayId: string): string {
  return `${STORAGE_PREFIX}${stayId}`;
}

export function readTourismGuestDraft(stayId: string): TourismGuestDraft | null {
  if (typeof window === 'undefined' || !stayId.trim()) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(stayId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TourismGuestDraft;
    if (!parsed?.id || !parsed?.values) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTourismGuestDraft(stayId: string, draft: TourismGuestDraft): void {
  if (typeof window === 'undefined' || !stayId.trim()) return;
  try {
    window.sessionStorage.setItem(storageKey(stayId), JSON.stringify(draft));
  } catch {
    // Ignore quota / private mode failures — in-memory panel state still works.
  }
}

export function clearTourismGuestDraft(stayId: string): void {
  if (typeof window === 'undefined' || !stayId.trim()) return;
  try {
    window.sessionStorage.removeItem(storageKey(stayId));
  } catch {
    // ignore
  }
}

/** True when the user has started filling beyond empty defaults. */
export function isTourismGuestFormDirty(
  values: TourismGuestFormValues,
  defaults: Pick<TourismGuestFormValues, 'countryOfBirth' | 'citizenship' | 'documentType'>
): boolean {
  if (values.firstName.trim()) return true;
  if (values.lastName.trim()) return true;
  if (values.dateOfBirth.trim()) return true;
  if (values.placeOfBirth.trim()) return true;
  if (values.gender) return true;
  if (values.passportNumber.trim()) return true;
  if (values.countryOfBirth !== defaults.countryOfBirth) return true;
  if (values.citizenship !== defaults.citizenship) return true;
  if (values.documentType !== defaults.documentType) return true;
  return false;
}
