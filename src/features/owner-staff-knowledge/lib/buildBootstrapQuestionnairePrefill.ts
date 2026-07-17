import { getHouseRules } from '@/entities/house-rules';
import type { TenantSettings } from '@/entities/tenant/model/settings';

import type {
  BootstrapCleaningDepth,
  BootstrapCleaningOwner,
  BootstrapGuestPayments,
  BootstrapKeysAccess,
  BootstrapLaundryOps,
  BootstrapNightCoverage,
  BootstrapOtherNoteField,
  BootstrapOtherNotes,
  BootstrapPrefillFlags,
  BootstrapQuestionnaire,
  StaffKnowledgeLaborModel,
} from '../model/types';
import {
  createEmptyBootstrapQuestionnaire,
  createEmptyOtherNotes,
} from '../model/types';
import { deriveGuestStaySize } from './deriveGuestStaySize';

function hasLaundrySignal(settings: TenantSettings): boolean {
  if (settings.laundryCost?.trim()) return true;
  const extras = settings.guestExtras ?? [];
  return extras.some((extra) => extra.presetId === 'laundry' && extra.enabled !== false);
}

function resolveQuietHours(settings: TenantSettings): string {
  const rule = getHouseRules(settings).find(
    (item) => item.templateId === 'quietHours' && item.enabled
  );
  if (!rule || rule.templateId !== 'quietHours') return '';
  const from = rule.params?.from?.trim() ?? '';
  const to = rule.params?.to?.trim() ?? '';
  if (!from && !to) return '';
  return `${from || '?'}–${to || '?'}`;
}

function isLaborModel(value: unknown): value is StaffKnowledgeLaborModel {
  return value === 'paid' || value === 'volunteers' || value === 'mix';
}

function isYesNoOther(value: unknown): value is 'yes' | 'no' | 'other' {
  return value === 'yes' || value === 'no' || value === 'other';
}

/** Legacy `unknown` → `other` (empty note until owner clarifies). */
function migrateChipValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  if (value === 'unknown') return 'other' as T;
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

function readStoredOtherNotes(
  stored: TenantSettings['staffKnowledgeIntake'] | undefined
): BootstrapOtherNotes {
  const raw = stored?.otherNotes;
  if (!raw || typeof raw !== 'object') {
    return createEmptyOtherNotes();
  }
  return createEmptyOtherNotes({
    laundry: typeof raw.laundry === 'string' ? raw.laundry : '',
    nightCoverage: typeof raw.nightCoverage === 'string' ? raw.nightCoverage : '',
    cleaningOwner: typeof raw.cleaningOwner === 'string' ? raw.cleaningOwner : '',
    cleaningDepth: typeof raw.cleaningDepth === 'string' ? raw.cleaningDepth : '',
    laundryOps: typeof raw.laundryOps === 'string' ? raw.laundryOps : '',
    guestPayments: typeof raw.guestPayments === 'string' ? raw.guestPayments : '',
    keysAccess: typeof raw.keysAccess === 'string' ? raw.keysAccess : '',
  });
}

const NIGHT: readonly BootstrapNightCoverage[] = [
  'staff',
  'volunteer',
  'on_call_owner',
  'closed',
  'other',
];
const CLEANING_OWNER: readonly BootstrapCleaningOwner[] = [
  'staff',
  'volunteers',
  'outsource',
  'mixed',
  'other',
];
const CLEANING_DEPTH: readonly BootstrapCleaningDepth[] = [
  'owner',
  'staff',
  'volunteers',
  'outsource',
  'other',
];
const LAUNDRY_OPS: readonly BootstrapLaundryOps[] = [
  'staff',
  'volunteers',
  'outsource',
  'mixed',
  'other',
];
const PAYMENTS: readonly BootstrapGuestPayments[] = [
  'paid_staff',
  'owner',
  'none',
  'other',
];
const KEYS: readonly BootstrapKeysAccess[] = [
  'paid_staff',
  'owner',
  'volunteer',
  'self_service',
  'other',
];

export type BootstrapQuestionnairePrefill = {
  questionnaire: BootstrapQuestionnaire;
  fromSettings: BootstrapPrefillFlags;
};

