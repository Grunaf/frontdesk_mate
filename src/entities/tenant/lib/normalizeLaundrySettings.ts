import {
  DEFAULT_LAUNDRY_PROGRAM_MINUTES,
  LAUNDRY_DURATION_MAX_MINUTES,
  LAUNDRY_DURATION_MIN_MINUTES,
  LAUNDRY_PROGRAMS,
  type LaundryMachine,
  type LaundryMachinePrograms,
  type LaundryProgram,
  type LaundrySettings,
} from '../model/laundry';
import type { TenantSettings } from '../model/settings';

export function isLaundryProgram(value: unknown): value is LaundryProgram {
  return (
    typeof value === 'string' &&
    (LAUNDRY_PROGRAMS as readonly string[]).includes(value)
  );
}

export function clampLaundryDurationMinutes(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.round(value);
  if (rounded < LAUNDRY_DURATION_MIN_MINUTES) return LAUNDRY_DURATION_MIN_MINUTES;
  if (rounded > LAUNDRY_DURATION_MAX_MINUTES) return LAUNDRY_DURATION_MAX_MINUTES;
  return rounded;
}

export function normalizeLaundryPrograms(raw: unknown): LaundryMachinePrograms {
  const source =
    raw && typeof raw === 'object' ? (raw as Partial<LaundryMachinePrograms>) : {};
  return {
    wash: clampLaundryDurationMinutes(source.wash, DEFAULT_LAUNDRY_PROGRAM_MINUTES.wash),
    spin_drain: clampLaundryDurationMinutes(
      source.spin_drain,
      DEFAULT_LAUNDRY_PROGRAM_MINUTES.spin_drain
    ),
  };
}

export function normalizeLaundryMachine(
  raw: Partial<LaundryMachine> | null | undefined,
  index: number
): LaundryMachine | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  if (!id || !label) return null;

  const sortOrder =
    typeof raw.sortOrder === 'number' && Number.isFinite(raw.sortOrder)
      ? raw.sortOrder
      : index;

  return {
    id,
    label,
    sortOrder,
    programs: normalizeLaundryPrograms(raw.programs),
  };
}

export function normalizeLaundryMachines(raw: unknown): LaundryMachine[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const seen = new Set<string>();
  const machines: LaundryMachine[] = [];

  raw.forEach((entry, index) => {
    const machine = normalizeLaundryMachine(entry as Partial<LaundryMachine>, index);
    if (!machine || seen.has(machine.id)) return;
    seen.add(machine.id);
    machines.push(machine);
  });

  return machines.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function normalizeLaundrySettings(raw: unknown): LaundrySettings {
  const source =
    raw && typeof raw === 'object' ? (raw as Partial<LaundrySettings>) : {};
  return { machines: normalizeLaundryMachines(source.machines) };
}

/**
 * Admin/owner draft: keep machines with an id even when label is empty
 * so "Add washer" rows stay visible until filled.
 */
export function coerceLaundryMachinesForAdminEdit(raw: unknown): LaundryMachine[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const seen = new Set<string>();
  const machines: LaundryMachine[] = [];

  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    const id = typeof (entry as LaundryMachine).id === 'string'
      ? (entry as LaundryMachine).id.trim()
      : '';
    if (!id || seen.has(id)) return;
    seen.add(id);
    const sortOrder =
      typeof (entry as LaundryMachine).sortOrder === 'number' &&
      Number.isFinite((entry as LaundryMachine).sortOrder)
        ? (entry as LaundryMachine).sortOrder
        : index;
    machines.push({
      id,
      label:
        typeof (entry as LaundryMachine).label === 'string'
          ? (entry as LaundryMachine).label
          : '',
      sortOrder,
      programs: normalizeLaundryPrograms((entry as LaundryMachine).programs),
    });
  });

  return machines.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function listLaundryMachines(settings: TenantSettings): LaundryMachine[] {
  return normalizeLaundrySettings(settings.laundry).machines;
}

export function listLaundryMachinesForAdmin(settings: TenantSettings): LaundryMachine[] {
  if (settings.laundry && Array.isArray(settings.laundry.machines)) {
    return coerceLaundryMachinesForAdminEdit(settings.laundry.machines);
  }
  return [];
}

export function resolveLaundryMachineById(
  settings: TenantSettings,
  machineId: string | undefined | null
): LaundryMachine | null {
  const id = machineId?.trim();
  if (!id) return null;
  return listLaundryMachines(settings).find((machine) => machine.id === id) ?? null;
}

export function resolveLaundryProgramDurationMinutes(
  machine: LaundryMachine,
  program: LaundryProgram
): number {
  return clampLaundryDurationMinutes(
    machine.programs[program],
    DEFAULT_LAUNDRY_PROGRAM_MINUTES[program]
  );
}

/** Persist shape: drop incomplete machines; omit empty laundry block. */
export function finalizeLaundrySettingsForSave(settings: TenantSettings): TenantSettings {
  const machines = normalizeLaundryMachines(settings.laundry?.machines);
  if (machines.length === 0) {
    if (!settings.laundry) return settings;
    const { laundry: _removed, ...rest } = settings;
    return rest;
  }
  return {
    ...settings,
    laundry: { machines },
  };
}

export function createEmptyLaundryMachine(
  index: number,
  existingIds: Set<string>
): LaundryMachine {
  let suffix = index + 1;
  let id = `washer-${suffix}`;
  while (existingIds.has(id)) {
    suffix += 1;
    id = `washer-${suffix}`;
  }
  return {
    id,
    label: `Washer ${suffix}`,
    sortOrder: index,
    programs: {
      wash: DEFAULT_LAUNDRY_PROGRAM_MINUTES.wash,
      spin_drain: DEFAULT_LAUNDRY_PROGRAM_MINUTES.spin_drain,
    },
  };
}
