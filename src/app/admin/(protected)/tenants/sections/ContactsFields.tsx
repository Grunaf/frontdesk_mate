'use client';

import { useState } from 'react';
import type { TenantSettings } from '@/entities/tenant';
import {
  DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE,
  DEFAULT_GUEST_ACCESS_PIN_MISSING_TEXT,
} from '@/entities/tenant';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import {
  normalizePhoneDisplayPreset,
  type PhoneDisplayPresetId,
} from '@/shared/lib/phone-display-presets';
import { shouldShowReceptionWhatsappToggles } from '../lib/tenantAdminFieldSpecs';
import { AdminCheckbox, AdminField, AdminTextarea } from '../ui/AdminField';
import { AdminPhoneFieldInline } from '../ui/AdminPhoneField';
import { AdminTimeField } from '../ui/AdminTimeField';
import { AdminFieldRow } from '../ui/AdminField';
import { useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { HostelPolicyFields } from './HostelPolicyFields';
import { ReceptionDeskPinFields } from '@/features/owner-reception-desk';

export type ContactsFieldsScope = 'full' | 'launch-core';

interface ContactsFieldsProps {
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
  scope?: ContactsFieldsScope;
  surface?: 'platform' | 'owner';
  tenantSlug?: string;
  locale?: string;
  readOnly?: boolean;
}

function hasPhoneChannelOverrides(settings: TenantSettings): boolean {
  const receptionPhone = settings.contacts?.phoneRaw?.trim() ?? '';
  const receptionWhatsapp = settings.reception?.whatsappPhoneRaw?.trim() ?? '';
  const bookingWhatsapp = settings.contacts?.bookingWhatsappPhoneRaw?.trim() ?? '';

  return Boolean(
    settings.contacts?.taxiPhoneRaw?.trim() ||
      settings.contacts?.feedbackPhoneRaw?.trim() ||
      (receptionWhatsapp && receptionWhatsapp !== receptionPhone) ||
      (bookingWhatsapp && bookingWhatsapp !== receptionPhone)
  );
}

function useContactsDraft(settings: TenantSettings | undefined) {
  const { updateDraft } = useTenantFormDraft();

  const patchContacts = (patch: NonNullable<TenantSettings['contacts']>) => {
    updateDraft({
      contacts: {
        ...settings?.contacts,
        ...patch,
      },
    });
  };

  const patchReception = (patch: Omit<NonNullable<TenantSettings['reception']>, 'deskPinHash'>) => {
    updateDraft({
      reception: {
        ...settings?.reception,
        ...patch,
      },
    });
  };

  return { patchContacts, patchReception };
}

function ReceptionPhoneField({
  settings,
  readinessInput,
}: {
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
}) {
  const { patchContacts } = useContactsDraft(settings);
  const raw = settings?.contacts?.phoneRaw ?? '';
  const mask = settings?.contacts?.phoneMask ?? '';
  const preset = normalizePhoneDisplayPreset(settings?.contacts?.phoneFormatPreset) as PhoneDisplayPresetId;

  return (
    <AdminPhoneFieldInline
      label="Reception phone"
      raw={raw}
      mask={mask}
      preset={preset}
      onRawChange={(value) =>
        patchContacts({
          phoneRaw: value || undefined,
          phoneMask: mask || undefined,
          phoneFormatPreset: preset,
        })
      }
      onMaskChange={(value) => patchContacts({ phoneMask: value || undefined })}
      onPresetChange={(value) => patchContacts({ phoneFormatPreset: value })}
      collapseWhenEmpty={false}
      hint="Used for reception desk, WhatsApp, and landing booking when no override is set."
    />
  );
}

export function ContactsFields({
  settings,
  readinessInput,
  scope = 'full',
  surface = 'platform',
  tenantSlug,
  locale = 'en',
  readOnly = false,
}: ContactsFieldsProps) {
  const { patchContacts, patchReception } = useContactsDraft(settings);
  const showReceptionToggles = shouldShowReceptionWhatsappToggles(settings ?? {});
  const [overridesOpen, setOverridesOpen] = useState(() =>
    hasPhoneChannelOverrides(settings ?? {})
  );

  const receptionPhoneMissing = isTenantFieldMissing('phoneRaw', readinessInput);

  if (scope === 'launch-core') {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Reception phone and stay policy live here. Landing hero and room cards are in the next
          blocks. Property address is in Arrival journey.
        </p>
        <div>
          {receptionPhoneMissing ? (
            <span className="text-xs font-normal text-amber-700">Required for guests</span>
          ) : null}
          <AdminPhoneFieldInline
            label="Reception phone"
            raw={settings?.contacts?.phoneRaw ?? ''}
            mask={settings?.contacts?.phoneMask ?? ''}
            preset={
              normalizePhoneDisplayPreset(settings?.contacts?.phoneFormatPreset) as PhoneDisplayPresetId
            }
            onRawChange={(value) =>
              patchContacts({
                phoneRaw: value || undefined,
                phoneMask: settings?.contacts?.phoneMask,
                phoneFormatPreset: settings?.contacts?.phoneFormatPreset,
              })
            }
            onMaskChange={(value) => patchContacts({ phoneMask: value || undefined })}
            onPresetChange={(value) => patchContacts({ phoneFormatPreset: value })}
            collapseWhenEmpty={false}
          />
        </div>
        <HostelPolicyFields settings={settings} readinessInput={readinessInput} scope="launch-core" />
      </div>
    );
  }

  const taxiRaw = settings?.contacts?.taxiPhoneRaw ?? '';
  const taxiMask = settings?.contacts?.taxiPhoneMask ?? '';
  const taxiPreset = normalizePhoneDisplayPreset(
    settings?.contacts?.taxiPhoneFormatPreset
  ) as PhoneDisplayPresetId;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Reception desk
        </p>
        <AdminFieldRow>
          <AdminTimeField
            label="Reception open"
            value={settings?.reception?.open ?? ''}
            onChange={(value) => patchReception({ open: value || undefined })}
          />
          <AdminTimeField
            label="Reception close"
            value={settings?.reception?.close ?? ''}
            onChange={(value) => patchReception({ close: value || undefined })}
          />
        </AdminFieldRow>
        <AdminField
          label="Reception availability hint"
          value={settings?.reception?.availabilityHint ?? ''}
          onChange={(value) => patchReception({ availabilityHint: value || undefined })}
          placeholder="Replies on WhatsApp during reception hours."
          width="lg"
        />
        <ReceptionDeskPinFields
          surface={surface}
          tenantSlug={tenantSlug ?? readinessInput.slug}
          locale={locale}
          deskPinHash={settings?.reception?.deskPinHash}
          disabled={readOnly}
        />
        {showReceptionToggles ? (
          <>
            <AdminCheckbox
              label="Reception reachable on WhatsApp"
              checked={settings?.reception?.whatsappEnabled !== false}
              onCheckedChange={(checked) => patchReception({ whatsappEnabled: checked })}
            />
            <AdminCheckbox
              label="Reception can help book a taxi"
              checked={settings?.reception?.canHelpWithTaxi !== false}
              onCheckedChange={(checked) => patchReception({ canHelpWithTaxi: checked })}
            />
          </>
        ) : null}
      </div>

      <div className="space-y-4 border-t pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Guest access message
        </p>
        <p className="text-sm text-muted-foreground">
          Reception copies this into Booking chat after issuing access. Guests sign in via{' '}
          <strong className="font-medium text-foreground">Check in</strong> on Concierge (top right in
          the guest app). Placeholders:{' '}
          <code className="text-xs">{'{sendLink}'}</code>, <code className="text-xs">{'{pin}'}</code>,{' '}
          <code className="text-xs">{'{pinOrHelp}'}</code>, <code className="text-xs">{'{guestName}'}</code>,{' '}
          <code className="text-xs">{'{hostelName}'}</code>, <code className="text-xs">{'{bedLabel}'}</code>.
        </p>
        <AdminTextarea
          label="Message template"
          rows={10}
          value={settings?.reception?.guestAccessMessageTemplate ?? ''}
          onChange={(value) =>
            patchReception({ guestAccessMessageTemplate: value.trim() || undefined })
          }
          placeholder={DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE}
          hint="Empty uses the built-in default (see placeholder). Edit to match your Booking messages."
        />
        <AdminField
          label="PIN missing text"
          value={settings?.reception?.guestAccessPinMissingText ?? ''}
          onChange={(value) => patchReception({ guestAccessPinMissingText: value.trim() || undefined })}
          placeholder={DEFAULT_GUEST_ACCESS_PIN_MISSING_TEXT}
          hint="Used for {pinOrHelp} when reception no longer has the PIN (e.g. from the access list)."
          width="lg"
        />
      </div>

      <div className="space-y-4 border-t pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Phones & email
        </p>
        <ReceptionPhoneField settings={settings} readinessInput={readinessInput} />

        <details
          open={overridesOpen}
          onToggle={(event) => setOverridesOpen(event.currentTarget.open)}
          className="rounded-lg border bg-muted/10 px-4 py-3"
        >
          <summary className="cursor-pointer text-sm font-medium">
            Different numbers for specific channels
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Leave empty to use the reception phone for WhatsApp and landing booking links.
          </p>
          <div className="mt-4 space-y-4">
            <AdminField
              label="Reception WhatsApp"
              value={settings?.reception?.whatsappPhoneRaw ?? ''}
              onChange={(value) => patchReception({ whatsappPhoneRaw: value || undefined })}
              hint="Defaults to reception phone when empty."
              width="md"
            />
            <AdminField
              label="Booking WhatsApp"
              value={settings?.contacts?.bookingWhatsappPhoneRaw ?? ''}
              onChange={(value) => patchContacts({ bookingWhatsappPhoneRaw: value || undefined })}
              hint="Landing hero and room cards use this when set; otherwise reception phone."
              width="md"
            />
            <AdminPhoneFieldInline
              label="Taxi phone override"
              raw={taxiRaw}
              mask={taxiMask}
              preset={taxiPreset}
              onRawChange={(value) =>
                patchContacts({
                  taxiPhoneRaw: value || undefined,
                  taxiPhoneMask: taxiMask || undefined,
                  taxiPhoneFormatPreset: taxiPreset,
                })
              }
              onMaskChange={(value) => patchContacts({ taxiPhoneMask: value || undefined })}
              onPresetChange={(value: PhoneDisplayPresetId) =>
                patchContacts({ taxiPhoneFormatPreset: value })
              }
              hint="Overrides the city pack recommended taxi number."
            />
            <AdminField
              label="Route feedback WhatsApp"
              value={settings?.contacts?.feedbackPhoneRaw ?? ''}
              onChange={(value) => patchContacts({ feedbackPhoneRaw: value || undefined })}
              width="md"
            />
          </div>
        </details>

        <AdminField
          label="Email"
          type="email"
          value={settings?.contacts?.email ?? ''}
          onChange={(value) => patchContacts({ email: value || undefined })}
          width="md"
        />
      </div>

      <HostelPolicyFields settings={settings} readinessInput={readinessInput} scope="full" />

      <p className="text-sm text-muted-foreground">
        Property address, maps link, and walk directions are in <strong>Arrival journey</strong>.
      </p>
    </div>
  );
}
