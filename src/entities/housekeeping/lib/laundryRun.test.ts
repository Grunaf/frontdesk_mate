import { describe, expect, it } from 'vitest';

import {
  computeLaundryEndsAt,
  formatLaundryCountdown,
  indexActiveLaundryRunsByMachine,
  isHousekeepingLaundryProgram,
  isHousekeepingLaundryRunStatus,
  isLaundryUnloadDue,
  normalizeLaundryDurationMinutes,
  resolveLaundryRemainingMs,
  resolveLaundryWashUiPhase,
} from './laundryRun';

describe('isHousekeepingLaundryRunStatus / program', () => {
  it('accepts lifecycle statuses', () => {
    expect(isHousekeepingLaundryRunStatus('running')).toBe(true);
    expect(isHousekeepingLaundryRunStatus('done')).toBe(true);
    expect(isHousekeepingLaundryRunStatus('cancelled')).toBe(true);
    expect(isHousekeepingLaundryRunStatus('idle')).toBe(false);
  });

  it('accepts wash and spin_drain only', () => {
    expect(isHousekeepingLaundryProgram('wash')).toBe(true);
    expect(isHousekeepingLaundryProgram('spin_drain')).toBe(true);
    expect(isHousekeepingLaundryProgram('spin')).toBe(false);
    expect(isHousekeepingLaundryProgram('drain')).toBe(false);
  });
});

describe('laundry ends_at math', () => {
  it('computes ends_at from started_at + duration', () => {
    const startedAt = new Date('2026-07-23T10:00:00.000Z');
    expect(computeLaundryEndsAt(startedAt, 45).toISOString()).toBe(
      '2026-07-23T10:45:00.000Z'
    );
    expect(computeLaundryEndsAt(startedAt, 15).toISOString()).toBe(
      '2026-07-23T10:15:00.000Z'
    );
  });

  it('clamps remaining ms at zero after ends_at', () => {
    const endsAt = '2026-07-23T10:45:00.000Z';
    expect(resolveLaundryRemainingMs(endsAt, '2026-07-23T10:40:00.000Z')).toBe(5 * 60_000);
    expect(resolveLaundryRemainingMs(endsAt, '2026-07-23T10:45:00.000Z')).toBe(0);
    expect(normalizeLaundryDurationMinutes(0, 45)).toBe(45);
  });
});

describe('formatLaundryCountdown', () => {
  it('formats Mm:ss', () => {
    expect(formatLaundryCountdown(45 * 60_000)).toBe('45:00');
    expect(formatLaundryCountdown(90_000)).toBe('1:30');
    expect(formatLaundryCountdown(0)).toBe('0:00');
  });
});

describe('laundry wash UI phase', () => {
  it('idle / running / unload', () => {
    expect(resolveLaundryWashUiPhase(null)).toBe('idle');
    expect(
      resolveLaundryWashUiPhase(
        { status: 'running', ends_at: '2026-07-23T10:45:00.000Z' },
        '2026-07-23T10:20:00.000Z'
      )
    ).toBe('running');
    expect(
      resolveLaundryWashUiPhase(
        { status: 'running', ends_at: '2026-07-23T10:45:00.000Z' },
        '2026-07-23T10:45:00.000Z'
      )
    ).toBe('unload');
    expect(isLaundryUnloadDue('2026-07-23T10:45:00.000Z', '2026-07-23T10:45:00.000Z')).toBe(
      true
    );
  });
});

describe('indexActiveLaundryRunsByMachine (unique running constraint behavior)', () => {
  it('indexes one running run per machine; ignores terminal', () => {
    const map = indexActiveLaundryRunsByMachine([
      {
        id: 'r1',
        machine_id: 'w1',
        status: 'running',
        ends_at: '2026-07-23T10:45:00.000Z',
        program: 'wash',
      },
      {
        id: 'r2',
        machine_id: 'w2',
        status: 'running',
        ends_at: '2026-07-23T10:15:00.000Z',
        program: 'spin_drain',
      },
      {
        id: 'r3',
        machine_id: 'w1',
        status: 'done',
        ends_at: '2026-07-23T09:00:00.000Z',
        program: 'wash',
      },
    ]);
    expect(Object.keys(map)).toEqual(['w1', 'w2']);
    expect(map.w1.id).toBe('r1');
    expect(map.w2.program).toBe('spin_drain');
  });
});
