/**
 * Whether the housekeeping bed rollover job should run for a tenant's
 * current operational day window.
 */
export function resolveHousekeepingBedRolloverGate(input: {
  now: Date;
  startsAt: Date;
  alreadyRolled: boolean;
}): 'run' | 'before_start' | 'already_rolled' {
  if (input.now.getTime() < input.startsAt.getTime()) {
    return 'before_start';
  }
  if (input.alreadyRolled) {
    return 'already_rolled';
  }
  return 'run';
}
