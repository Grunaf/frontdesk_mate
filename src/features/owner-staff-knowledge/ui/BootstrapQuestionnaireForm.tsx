'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Label } from '@/shared/ui/label';

import type {
  BootstrapCleaningDepth,
  BootstrapCleaningOwner,
  BootstrapGuestPayments,
  BootstrapKeysAccess,
  BootstrapLaundryOps,
  BootstrapNightCoverage,
  BootstrapOtherNoteField,
  BootstrapPrefillFlags,
  BootstrapQuestionnaire,
  StaffKnowledgeLaborModel,
} from '../model/types';

type Option<T extends string> = { value: T; label: string };

export type BootstrapQuestionnaireFormLabels = {
  fromSettings: string;
  openSettingsContacts: string;
  openSettingsGuestApp: string;
  checkInTime: string;
  checkOutTime: string;
  receptionOpen: string;
  receptionClose: string;
  receptionHint: string;
  sizeUnknown: string;
  roomCount: string;
  bedCount: string;
  laundry: string;
  quietHours: string;
  laborModel: string;
  laborPaid: string;
  laborVolunteers: string;
  laborMix: string;
  nightCoverage: string;
  nightStaff: string;
  nightVolunteer: string;
  nightOnCallOwner: string;
  nightClosed: string;
  cleaningOwner: string;
  cleaningDepth: string;
  cleaningStaff: string;
  cleaningVolunteers: string;
  cleaningOutsource: string;
  cleaningMixed: string;
  cleaningDepthOwner: string;
  laundryOps: string;
  guestPayments: string;
  paymentsPaidStaff: string;
  paymentsOwner: string;
  paymentsNone: string;
  keysAccess: string;
  keysPaidStaff: string;
  keysOwner: string;
  keysVolunteer: string;
  keysSelfService: string;
  peakDays: string;
  peakDaysPlaceholder: string;
  specialConstraints: string;
  specialConstraintsPlaceholder: string;
  yes: string;
  no: string;
  other: string;
  otherNotePlaceholder: string;
  otherNoteRequired: string;
  timePlaceholder: string;
  criticalPrefillHint: string;
};

type BootstrapQuestionnaireFormProps = {
  value: BootstrapQuestionnaire;
  fromSettings: BootstrapPrefillFlags;
  locale: string;
  disabled?: boolean;
  showCriticalPrefillHint?: boolean;
  labels: BootstrapQuestionnaireFormLabels;
  onChange: (next: BootstrapQuestionnaire) => void;
};

