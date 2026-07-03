'use client';

import { useState } from 'react';
import type { TenantSettings } from '@/entities/tenant';
import {
  DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE,
  DEFAULT_GUEST_ACCESS_PIN_MISSING_TEXT,
} from '@/entities/tenant';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { normalizePhoneDisplayPreset } from '@/shared/lib/phone-display-presets';
import { shouldShowReceptionWhatsappToggles } from '../lib/tenantAdminFieldSpecs';
import { AdminCheckbox, AdminField, AdminTextarea } from '../ui/AdminField';
import { AdminPhoneField } from '../ui/AdminPhoneField';
import { AdminTimeField } from '../ui/AdminTimeField';
import { AdminFieldRow } from '../ui/AdminField';
import { HostelPolicyFields } from './HostelPolicyFields';

export type ContactsFieldsScope = 'full' | 'launch-core';

interface ContactsFieldsProps {
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
  scope?: ContactsFieldsScope;
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

export function ContactsFields({
  settings,
  readinessInput,
  scope = 'full',
}: ContactsFieldsProps) {
  const showReceptionToggles = shouldShowReceptionWhatsappToggles(settings ?? {});
  const [overridesOpen, setOverridesOpen] = useState(() =>
    hasPhoneChannelOverrides(settings ?? {})
  );

  if (scope === 'launch-core') {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Reception phone and stay policy live here. Landing hero and room cards are in the next
          blocks. Property address is in Arrival journey.
        </p>
        <AdminPhoneField
          label="Reception phone"
          rawName="phoneRaw"
          maskName="phoneMask"
          presetName="phoneFormatPreset"
          defaultRaw={settings?.contacts?.phoneRaw}
          defaultMask={settings?.contacts?.phoneMask}
          defaultPreset={normalizePhoneDisplayPreset(settings?.contacts?.phoneFormatPreset)}
          missing={isTenantFieldMissing('phoneRaw', readinessInput)}
        />
        <HostelPolicyFields settings={settings} readinessInput={readinessInput} scope="launch-core" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Reception desk
        </p>
        <AdminFieldRow>
          <AdminTimeField
            label="Reception open"
            name="receptionOpen"
            defaultValue={settings?.reception?.open}
          />
          <AdminTimeField
            label="Reception close"
            name="receptionClose"
            defaultValue={settings?.reception?.close}
          />
        </AdminFieldRow>
        <AdminField
          label="Reception availability hint"
          name="receptionAvailabilityHint"
          defaultValue={settings?.reception?.availabilityHint}
          placeholder="Replies on WhatsApp during reception hours."
          width="lg"
        />
        <AdminField
          label="Reception desk PIN"
          name="receptionDeskPin"
          type="password"
          placeholder={settings?.reception?.deskPinHash ? '•••••• (unchanged)' : 'Set PIN for reception desk'}
          hint="Used at {slug}.reception.domain. Leave blank to keep the current PIN."
          width="sm"
        />
        {showReceptionToggles ? (
          <>
            <AdminCheckbox
              label="Reception reachable on WhatsApp"
              name="receptionWhatsappEnabled"
              defaultChecked={settings?.reception?.whatsappEnabled !== false}
            />
            <AdminCheckbox
              label="Reception can help book a taxi"
              name="receptionCanHelpWithTaxi"
              defaultChecked={settings?.reception?.canHelpWithTaxi !== false}
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
          name="guestAccessMessageTemplate"
          rows={10}
          defaultValue={settings?.reception?.guestAccessMessageTemplate ?? ''}
          placeholder={DEFAULT_GUEST_ACCESS_MESSAGE_TEMPLATE}
          hint="Empty uses the built-in default (see placeholder). Edit to match your Booking messages."
        />
        <AdminField
          label="PIN missing text"
          name="guestAccessPinMissingText"
          defaultValue={settings?.reception?.guestAccessPinMissingText ?? ''}
          placeholder={DEFAULT_GUEST_ACCESS_PIN_MISSING_TEXT}
          hint="Used for {pinOrHelp} when reception no longer has the PIN (e.g. from the access list)."
          width="lg"
        />
      </div>

      <div className="space-y-4 border-t pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Phones & email
        </p>
        <AdminPhoneField
          label="Reception phone"
          rawName="phoneRaw"
          maskName="phoneMask"
          presetName="phoneFormatPreset"
          defaultRaw={settings?.contacts?.phoneRaw}
          defaultMask={settings?.contacts?.phoneMask}
          defaultPreset={normalizePhoneDisplayPreset(settings?.contacts?.phoneFormatPreset)}
          missing={isTenantFieldMissing('phoneRaw', readinessInput)}
          hint="Used for reception desk, WhatsApp, and landing booking when no override is set."
        />

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
              name="receptionWhatsappPhoneRaw"
              defaultValue={settings?.reception?.whatsappPhoneRaw}
              hint="Defaults to reception phone when empty."
              width="md"
            />
            <AdminField
              label="Booking WhatsApp"
              name="bookingWhatsappPhoneRaw"
              defaultValue={settings?.contacts?.bookingWhatsappPhoneRaw}
              hint="Landing hero and room cards use this when set; otherwise reception phone."
              width="md"
            />
            <AdminPhoneField
              label="Taxi phone override"
              rawName="taxiPhoneRaw"
              maskName="taxiPhoneMask"
              presetName="taxiPhoneFormatPreset"
              defaultRaw={settings?.contacts?.taxiPhoneRaw}
              defaultMask={settings?.contacts?.taxiPhoneMask}
              defaultPreset={normalizePhoneDisplayPreset(settings?.contacts?.taxiPhoneFormatPreset)}
              hint="Overrides the city pack recommended taxi number."
            />
            <AdminField
              label="Route feedback WhatsApp"
              name="feedbackPhoneRaw"
              defaultValue={settings?.contacts?.feedbackPhoneRaw}
              width="md"
            />
          </div>
        </details>

        <AdminField
          label="Email"
          name="email"
          type="email"
          defaultValue={settings?.contacts?.email}
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
