import type { HousekeepingLaundryRunRecord } from '@/entities/housekeeping';
import { isLaundryUnloadDue } from '@/entities/housekeeping';

/**
 * Wash stays off the Cleaning main surface unless there is stripped linen
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
