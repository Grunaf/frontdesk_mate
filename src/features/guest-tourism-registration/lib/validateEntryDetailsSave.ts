import {
  isEntryTransportType,
  isValidEntryStampDate,
  parseEntryStampPage,
  type EntryTransportType,
} from '@/entities/guest-tourism-registration';
import {
  findAirportInCatalog,
  getTourismEntryPointsCatalog,
} from './tourismEntryPointsCatalog';

export type EntryDetailsGuestAssignment = {
  guestId: string;
  entryStampDate: string;
  entryStampPage: number | null;
};

export type ValidatedEntryDetailsSave = {
  transportType: EntryTransportType;
  entryPointCode: string | null;
  entryPointLabel: string;
  assignments: EntryDetailsGuestAssignment[];
};

export type ValidateEntryDetailsSaveInput = {
  profileId: string;
  transportType: string;
  entryPointCode: string | null | undefined;
  entryPointLabel: string;
  assignments: Array<{
    guestId: string;
    entryStampDate: string;
    entryStampPage?: number | string | null;
  }>;
};

export type ValidateEntryDetailsSaveResult =
  | { ok: true; value: ValidatedEntryDetailsSave }
  | {
      ok: false;
      error:
        | 'invalid_transport'
        | 'invalid_entry_point'
        | 'invalid_date'
        | 'invalid_stamp_page'
        | 'no_catalog';
    };

export function validateEntryDetailsSave(
  input: ValidateEntryDetailsSaveInput
): ValidateEntryDetailsSaveResult {
  if (!isEntryTransportType(input.transportType)) {
    return { ok: false, error: 'invalid_transport' };
  }

  const catalog = getTourismEntryPointsCatalog(input.profileId);
  if (!catalog) {
    return { ok: false, error: 'no_catalog' };
  }

  const label = input.entryPointLabel.trim();
  if (!label) {
    return { ok: false, error: 'invalid_entry_point' };
  }

  let entryPointCode: string | null = null;
  let entryPointLabel = label;

  if (input.transportType === 'plane') {
    const code = (input.entryPointCode ?? '').trim().toUpperCase();
    const airport = findAirportInCatalog(catalog, code);
    if (!airport) {
      return { ok: false, error: 'invalid_entry_point' };
    }
    entryPointCode = airport.code;
    entryPointLabel = airport.label;
  } else {
    entryPointCode = null;
  }

  if (input.assignments.length === 0) {
    return { ok: false, error: 'invalid_date' };
  }

  const assignments: EntryDetailsGuestAssignment[] = [];
  for (const item of input.assignments) {
    const date = item.entryStampDate.trim();
    if (!isValidEntryStampDate(date)) {
      return { ok: false, error: 'invalid_date' };
    }

    let page: number | null = null;
    if (item.entryStampPage !== undefined && item.entryStampPage !== null && item.entryStampPage !== '') {
      page = parseEntryStampPage(item.entryStampPage);
      if (page == null) {
        return { ok: false, error: 'invalid_stamp_page' };
      }
    }

    assignments.push({
      guestId: item.guestId,
      entryStampDate: date,
      entryStampPage: page,
    });
  }

  return {
    ok: true,
    value: {
      transportType: input.transportType,
      entryPointCode,
      entryPointLabel,
      assignments,
    },
  };
}
