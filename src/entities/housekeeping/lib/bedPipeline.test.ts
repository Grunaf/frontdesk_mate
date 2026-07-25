import { describe, expect, it } from 'vitest';

import {
  isHousekeepingBedNeedsWork,
  resolveHousekeepingBedPrimaryAction,
  resolveRoomBedBatchAction,
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

describe('resolveRoomBedBatchAction', () => {
  it('returns Strip all for unset and needs_strip beds', () => {
    expect(
      resolveRoomBedBatchAction([
        { bedId: 'a', status: undefined },
        { bedId: 'b', status: 'needs_strip' },
        { bedId: 'c', status: 'ready' },
      ])
    ).toEqual({
      label: 'Strip all',
      nextStatus: 'stripped',
      bedIds: ['a', 'b'],
    });
  });

  it('returns Make all when only stripped beds remain', () => {
    expect(
      resolveRoomBedBatchAction([
        { bedId: 'a', status: 'stripped' },
        { bedId: 'b', status: 'stripped' },
        { bedId: 'c', status: 'ready' },
      ])
    ).toEqual({
      label: 'Make all',
      nextStatus: 'ready',
      bedIds: ['a', 'b'],
    });
  });

  it('prioritizes Strip over Make when both eligible', () => {
    expect(
      resolveRoomBedBatchAction([
        { bedId: 'a', status: 'needs_strip' },
        { bedId: 'b', status: 'stripped' },
      ])
    ).toEqual({
      label: 'Strip all',
      nextStatus: 'stripped',
      bedIds: ['a'],
    });
  });

  it('returns null when nothing to batch', () => {
    expect(resolveRoomBedBatchAction([])).toBeNull();
    expect(
      resolveRoomBedBatchAction([
        { bedId: 'a', status: 'ready' },
        { bedId: 'b', status: 'ready' },
      ])
    ).toBeNull();
  });
});