function ChipRow<T extends string>({
  name,
  options,
  value,
  disabled,
  onChange,
}: {
  name: string;
  options: Option<T>[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={
              selected
                ? 'rounded-md border border-foreground bg-foreground px-3 py-1.5 text-xs font-medium text-background'
                : 'rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted'
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function FromSettingsBadge({ label }: { label: string }) {
  return (
    <span className="rounded-md border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  );
}

function FieldHeader({
  label,
  fromSettings,
  badgeLabel,
}: {
  label: string;
  fromSettings?: boolean;
  badgeLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label>{label}</Label>
      {fromSettings ? <FromSettingsBadge label={badgeLabel} /> : null}
    </div>
  );
}

function OtherNoteInput({
  id,
  value,
  disabled,
  placeholder,
  requiredHint,
  onChange,
}: {
  id: string;
  value: string;
  disabled?: boolean;
  placeholder: string;
  requiredHint: string;
  onChange: (value: string) => void;
}) {
  const missing = !value.trim();
  return (
    <div className="space-y-1">
      <input
        id={id}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-required
        onChange={(event) => onChange(event.target.value)}
      />
      {missing ? (
        <p className="text-xs text-muted-foreground">{requiredHint}</p>
      ) : null}
    </div>
  );
}

export function BootstrapQuestionnaireForm({
  value,
  fromSettings,
  locale,
  disabled,
  showCriticalPrefillHint,
  labels,
  onChange,
}: BootstrapQuestionnaireFormProps) {
  const t = useTranslations('pages.owner.knowledge');

  const patchOtherNote = (field: BootstrapOtherNoteField, note: string) => {
    onChange({
      ...value,
      otherNotes: { ...value.otherNotes, [field]: note },
    });
  };

  const yesNoOther: Option<'yes' | 'no' | 'other'>[] = [
    { value: 'yes', label: labels.yes },
    { value: 'no', label: labels.no },
    { value: 'other', label: labels.other },
  ];

  const laborOptions: Option<StaffKnowledgeLaborModel>[] = [
    { value: 'paid', label: labels.laborPaid },
    { value: 'volunteers', label: labels.laborVolunteers },
    { value: 'mix', label: labels.laborMix },
  ];

  const nightOptions: Option<BootstrapNightCoverage>[] = [
    { value: 'staff', label: labels.nightStaff },
    { value: 'volunteer', label: labels.nightVolunteer },
    { value: 'on_call_owner', label: labels.nightOnCallOwner },
    { value: 'closed', label: labels.nightClosed },
    { value: 'other', label: labels.other },
  ];

  const cleaningOptions: Option<BootstrapCleaningOwner>[] = [
    { value: 'staff', label: labels.cleaningStaff },
    { value: 'volunteers', label: labels.cleaningVolunteers },
    { value: 'outsource', label: labels.cleaningOutsource },
    { value: 'mixed', label: labels.cleaningMixed },
    { value: 'other', label: labels.other },
  ];

  const cleaningDepthOptions: Option<BootstrapCleaningDepth>[] = [
    { value: 'owner', label: labels.cleaningDepthOwner },
    { value: 'staff', label: labels.cleaningStaff },
    { value: 'volunteers', label: labels.cleaningVolunteers },
    { value: 'outsource', label: labels.cleaningOutsource },
    { value: 'other', label: labels.other },
  ];

  const laundryOpsOptions: Option<BootstrapLaundryOps>[] = [
    { value: 'staff', label: labels.cleaningStaff },
    { value: 'volunteers', label: labels.cleaningVolunteers },
    { value: 'outsource', label: labels.cleaningOutsource },
    { value: 'mixed', label: labels.cleaningMixed },
    { value: 'other', label: labels.other },
  ];

  const paymentsOptions: Option<BootstrapGuestPayments>[] = [
    { value: 'paid_staff', label: labels.paymentsPaidStaff },
    { value: 'owner', label: labels.paymentsOwner },
    { value: 'none', label: labels.paymentsNone },
    { value: 'other', label: labels.other },
  ];

  const keysOptions: Option<BootstrapKeysAccess>[] = [
    { value: 'paid_staff', label: labels.keysPaidStaff },
    { value: 'owner', label: labels.keysOwner },
    { value: 'volunteer', label: labels.keysVolunteer },
    { value: 'self_service', label: labels.keysSelfService },
    { value: 'other', label: labels.other },
  ];

  const settingsContactsHref = `/${locale}/settings/contacts`;
  const settingsGuestAppHref = `/${locale}/settings/guest-app`;

  return (
    <div className="space-y-4 rounded-lg border p-3">
      {showCriticalPrefillHint ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {labels.criticalPrefillHint}{' '}
          <Link className="underline" href={settingsContactsHref}>
            {labels.openSettingsContacts}
          </Link>
          {' · '}
          <Link className="underline" href={settingsGuestAppHref}>
            {labels.openSettingsGuestApp}
          </Link>
        </p>
      ) : null}

      <div className="space-y-2">
        <FieldHeader
          label={labels.laborModel}
          badgeLabel={labels.fromSettings}
        />
        <ChipRow
          name={labels.laborModel}
          options={laborOptions}
          value={value.laborModel}
          disabled={disabled}
          onChange={(laborModel) => onChange({ ...value, laborModel })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldHeader
            label={labels.checkInTime}
            fromSettings={fromSettings.checkInTime}
            badgeLabel={labels.fromSettings}
          />
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={value.checkInTime}
            disabled={disabled}
            placeholder={labels.timePlaceholder}
            onChange={(event) =>
              onChange({ ...value, checkInTime: event.target.value })
            }
          />
          {!fromSettings.checkInTime ? (
            <Link className="text-xs text-muted-foreground underline" href={settingsContactsHref}>
              {labels.openSettingsContacts}
            </Link>
          ) : null}
        </div>
        <div className="space-y-2">
          <FieldHeader
            label={labels.checkOutTime}
            fromSettings={fromSettings.checkOutTime}
            badgeLabel={labels.fromSettings}
          />
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={value.checkOutTime}
            disabled={disabled}
            placeholder={labels.timePlaceholder}
            onChange={(event) =>
              onChange({ ...value, checkOutTime: event.target.value })
            }
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldHeader
            label={labels.receptionOpen}
            fromSettings={fromSettings.receptionOpen}
            badgeLabel={labels.fromSettings}
          />
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={value.receptionOpen}
            disabled={disabled}
            placeholder={labels.timePlaceholder}
            onChange={(event) =>
              onChange({ ...value, receptionOpen: event.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <FieldHeader
            label={labels.receptionClose}
            fromSettings={fromSettings.receptionClose}
            badgeLabel={labels.fromSettings}
          />
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={value.receptionClose}
            disabled={disabled}
            placeholder={labels.timePlaceholder}
            onChange={(event) =>
              onChange({ ...value, receptionClose: event.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <FieldHeader
          label={labels.receptionHint}
          fromSettings={fromSettings.receptionHint}
          badgeLabel={labels.fromSettings}
        />
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={value.receptionHint}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, receptionHint: event.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <FieldHeader
          label={labels.roomCount}
          fromSettings={fromSettings.roomMap}
          badgeLabel={labels.fromSettings}
        />
        {value.sizeSource === 'guestStay' ? (
          <p className="text-sm text-muted-foreground">
            {t('bootstrap.questionnaire.sizeFromMap', {
              rooms: value.roomCount ?? 0,
              beds: value.bedCount ?? 0,
            })}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{labels.roomCount}</Label>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={value.roomCount ?? ''}
                placeholder={labels.sizeUnknown}
                disabled={disabled}
                onChange={(event) => {
                  const raw = event.target.value.trim();
                  onChange({
                    ...value,
                    roomCount: raw === '' ? null : Number(raw),
                  });
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{labels.bedCount}</Label>
              <input
                type="number"
                min={0}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={value.bedCount ?? ''}
                placeholder={labels.sizeUnknown}
                disabled={disabled}
                onChange={(event) => {
                  const raw = event.target.value.trim();
                  onChange({
                    ...value,
                    bedCount: raw === '' ? null : Number(raw),
                  });
                }}
              />
            </div>
            <Link
              className="text-xs text-muted-foreground underline sm:col-span-2"
              href={settingsGuestAppHref}
            >
              {labels.openSettingsGuestApp}
            </Link>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <FieldHeader
          label={labels.laundry}
          fromSettings={fromSettings.laundry}
          badgeLabel={labels.fromSettings}
        />
        <ChipRow
          name={labels.laundry}
          options={yesNoOther}
          value={value.laundry}
          disabled={disabled}
          onChange={(laundry) => onChange({ ...value, laundry })}
        />
        {value.laundry === 'other' ? (
          <OtherNoteInput
            id="sk-other-laundry"
            value={value.otherNotes.laundry}
            disabled={disabled}
            placeholder={labels.otherNotePlaceholder}
            requiredHint={labels.otherNoteRequired}
            onChange={(note) => patchOtherNote('laundry', note)}
          />
        ) : null}
      </div>

      {value.laundry === 'yes' ? (
        <div className="space-y-2">
          <Label>{labels.laundryOps}</Label>
          <ChipRow
            name={labels.laundryOps}
            options={laundryOpsOptions}
            value={value.laundryOps}
            disabled={disabled}
            onChange={(laundryOps) => onChange({ ...value, laundryOps })}
          />
          {value.laundryOps === 'other' ? (
            <OtherNoteInput
              id="sk-other-laundry-ops"
              value={value.otherNotes.laundryOps}
              disabled={disabled}
              placeholder={labels.otherNotePlaceholder}
              requiredHint={labels.otherNoteRequired}
              onChange={(note) => patchOtherNote('laundryOps', note)}
            />
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <FieldHeader
          label={labels.quietHours}
          fromSettings={fromSettings.quietHours}
          badgeLabel={labels.fromSettings}
        />
        <input
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={value.quietHours}
          disabled={disabled}
          placeholder={labels.timePlaceholder}
          onChange={(event) =>
            onChange({ ...value, quietHours: event.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>{labels.nightCoverage}</Label>
        <ChipRow
          name={labels.nightCoverage}
          options={nightOptions}
          value={value.nightCoverage}
          disabled={disabled}
          onChange={(nightCoverage) => onChange({ ...value, nightCoverage })}
        />
        {value.nightCoverage === 'other' ? (
          <OtherNoteInput
            id="sk-other-night"
            value={value.otherNotes.nightCoverage}
            disabled={disabled}
            placeholder={labels.otherNotePlaceholder}
            requiredHint={labels.otherNoteRequired}
            onChange={(note) => patchOtherNote('nightCoverage', note)}
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>{labels.cleaningOwner}</Label>
        <ChipRow
          name={labels.cleaningOwner}
          options={cleaningOptions}
          value={value.cleaningOwner}
          disabled={disabled}
          onChange={(cleaningOwner) => onChange({ ...value, cleaningOwner })}
        />
        {value.cleaningOwner === 'other' ? (
          <OtherNoteInput
            id="sk-other-cleaning-owner"
            value={value.otherNotes.cleaningOwner}
            disabled={disabled}
            placeholder={labels.otherNotePlaceholder}
            requiredHint={labels.otherNoteRequired}
            onChange={(note) => patchOtherNote('cleaningOwner', note)}
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>{labels.cleaningDepth}</Label>
        <ChipRow
          name={labels.cleaningDepth}
          options={cleaningDepthOptions}
          value={value.cleaningDepth}
          disabled={disabled}
          onChange={(cleaningDepth) => onChange({ ...value, cleaningDepth })}
        />
        {value.cleaningDepth === 'other' ? (
          <OtherNoteInput
            id="sk-other-cleaning-depth"
            value={value.otherNotes.cleaningDepth}
            disabled={disabled}
            placeholder={labels.otherNotePlaceholder}
            requiredHint={labels.otherNoteRequired}
            onChange={(note) => patchOtherNote('cleaningDepth', note)}
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>{labels.guestPayments}</Label>
        <ChipRow
          name={labels.guestPayments}
          options={paymentsOptions}
          value={value.guestPayments}
          disabled={disabled}
          onChange={(guestPayments) => onChange({ ...value, guestPayments })}
        />
        {value.guestPayments === 'other' ? (
          <OtherNoteInput
            id="sk-other-payments"
            value={value.otherNotes.guestPayments}
            disabled={disabled}
            placeholder={labels.otherNotePlaceholder}
            requiredHint={labels.otherNoteRequired}
            onChange={(note) => patchOtherNote('guestPayments', note)}
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>{labels.keysAccess}</Label>
        <ChipRow
          name={labels.keysAccess}
          options={keysOptions}
          value={value.keysAccess}
          disabled={disabled}
          onChange={(keysAccess) => onChange({ ...value, keysAccess })}
        />
        {value.keysAccess === 'other' ? (
          <OtherNoteInput
            id="sk-other-keys"
            value={value.otherNotes.keysAccess}
            disabled={disabled}
            placeholder={labels.otherNotePlaceholder}
            requiredHint={labels.otherNoteRequired}
            onChange={(note) => patchOtherNote('keysAccess', note)}
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="sk-peak-days">{labels.peakDays}</Label>
        <input
          id="sk-peak-days"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={value.peakDays}
          placeholder={labels.peakDaysPlaceholder}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, peakDays: event.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sk-special-constraints">{labels.specialConstraints}</Label>
        <textarea
          id="sk-special-constraints"
          className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
          value={value.specialConstraints}
          placeholder={labels.specialConstraintsPlaceholder}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, specialConstraints: event.target.value })
          }
        />
      </div>
    </div>
  );
}
