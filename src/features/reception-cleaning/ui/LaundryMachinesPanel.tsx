'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  HOUSEKEEPING_LAUNDRY_PROGRAM_LABELS,
  formatLaundryCountdown,
  indexActiveLaundryRunsByMachine,
  resolveLaundryRemainingMs,
  resolveLaundryWashUiPhase,
  type HousekeepingLaundryProgram,
  type HousekeepingLaundryRunRecord,
} from '@/entities/housekeeping';
import type { LaundryMachine } from '@/entities/tenant';
import {
  BOTTOM_SHEET_SIZES,
  BottomSheet,
  BottomSheetBody,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
} from '@/shared/ui';
import { cn } from '@/shared/lib/utils';

export type LaundryMachinesPanelProps = {
  machines: LaundryMachine[];
  activeRuns: HousekeepingLaundryRunRecord[];
  busy?: boolean;
  onStart: (machineId: string, program: HousekeepingLaundryProgram) => void;
  onComplete: (runId: string) => void;
  onCancel: (runId: string) => void;
};

function MachineCard({
  machine,
  run,
  busy,
  onRequestStart,
  onComplete,
  onCancel,
}: {
  machine: LaundryMachine;
  run: HousekeepingLaundryRunRecord | undefined;
  busy: boolean;
  onRequestStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!run || run.status !== 'running') return;
    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [run?.id, run?.status, run?.ends_at]);

  const phase = resolveLaundryWashUiPhase(run, new Date(nowMs));
  const remainingMs =
    run && run.status === 'running'
      ? resolveLaundryRemainingMs(run.ends_at, new Date(nowMs))
      : 0;
  const countdown = formatLaundryCountdown(remainingMs);
  const programLabel = run ? HOUSEKEEPING_LAUNDRY_PROGRAM_LABELS[run.program] : null;

  if (phase === 'unload' && run) {
    return (
      <li
        className={cn(
          'rounded-lg border px-3 py-3',
          'border-amber-200 bg-amber-50 text-amber-950'
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-medium">Unload linen · {machine.label}</h3>
            <p className="text-xs text-amber-900/80">
              {programLabel} finished · {countdown} — empty the machine, then mark done.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={onComplete}
              className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              Wash done
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="shrink-0 rounded-md border border-amber-300/80 bg-background/60 px-3 py-1.5 text-xs font-medium text-amber-950/80 hover:bg-background disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </li>
    );
  }

  if (phase === 'running' && run) {
    return (
      <li className="rounded-lg border bg-card px-3 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-medium text-foreground">
              {machine.label} · {programLabel} ·{' '}
              <span className="tabular-nums">{countdown}</span> left
            </h3>
            <p className="text-xs text-muted-foreground">Timer running</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={onComplete}
              className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              Wash done
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-lg border bg-card px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-medium text-foreground">{machine.label}</h3>
          <p className="text-xs text-muted-foreground">
            Wash {machine.programs.wash} min · Spin & drain {machine.programs.spin_drain} min
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onRequestStart}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
        >
          Start
        </button>
      </div>
    </li>
  );
}

export function LaundryMachinesPanel({
  machines,
  activeRuns,
  busy = false,
  onStart,
  onComplete,
  onCancel,
}: LaundryMachinesPanelProps) {
  const [startMachineId, setStartMachineId] = useState<string | null>(null);
  const runsByMachine = useMemo(
    () => indexActiveLaundryRunsByMachine(activeRuns),
    [activeRuns]
  );
  const startMachine = machines.find((machine) => machine.id === startMachineId) ?? null;

  if (machines.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        Configure washers in settings
      </p>
    );
  }

  return (
    <>
      <section className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Wash</h3>
        <ul className="space-y-2">
          {machines.map((machine) => {
            const run = runsByMachine[machine.id];
            return (
              <MachineCard
                key={machine.id}
                machine={machine}
                run={run}
                busy={busy}
                onRequestStart={() => setStartMachineId(machine.id)}
                onComplete={() => {
                  if (run) onComplete(run.id);
                }}
                onCancel={() => {
                  if (run) onCancel(run.id);
                }}
              />
            );
          })}
        </ul>
      </section>

      <BottomSheet
        open={Boolean(startMachine)}
        onOpenChange={(open) => {
          if (!open) setStartMachineId(null);
        }}
        dismissible={!busy}
      >
        <BottomSheetContent size={BOTTOM_SHEET_SIZES.medium} className="flex flex-col px-0 pb-0">
          <BottomSheetHeader className="px-6 pb-3">
            <BottomSheetTitle>
              Start wash on {startMachine?.label ?? 'washer'}
            </BottomSheetTitle>
          </BottomSheetHeader>
          <BottomSheetBody className="space-y-2 pb-6">
            {startMachine ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onStart(startMachine.id, 'wash');
                    setStartMachineId(null);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border bg-background px-4 py-3 text-left text-sm font-medium hover:bg-muted/40 disabled:opacity-60"
                >
                  <span>{HOUSEKEEPING_LAUNDRY_PROGRAM_LABELS.wash}</span>
                  <span className="text-xs text-muted-foreground">
                    {startMachine.programs.wash} min
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onStart(startMachine.id, 'spin_drain');
                    setStartMachineId(null);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border bg-background px-4 py-3 text-left text-sm font-medium hover:bg-muted/40 disabled:opacity-60"
                >
                  <span>{HOUSEKEEPING_LAUNDRY_PROGRAM_LABELS.spin_drain}</span>
                  <span className="text-xs text-muted-foreground">
                    {startMachine.programs.spin_drain} min
                  </span>
                </button>
              </>
            ) : null}
          </BottomSheetBody>
        </BottomSheetContent>
      </BottomSheet>
    </>
  );
}
