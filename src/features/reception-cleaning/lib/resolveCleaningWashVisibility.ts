import type { HousekeepingLaundryRunRecord } from '@/entities/housekeeping';
import {
  formatLaundryCountdown,
  indexActiveLaundryRunsByMachine,
  isLaundryUnloadDue,
  resolveLaundryRemainingMs,
} from '@/entities/housekeeping';

export type CleaningWashMachineRef = {
  id: string;
  label: string;
};

/**
 * Wash callout on Rooms stays off unless there is stripped linen
 * to process or an active machine run (including unload-due interrupt).
 */
export function shouldShowCleaningWashSection(input: {
  makeCount: number;
  activeRuns: readonly HousekeepingLaundryRunRecord[];
  machineCount: number;
  now?: Date;
}): boolean {
  if (input.machineCount <= 0) return false;
  if (input.makeCount > 0) return true;
  return input.activeRuns.some((run) => run.status === 'running');
}

/** Wash context tab — only when laundry machines are configured. */
export function shouldShowCleaningWashTab(machineCount: number): boolean {
  return machineCount > 0;
}

/** Tab badge: unload-due interrupt only. */
export function resolveCleaningWashTabBadgeCount(unloadDueCount: number): number {
  return unloadDueCount > 0 ? unloadDueCount : 0;
}

export function countLaundryUnloadDue(
  activeRuns: readonly HousekeepingLaundryRunRecord[],
  now: Date = new Date()
): number {
  return activeRuns.filter(
    (run) => run.status === 'running' && isLaundryUnloadDue(run.ends_at, now)
  ).length;
}

export function resolveCleaningWashSummaryLabel(input: {
  makeCount: number;
  unloadDueCount: number;
  runningCount: number;
}): string {
  if (input.unloadDueCount > 0) {
    return `Wash · unload ${input.unloadDueCount}`;
  }
  if (input.runningCount > 0) {
    return `Wash · ${input.runningCount} running`;
  }
  if (input.makeCount > 0) {
    return `Wash · ${input.makeCount} stripped`;
  }
  return 'Wash';
}

/**
 * Brief Rooms callout: which machine to use / unload now.
 * Returns null when the callout should be hidden.
 */
export function resolveCleaningWashCalloutLabel(input: {
  machines: readonly CleaningWashMachineRef[];
  activeRuns: readonly HousekeepingLaundryRunRecord[];
  makeCount: number;
  now?: Date;
}): string | null {
  const now = input.now ?? new Date();
  if (
    !shouldShowCleaningWashSection({
      makeCount: input.makeCount,
      activeRuns: input.activeRuns,
      machineCount: input.machines.length,
      now,
    })
  ) {
    return null;
  }

  const byMachine = indexActiveLaundryRunsByMachine(input.activeRuns);

  for (const machine of input.machines) {
    const run = byMachine[machine.id];
    if (run && isLaundryUnloadDue(run.ends_at, now)) {
      return `Unload ${machine.label} · ready`;
    }
  }

  const free = input.machines.find((machine) => !byMachine[machine.id]);
  if (free && input.makeCount > 0) {
    return `${free.label} free · ${input.makeCount} stripped`;
  }

  let soonest: { label: string; remainingMs: number } | null = null;
  for (const machine of input.machines) {
    const run = byMachine[machine.id];
    if (!run || isLaundryUnloadDue(run.ends_at, now)) continue;
    const remainingMs = resolveLaundryRemainingMs(run.ends_at, now);
    if (!soonest || remainingMs < soonest.remainingMs) {
      soonest = { label: machine.label, remainingMs };
    }
  }
  if (soonest) {
    return `${soonest.label} ${formatLaundryCountdown(soonest.remainingMs)} left`;
  }

  if (input.makeCount > 0) {
    return `Wash · ${input.makeCount} stripped`;
  }

  return 'Wash';
}
