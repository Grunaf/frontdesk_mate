import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LAUNDRY_PROGRAM_MINUTES,
  LAUNDRY_DURATION_MAX_MINUTES,
  LAUNDRY_DURATION_MIN_MINUTES,
} from '../model/laundry';
import {
  clampLaundryDurationMinutes,
  coerceLaundryMachinesForAdminEdit,
  createEmptyLaundryMachine,
  finalizeLaundrySettingsForSave,
  isLaundryProgram,
  listLaundryMachines,
  normalizeLaundryMachines,
  normalizeLaundrySettings,
  resolveLaundryMachineById,
  resolveLaundryProgramDurationMinutes,
} from './normalizeLaundrySettings';

describe('isLaundryProgram', () => {
  it('accepts wash and spin_drain only', () => {
    expect(isLaundryProgram('wash')).toBe(true);
    expect(isLaundryProgram('spin_drain')).toBe(true);
    expect(isLaundryProgram('spin')).toBe(false);
    expect(isLaundryProgram('drain')).toBe(false);
    expect(isLaundryProgram('')).toBe(false);
  });
});

describe('normalizeLaundrySettings', () => {
  it('applies program defaults and clamps duration', () => {
    const machines = normalizeLaundryMachines([
      {
        id: ' w1 ',
        label: ' Washer 1 ',
        programs: { wash: 0, spin_drain: 999 },
      },
      { id: 'w1', label: 'dup', programs: { wash: 30, spin_drain: 10 } },
      { id: '', label: 'bad' },
      { id: 'w2', label: '' },
    ]);

    expect(machines).toHaveLength(1);
    expect(machines[0]).toEqual({
      id: 'w1',
      label: 'Washer 1',
      sortOrder: 0,
      programs: {
        wash: LAUNDRY_DURATION_MIN_MINUTES,
        spin_drain: LAUNDRY_DURATION_MAX_MINUTES,
      },
    });
  });

  it('sorts by sortOrder and fills missing programs from defaults', () => {
    const settings = normalizeLaundrySettings({
      machines: [
        { id: 'b', label: 'B', sortOrder: 2, programs: {} },
        { id: 'a', label: 'A', sortOrder: 1 },
      ],
    });
    expect(settings.machines.map((m) => m.id)).toEqual(['a', 'b']);
    expect(settings.machines[0].programs).toEqual({ ...DEFAULT_LAUNDRY_PROGRAM_MINUTES });
  });

  it('keeps empty-label rows for admin edit', () => {
    const draft = coerceLaundryMachinesForAdminEdit([
      { id: 'w1', label: '', programs: { wash: 40, spin_drain: 12 } },
    ]);
    expect(draft).toEqual([
      {
        id: 'w1',
        label: '',
        sortOrder: 0,
        programs: { wash: 40, spin_drain: 12 },
      },
    ]);
  });

  it('finalize drops incomplete machines and empty laundry', () => {
    expect(
      finalizeLaundrySettingsForSave({
        laundry: {
          machines: [{ id: 'w1', label: '', programs: { wash: 45, spin_drain: 15 } }],
        },
      }).laundry
    ).toBeUndefined();

    const saved = finalizeLaundrySettingsForSave({
      laundry: {
        machines: [
          { id: 'w1', label: 'Washer 1', programs: { wash: 45, spin_drain: 15 } },
        ],
      },
    });
    expect(saved.laundry?.machines).toHaveLength(1);
  });
});

describe('resolveLaundryMachineById / duration', () => {
  const settings = {
    laundry: {
      machines: [
        {
          id: 'w1',
          label: 'Washer 1',
          programs: { wash: 50, spin_drain: 12 },
        },
      ],
    },
  };

  it('resolves machine and program minutes', () => {
    const machine = resolveLaundryMachineById(settings, 'w1');
    expect(machine?.label).toBe('Washer 1');
    expect(resolveLaundryProgramDurationMinutes(machine!, 'wash')).toBe(50);
    expect(resolveLaundryProgramDurationMinutes(machine!, 'spin_drain')).toBe(12);
    expect(listLaundryMachines(settings)).toHaveLength(1);
  });

  it('clamps out-of-range values', () => {
    expect(clampLaundryDurationMinutes(0, 45)).toBe(LAUNDRY_DURATION_MIN_MINUTES);
    expect(clampLaundryDurationMinutes(500, 45)).toBe(LAUNDRY_DURATION_MAX_MINUTES);
  });
});

describe('createEmptyLaundryMachine', () => {
  it('allocates unique washer ids', () => {
    const first = createEmptyLaundryMachine(0, new Set());
    expect(first.id).toBe('washer-1');
    expect(first.programs).toEqual({ ...DEFAULT_LAUNDRY_PROGRAM_MINUTES });
    const second = createEmptyLaundryMachine(1, new Set(['washer-1', 'washer-2']));
    expect(second.id).toBe('washer-3');
  });
});
