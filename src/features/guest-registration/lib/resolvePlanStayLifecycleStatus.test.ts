import { describe, expect, it } from 'vitest';
import { makeGuestStayRecordFixture } from '@/entities/guest-stay/testing/makeGuestStayRecordFixture';
import {
  planStayLifecycleStatusLabel,
  resolvePlanStayLifecycleStatus,
} from './resolvePlanStayLifecycleStatus';

/** Stay nights: 22–25 → occupied 22, 23, 24; last night 24; checkout exclusive 25. */
function stay(overrides: Parameters<typeof makeGuestStayRecordFixture>[0] = {}) {
  return makeGuestStayRecordFixture({
    check_in_at: '2026-06-22T14:00:00.000Z',
    check_out_at: '2026-06-25T23:59:59.999Z',
    check_in_date: '2026-06-22',
    check_out_date: '2026-06-25',
    ...overrides,
  });
}

describe('resolvePlanStayLifecycleStatus', () => {
  it('returns null when nightDate is not today (today-only badges)', () => {
    expect(
      resolvePlanStayLifecycleStatus({
        stay: stay({ passport_checked_at: '2026-06-22T15:00:00.000Z' }),
        today: '2026-06-23',
        nightDate: '2026-06-22',
      })
    ).toBeNull();
  });

  it('returns null for free/no coverage (today outside stay nights)', () => {
    expect(
      resolvePlanStayLifecycleStatus({
        stay: stay(),
        today: '2026-06-21',
        nightDate: '2026-06-21',
      })
    ).toBeNull();
    expect(
      resolvePlanStayLifecycleStatus({
        stay: stay(),
        today: '2026-06-25',
        nightDate: '2026-06-25',
      })
    ).toBeNull();
  });

  it('returns null when stay is revoked', () => {
    expect(
      resolvePlanStayLifecycleStatus({
        stay: stay({ revoked_at: '2026-06-22T16:00:00.000Z' }),
        today: '2026-06-22',
        nightDate: '2026-06-22',
      })
    ).toBeNull();
  });

  it('arrival: not admitted on check-in day', () => {
    expect(
      resolvePlanStayLifecycleStatus({
        stay: stay(),
        today: '2026-06-22',
        nightDate: '2026-06-22',
      })
    ).toBe('arrival');
  });

  it('late: not admitted after check-in day while stay still open', () => {
    expect(
      resolvePlanStayLifecycleStatus({
        stay: stay(),
        today: '2026-06-23',
        nightDate: '2026-06-23',
      })
    ).toBe('late');
    expect(
      resolvePlanStayLifecycleStatus({
        stay: stay(),
        today: '2026-06-24',
        nightDate: '2026-06-24',
      })
    ).toBe('late');
  });

  it('checked_in: admitted on a middle night', () => {
    expect(
      resolvePlanStayLifecycleStatus({
        stay: stay({ passport_checked_at: '2026-06-22T15:00:00.000Z' }),
        today: '2026-06-23',
        nightDate: '2026-06-23',
      })
    ).toBe('checked_in');
  });

  it('leaving: admitted on last occupied night', () => {
    expect(
      resolvePlanStayLifecycleStatus({
        stay: stay({ passport_checked_at: '2026-06-22T15:00:00.000Z' }),
        today: '2026-06-24',
        nightDate: '2026-06-24',
      })
    ).toBe('leaving');
  });

  it('uses desk_checked_in_at as admit fallback', () => {
    expect(
      resolvePlanStayLifecycleStatus({
        stay: stay({ desk_checked_in_at: '2026-06-22T15:00:00.000Z' }),
        today: '2026-06-23',
        nightDate: '2026-06-23',
      })
    ).toBe('checked_in');
  });

  it('single-night stay: admitted → leaving (not checked_in)', () => {
    expect(
      resolvePlanStayLifecycleStatus({
        stay: stay({
          check_in_date: '2026-06-22',
          check_out_date: '2026-06-23',
          check_in_at: '2026-06-22T14:00:00.000Z',
          check_out_at: '2026-06-23T23:59:59.999Z',
          passport_checked_at: '2026-06-22T15:00:00.000Z',
        }),
        today: '2026-06-22',
        nightDate: '2026-06-22',
      })
    ).toBe('leaving');
  });

  it('labels are short EN chips', () => {
    expect(planStayLifecycleStatusLabel('arrival')).toBe('Arriving');
    expect(planStayLifecycleStatusLabel('checked_in')).toBe('In');
    expect(planStayLifecycleStatusLabel('leaving')).toBe('Leaving');
    expect(planStayLifecycleStatusLabel('late')).toBe('Late');
  });
});
