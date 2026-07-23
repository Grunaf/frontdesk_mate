import { describe, expect, it } from 'vitest';

import {
  isHousekeepingBedNeedsWork,
  resolveHousekeepingBedPrimaryAction,
} from './bedPipeline';

describe('bedPipeline', () => {
  it('maps unset and needs_strip to Strip → stripped', () => {
    expect(resolveHousekeepingBedPrimaryAction(undefined)).toEqual({
      label: 'Strip',
      nextStatus: 'stripped',
    });
    expect(resolveHousekeepingBedPrimaryAction('needs_strip')).toEqual({
      label: 'Strip',
      nextStatus: 'stripped',
    });
  });

  it('maps stripped to Make → ready', () => {
    expect(resolveHousekeepingBedPrimaryAction('stripped')).toEqual({
      label: 'Make',
      nextStatus: 'ready',
    });
  });

  it('has no primary action for ready', () => {
    expect(resolveHousekeepingBedPrimaryAction('ready')).toBeNull();
  });

  it('treats unset/needs_strip/stripped as needing work', () => {
    expect(isHousekeepingBedNeedsWork(undefined)).toBe(true);
    expect(isHousekeepingBedNeedsWork('needs_strip')).toBe(true);
    expect(isHousekeepingBedNeedsWork('stripped')).toBe(true);
    expect(isHousekeepingBedNeedsWork('ready')).toBe(false);
  });
});