/** Map tenant settings + room map (+ persisted intake) into questionnaire defaults. */
export function buildBootstrapQuestionnairePrefill(
  settings: TenantSettings | undefined | null
): BootstrapQuestionnairePrefill {
  const safe = settings ?? {};
  const size = deriveGuestStaySize(safe.guestStay);
  const stored = safe.staffKnowledgeIntake;
  const laundryFromSettings = hasLaundrySignal(safe)
    ? ('yes' as const)
      : stored?.laundry === 'unknown'
      ? ('other' as const)
      : stored?.laundry && isYesNoOther(stored.laundry)
        ? stored.laundry
        : ('no' as const);
  const quietHoursFromRules = resolveQuietHours(safe);
  const quietHours =
    quietHoursFromRules || (stored?.quietHours?.trim() ?? '');

  const roomCount =
    size.source === 'guestStay'
      ? size.roomCount
      : stored?.roomCountOverride != null
        ? stored.roomCountOverride
        : null;
  const bedCount =
    size.source === 'guestStay'
      ? size.bedCount
      : stored?.bedCountOverride != null
        ? stored.bedCountOverride
        : null;

  const questionnaire = createEmptyBootstrapQuestionnaire({
    checkInTime: safe.checkInTime?.trim() ?? '',
    checkOutTime: safe.checkOutTime?.trim() ?? '',
    receptionOpen: safe.reception?.open?.trim() ?? '',
    receptionClose: safe.reception?.close?.trim() ?? '',
    receptionHint: safe.reception?.availabilityHint?.trim() ?? '',
    roomCount,
    bedCount,
    floorCount: size.source === 'guestStay' ? size.floorCount : null,
    sizeSource: size.source,
    laundry: laundryFromSettings,
    quietHours,
    propertyTimeZone: safe.propertyTimeZone?.trim() ?? '',
    laborModel: isLaborModel(stored?.laborModel) ? stored.laborModel : 'paid',
    nightCoverage: migrateChipValue(stored?.nightCoverage, NIGHT, 'on_call_owner'),
    cleaningOwner: migrateChipValue(stored?.cleaningOwner, CLEANING_OWNER, 'staff'),
    cleaningDepth: migrateChipValue(stored?.cleaningDepth, CLEANING_DEPTH, 'owner'),
    laundryOps: migrateChipValue(stored?.laundryOps, LAUNDRY_OPS, 'staff'),
    guestPayments: migrateChipValue(stored?.guestPayments, PAYMENTS, 'owner'),
    keysAccess: migrateChipValue(stored?.keysAccess, KEYS, 'owner'),
    peakDays: stored?.peakDays?.trim() ?? '',
    specialConstraints: stored?.specialConstraints?.trim() ?? '',
    otherNotes: readStoredOtherNotes(stored),
  });

  const fromSettings: BootstrapPrefillFlags = {
    checkInTime: Boolean(safe.checkInTime?.trim()),
    checkOutTime: Boolean(safe.checkOutTime?.trim()),
    receptionOpen: Boolean(safe.reception?.open?.trim()),
    receptionClose: Boolean(safe.reception?.close?.trim()),
    receptionHint: Boolean(safe.reception?.availabilityHint?.trim()),
    roomMap: size.source === 'guestStay',
    laundry: hasLaundrySignal(safe),
    quietHours: Boolean(quietHoursFromRules),
  };

  return { questionnaire, fromSettings };
}

/** True when critical host settings are empty — show readiness warning before AI. */
export function isBootstrapCriticalPrefillEmpty(
  questionnaire: BootstrapQuestionnaire
): boolean {
  const noCheckIn = !questionnaire.checkInTime.trim();
  const noReception =
    !questionnaire.receptionOpen.trim() && !questionnaire.receptionClose.trim();
  const noRoomMap =
    questionnaire.sizeSource === 'empty' &&
    questionnaire.roomCount == null &&
    questionnaire.bedCount == null;
  return noCheckIn && noReception && noRoomMap;
}

/** Fields set to `other` must include a non-empty note. */
export function findMissingOtherNotes(
  questionnaire: BootstrapQuestionnaire
): BootstrapOtherNoteField[] {
  const checks: Array<{
    selected: boolean;
    field: keyof BootstrapOtherNotes;
  }> = [
    { selected: questionnaire.laundry === 'other', field: 'laundry' },
    { selected: questionnaire.nightCoverage === 'other', field: 'nightCoverage' },
    { selected: questionnaire.cleaningOwner === 'other', field: 'cleaningOwner' },
    { selected: questionnaire.cleaningDepth === 'other', field: 'cleaningDepth' },
    {
      selected: questionnaire.laundry === 'yes' && questionnaire.laundryOps === 'other',
      field: 'laundryOps',
    },
    { selected: questionnaire.guestPayments === 'other', field: 'guestPayments' },
    { selected: questionnaire.keysAccess === 'other', field: 'keysAccess' },
  ];

  return checks
    .filter(
      (item) => item.selected && !questionnaire.otherNotes[item.field].trim()
    )
    .map((item) => item.field);
}
