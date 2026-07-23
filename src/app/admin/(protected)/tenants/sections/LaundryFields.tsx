'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import type { LaundryMachine, TenantSettings } from '@/entities/tenant';
import {
  LAUNDRY_DURATION_MAX_MINUTES,
  LAUNDRY_DURATION_MIN_MINUTES,
  createEmptyLaundryMachine,
  listLaundryMachinesForAdmin,
} from '@/entities/tenant';

import { mergeDraftSettings, useTenantFormDraft } from '../ui/TenantFormDraftContext';

interface LaundryFieldsProps {
  settings?: TenantSettings;
  surface?: 'platform' | 'owner';
}

type LaundryLabels = {
  title: string;
  description: string;
  add: string;
  empty: string;
  machine: string;
  remove: string;
  label: string;
  labelPlaceholder: string;
  washMinutes: string;
  spinDrainMinutes: string;
  minutesHint: string;
};

const PLATFORM_LABELS: LaundryLabels = {
  title: 'Washers',
  description:
    'Machines shown on reception Cleaning. Each has Wash and Spin & drain durations.',
  add: 'Add washer',
  empty: 'No washers yet. Add machines so Cleaning can start timed wash cycles.',
  machine: 'Washer',
  remove: 'Remove',
  label: 'Label',
  labelPlaceholder: 'Washer 1',
  washMinutes: 'Wash (min)',
  spinDrainMinutes: 'Spin & drain (min)',
  minutesHint: `Duration ${LAUNDRY_DURATION_MIN_MINUTES}–${LAUNDRY_DURATION_MAX_MINUTES} minutes.`,
};

function LaundryFieldsInner({
  settings,
  labels,
}: {
  settings?: TenantSettings;
  labels: LaundryLabels;
}) {
  const { draft, updateDraft } = useTenantFormDraft();
  const mergedSettings = useMemo(
    () => mergeDraftSettings(settings ?? {}, draft),
    [settings, draft]
  );
  const machines = listLaundryMachinesForAdmin(mergedSettings);

  const syncMachines = (next: LaundryMachine[]) => {
    updateDraft({
      laundry: {
        machines: next.map((machine, index) => ({ ...machine, sortOrder: index })),
      },
    });
  };

  const patchMachine = (index: number, patch: Partial<LaundryMachine>) => {
    syncMachines(
      machines.map((machine, i) => (i === index ? { ...machine, ...patch } : machine))
    );
  };

  const patchProgram = (
    index: number,
    program: 'wash' | 'spin_drain',
    rawValue: string
  ) => {
    const parsed = Number.parseInt(rawValue, 10);
    const value = Number.isFinite(parsed) ? parsed : machines[index]?.programs[program] ?? 1;
    patchMachine(index, {
      programs: {
        ...machines[index].programs,
        [program]: value,
      },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{labels.title}</p>
          <p className="text-xs text-muted-foreground">{labels.description}</p>
        </div>
        <button
          type="button"
          className="shrink-0 text-xs text-primary hover:underline"
          onClick={() => {
            const ids = new Set(machines.map((machine) => machine.id));
            syncMachines([...machines, createEmptyLaundryMachine(machines.length, ids)]);
          }}
        >
          {labels.add}
        </button>
      </div>

      {machines.length === 0 ? (
        <p className="text-xs text-muted-foreground">{labels.empty}</p>
      ) : null}

      {machines.map((machine, index) => (
        <div key={machine.id} className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {labels.machine} {index + 1}
            </p>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-destructive"
              onClick={() => syncMachines(machines.filter((_, i) => i !== index))}
            >
              {labels.remove}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium">{labels.label}</span>
              <input
                value={machine.label}
                onChange={(event) => patchMachine(index, { label: event.target.value })}
                placeholder={labels.labelPlaceholder}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{labels.washMinutes}</span>
              <input
                type="number"
                inputMode="numeric"
                value={machine.programs.wash}
                onChange={(event) => patchProgram(index, 'wash', event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{labels.spinDrainMinutes}</span>
              <input
                type="number"
                inputMode="numeric"
                value={machine.programs.spin_drain}
                onChange={(event) => patchProgram(index, 'spin_drain', event.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">{labels.minutesHint}</p>
        </div>
      ))}
    </div>
  );
}

function LaundryFieldsOwner({ settings }: { settings?: TenantSettings }) {
  const t = useTranslations('pages.owner.laundry');
  const labels: LaundryLabels = {
    title: t('title'),
    description: t('description'),
    add: t('add'),
    empty: t('empty'),
    machine: t('machine'),
    remove: t('remove'),
    label: t('label'),
    labelPlaceholder: t('labelPlaceholder'),
    washMinutes: t('washMinutes'),
    spinDrainMinutes: t('spinDrainMinutes'),
    minutesHint: t('minutesHint', {
      min: LAUNDRY_DURATION_MIN_MINUTES,
      max: LAUNDRY_DURATION_MAX_MINUTES,
    }),
  };
  return <LaundryFieldsInner settings={settings} labels={labels} />;
}

export function LaundryFields({ settings, surface = 'platform' }: LaundryFieldsProps) {
  if (surface === 'owner') {
    return <LaundryFieldsOwner settings={settings} />;
  }
  return <LaundryFieldsInner settings={settings} labels={PLATFORM_LABELS} />;
}
