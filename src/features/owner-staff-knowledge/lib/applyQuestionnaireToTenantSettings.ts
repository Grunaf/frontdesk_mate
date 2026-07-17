import type { TenantSettings } from '@/entities/tenant/model/settings';

import type { BootstrapQuestionnaire } from '../model/types';

/** Merge questionnaire answers into tenant settings (ops fields + staffKnowledgeIntake). */
export function applyQuestionnaireToTenantSettings(
  previous: TenantSettings,
  questionnaire: BootstrapQuestionnaire
): TenantSettings {
  const checkInTime = questionnaire.checkInTime.trim() || undefined;
  const checkOutTime = questionnaire.checkOutTime.trim() || undefined;
  const receptionOpen = questionnaire.receptionOpen.trim() || undefined;
  const receptionClose = questionnaire.receptionClose.trim() || undefined;
  const receptionHint = questionnaire.receptionHint.trim() || undefined;

  const nextReception = {
    ...(previous.reception ?? {}),
    ...(receptionOpen !== undefined ? { open: receptionOpen } : { open: undefined }),
    ...(receptionClose !== undefined ? { close: receptionClose } : { close: undefined }),
    ...(receptionHint !== undefined
      ? { availabilityHint: receptionHint }
      : { availabilityHint: undefined }),
  };

  // Drop undefined reception keys we explicitly cleared while keeping other reception fields.
  const cleanedReception = Object.fromEntries(
    Object.entries(nextReception).filter(([, value]) => value !== undefined && value !== '')
  ) as NonNullable<TenantSettings['reception']>;

  const roomOverride =
    questionnaire.sizeSource === 'empty' ? questionnaire.roomCount : null;
  const bedOverride =
    questionnaire.sizeSource === 'empty' ? questionnaire.bedCount : null;

  const otherNotes = {
    laundry: questionnaire.otherNotes.laundry.trim() || undefined,
    nightCoverage: questionnaire.otherNotes.nightCoverage.trim() || undefined,
    cleaningOwner: questionnaire.otherNotes.cleaningOwner.trim() || undefined,
    cleaningDepth: questionnaire.otherNotes.cleaningDepth.trim() || undefined,
    laundryOps: questionnaire.otherNotes.laundryOps.trim() || undefined,
    guestPayments: questionnaire.otherNotes.guestPayments.trim() || undefined,
    keysAccess: questionnaire.otherNotes.keysAccess.trim() || undefined,
  };
  const hasOtherNotes = Object.values(otherNotes).some(Boolean);

  return {
    ...previous,
    checkInTime,
    checkOutTime,
    reception: Object.keys(cleanedReception).length > 0 ? cleanedReception : undefined,
    staffKnowledgeIntake: {
      laborModel: questionnaire.laborModel,
      nightCoverage: questionnaire.nightCoverage,
      cleaningOwner: questionnaire.cleaningOwner,
      cleaningDepth: questionnaire.cleaningDepth,
      laundry: questionnaire.laundry,
      laundryOps: questionnaire.laundryOps,
      guestPayments: questionnaire.guestPayments,
      keysAccess: questionnaire.keysAccess,
      peakDays: questionnaire.peakDays.trim() || undefined,
      specialConstraints: questionnaire.specialConstraints.trim() || undefined,
      quietHours: questionnaire.quietHours.trim() || undefined,
      roomCountOverride: roomOverride,
      bedCountOverride: bedOverride,
      ...(hasOtherNotes ? { otherNotes } : {}),
    },
  };
}
