import { todayUtcDate } from './guestAccessDates';
import {
  isBeforeTodaysOperationalRollover,
  resolveOperationalDay,
  resolveOperationalDayStartTime,
} from './resolveOperationalDay';

export type ManualHousekeepingDayStartKind = 'ready' | 'before_start' | 'already_rolled';

export type ManualHousekeepingDayStartView = {
  kind: ManualHousekeepingDayStartKind;
  /** Active desk operational date (may still be yesterday before start). */
  operationalDate: string;
  calendarToday: string;
  startTimeLabel: string;
  /** Ledger date that Start day will write (calendar today when early). */
  targetOperationalDate: string;
};

/**
 * UI gate for Hub “Start operational day”.
 * `alreadyRolledForTarget` must match `targetOperationalDate` (calendar today if before start).
 */
export function resolveManualHousekeepingDayStartView(input: {
  now: Date;
  operationalDayStartTime: string;
  alreadyRolledForTarget: boolean;
}): ManualHousekeepingDayStartView {
  const startTimeLabel = resolveOperationalDayStartTime({
    operationalDayStartTime: input.operationalDayStartTime,
  });
  const window = resolveOperationalDay(input.now, startTimeLabel);
  const calendarToday = todayUtcDate(input.now);
  const beforeStart = isBeforeTodaysOperationalRollover(input.now, startTimeLabel);
  const targetOperationalDate = calendarToday;

  if (input.alreadyRolledForTarget) {
    return {
      kind: 'already_rolled',
      operationalDate: window.operationalDate,
      calendarToday,
      startTimeLabel,
      targetOperationalDate,
    };
  }

  if (beforeStart) {
    return {
      kind: 'before_start',
      operationalDate: window.operationalDate,
      calendarToday,
      startTimeLabel,
      targetOperationalDate,
    };
  }

  return {
    kind: 'ready',
    operationalDate: window.operationalDate,
    calendarToday,
    startTimeLabel,
    targetOperationalDate,
  };
}
