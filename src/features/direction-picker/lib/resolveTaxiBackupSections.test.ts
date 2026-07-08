import { describe, expect, it } from 'vitest';
import {
  isCallAheadTaxiTip,
  isDuplicateTaxiCopyLine,
  mergePackTaxiDealWarnings,
  resolveTaxiBackupSections,
} from './resolveTaxiBackupSections';

describe('isDuplicateTaxiCopyLine', () => {
  it('treats subset containment as duplicate', () => {
    expect(
      isDuplicateTaxiCopyLine(
        'Tivat Airport (TIV) — arrivals taxi desk',
        'arrivals taxi desk'
      )
    ).toBe(true);
  });

  it('treats high word overlap as duplicate', () => {
    expect(
      isDuplicateTaxiCopyLine(
        'Use the official taxi desk in arrivals',
        'Official taxi desk in the arrivals hall'
      )
    ).toBe(true);
  });
});

describe('mergePackTaxiDealWarnings', () => {
  it('keeps distinct stand and meter paragraphs', () => {
    const lines = mergePackTaxiDealWarnings(
      'Take taxis only from official stands.',
      'Insist the driver starts the meter at the base fare.'
    );
    expect(lines).toHaveLength(2);
  });

  it('drops a meter line that repeats the stand warning', () => {
    const duplicate = 'Use only the official taxi desk in arrivals.';
    const lines = mergePackTaxiDealWarnings(duplicate, duplicate);
    expect(lines).toEqual([duplicate]);
  });
});

describe('resolveTaxiBackupSections', () => {
  it('places pickup in zone A and skips tip[0] when it repeats pickup', () => {
    const pickup = 'Tivat Airport (TIV) — arrivals taxi desk';
    const sections = resolveTaxiBackupSections({
      pickupPoint: pickup,
      taxiTips: [pickup, 'Agree fixed fare or confirm the meter before you leave.'],
      packDealWarnings: [],
    });

    expect(sections.atHub?.lines).toEqual([pickup]);
    expect(sections.beforeRide?.lines).toEqual([
      'Agree fixed fare or confirm the meter before you leave.',
    ]);
  });

  it('merges hub deal tip with pack warnings without repeating meter advice', () => {
    const dealTip = 'Confirm the meter is running before you leave.';
    const meterWarning =
      'Agree a fixed fare before you leave, or confirm the meter is running.';
    const sections = resolveTaxiBackupSections({
      pickupPoint: 'Arrivals taxi desk',
      taxiTips: ['Queue at the desk inside arrivals', dealTip],
      packDealWarnings: mergePackTaxiDealWarnings('', meterWarning),
    });

    expect(sections.atHub?.lines).toEqual(['Arrivals taxi desk']);
    expect(sections.beforeRide?.lines).toEqual([dealTip]);
  });

  it('omits call-ahead content from tips zones', () => {
    const sections = resolveTaxiBackupSections({
      pickupPoint: 'Bus station curb',
      taxiTips: ['Call Red Taxi from the stand', 'Insist on the meter'],
      packDealWarnings: [],
    });

    expect(sections.atHub?.lines).toEqual(['Bus station curb']);
    expect(sections.beforeRide?.lines).toEqual(['Insist on the meter']);
  });

  it('returns null sections when there is nothing to show', () => {
    const sections = resolveTaxiBackupSections({
      pickupPoint: '',
      taxiTips: [],
      packDealWarnings: [],
    });
    expect(sections.atHub).toBeNull();
    expect(sections.beforeRide).toBeNull();
  });
});

describe('isCallAheadTaxiTip', () => {
  it('flags phone and call wording', () => {
    expect(isCallAheadTaxiTip('Call the official taxi line from the desk')).toBe(true);
    expect(isCallAheadTaxiTip('Use the meter')).toBe(false);
  });
});
