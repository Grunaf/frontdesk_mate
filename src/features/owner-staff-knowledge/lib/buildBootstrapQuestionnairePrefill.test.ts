import { describe, expect, it } from 'vitest';

import {
  buildBootstrapQuestionnairePrefill,
  isBootstrapCriticalPrefillEmpty,
} from './buildBootstrapQuestionnairePrefill';
import { deriveGuestStaySize } from './deriveGuestStaySize';
import { applyQuestionnaireToTenantSettings } from './applyQuestionnaireToTenantSettings';
import { createEmptyBootstrapQuestionnaire, createEmptyOtherNotes } from '../model/types';

describe('deriveGuestStaySize', () => {
  it('returns empty when no rooms/beds', () => {
    expect(deriveGuestStaySize({ rooms: [], beds: [] })).toEqual({
      roomCount: 0,
      bedCount: 0,
      floorCount: 0,
      source: 'empty',
    });
  });

  it('counts rooms and beds from guestStay', () => {
    expect(
      deriveGuestStaySize({
        floors: [{ id: 'f1' }],
        rooms: [
          { id: 'r1', label: 'A', floorId: 'f1' },
          { id: 'r2', label: 'B', floorId: 'f1' },
        ],
        beds: [
          { id: 'b1', roomId: 'r1' },
          { id: 'b2', roomId: 'r1' },
          { id: 'b3', roomId: 'r2' },
        ],
      })
    ).toEqual({
      roomCount: 2,
      bedCount: 3,
      floorCount: 1,
      source: 'guestStay',
    });
  });
});

describe('buildBootstrapQuestionnairePrefill', () => {
  it('prefills times, reception, laundry and room map', () => {
    const { questionnaire, fromSettings } = buildBootstrapQuestionnairePrefill({
      checkInTime: '14:00',
      checkOutTime: '11:00',
      laundryCost: '5€',
      reception: { open: '09:00', close: '21:00', availabilityHint: 'Knock twice' },
      guestStay: {
        rooms: [{ id: 'r1', label: 'A', floorId: 'f1' }],
        beds: [{ id: 'b1', roomId: 'r1' }],
      },
      houseRules: [
        {
          id: 'quiet-hours',
          templateId: 'quietHours',
          enabled: true,
          params: { from: '22:00', to: '08:00' },
        },
      ],
      staffKnowledgeIntake: {
        laborModel: 'volunteers',
        nightCoverage: 'volunteer',
      },
    });

    expect(questionnaire.checkInTime).toBe('14:00');
    expect(questionnaire.receptionOpen).toBe('09:00');
    expect(questionnaire.laundry).toBe('yes');
    expect(questionnaire.roomCount).toBe(1);
    expect(questionnaire.bedCount).toBe(1);
    expect(questionnaire.sizeSource).toBe('guestStay');
    expect(questionnaire.quietHours).toBe('22:00–08:00');
    expect(questionnaire.laborModel).toBe('volunteers');
    expect(questionnaire.nightCoverage).toBe('volunteer');
    expect(fromSettings.checkInTime).toBe(true);
    expect(fromSettings.roomMap).toBe(true);
    expect(fromSettings.laundry).toBe(true);
  });

  it('migrates legacy unknown chip values to other', () => {
    const { questionnaire } = buildBootstrapQuestionnairePrefill({
      staffKnowledgeIntake: {
        laundry: 'unknown',
        nightCoverage: 'unknown',
        cleaningOwner: 'unknown',
        otherNotes: { nightCoverage: 'security camera only' },
      },
    });

    expect(questionnaire.laundry).toBe('other');
    expect(questionnaire.nightCoverage).toBe('other');
    expect(questionnaire.cleaningOwner).toBe('other');
    expect(questionnaire.otherNotes.nightCoverage).toBe('security camera only');
  });

  it('detects critical empty prefill', () => {
    expect(
      isBootstrapCriticalPrefillEmpty(createEmptyBootstrapQuestionnaire())
    ).toBe(true);
    expect(
      isBootstrapCriticalPrefillEmpty(
        createEmptyBootstrapQuestionnaire({ checkInTime: '14:00' })
      )
    ).toBe(false);
  });
});

describe('applyQuestionnaireToTenantSettings', () => {
  it('writes ops fields and staffKnowledgeIntake', () => {
    const next = applyQuestionnaireToTenantSettings(
      { checkInTime: '12:00' },
      createEmptyBootstrapQuestionnaire({
        checkInTime: '15:00',
        checkOutTime: '10:00',
        receptionOpen: '08:00',
        receptionClose: '22:00',
        laborModel: 'mix',
        nightCoverage: 'other',
        peakDays: 'weekends',
        otherNotes: createEmptyOtherNotes({ nightCoverage: 'remote alarms' }),
      })
    );

    expect(next.checkInTime).toBe('15:00');
    expect(next.checkOutTime).toBe('10:00');
    expect(next.reception?.open).toBe('08:00');
    expect(next.reception?.close).toBe('22:00');
    expect(next.staffKnowledgeIntake?.laborModel).toBe('mix');
    expect(next.staffKnowledgeIntake?.nightCoverage).toBe('other');
    expect(next.staffKnowledgeIntake?.peakDays).toBe('weekends');
    expect(next.staffKnowledgeIntake?.otherNotes?.nightCoverage).toBe('remote alarms');
  });
});
