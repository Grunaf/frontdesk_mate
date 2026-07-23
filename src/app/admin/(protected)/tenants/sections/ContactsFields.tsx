'use client';

import { useMemo, useState } from 'react';
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
import {
  CONTACTS_ADMIN_MODULES,
  getContactsAdminModuleHint,
  getContactsAdminModuleStatus,
  type ContactsAdminModuleId,
} from '../lib/contactsAdminSubsections';
import { shouldShowReceptionWhatsappToggles } from '../lib/tenantAdminFieldSpecs';
import { AdminCheckbox, AdminField, AdminTextarea } from '../ui/AdminField';
import { AdminPhoneFieldInline } from '../ui/AdminPhoneField';
import { AdminTimeField } from '../ui/AdminTimeField';
import { AdminFieldRow } from '../ui/AdminField';
import { AdminSettingsDrillDown } from '../ui/AdminSettingsDrillDown';
import { useTenantFormDraft } from '../ui/TenantFormDraftContext';
import { HostelPolicyFields } from './HostelPolicyFields';
import { LaundryFields } from './LaundryFields';
import { ReceptionBookingPlatformsFields } from './ReceptionBookingPlatformsFields';
import { ReceptionDeskPinFields } from '@/features/owner-reception-desk';
import { ReceptionStaffManagement } from '@/features/reception-staff-management';

export type ContactsFieldsScope = 'full' | 'launch-core';

interface ContactsFieldsProps {
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
  scope?: ContactsFieldsScope;
  surface?: 'platform' | 'owner';
  tenantSlug?: string;
  locale?: string;
  readOnly?: boolean;
  activeModuleId?: ContactsAdminModuleId | null;
  onModuleChange?: (moduleId: ContactsAdminModuleId | null) => void;
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

function useContactsDraft() {
  const { updateDraft } = useTenantFormDraft();

  const patchContacts = (patch: Partial<NonNullable<TenantSettings['contacts']>>) => {
    updateDraft({ contacts: patch });
  };

  const patchReception = (patch: Partial<NonNullable<TenantSettings['reception']>>) => {
    updateDraft({ reception: patch });
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
  const { patchContacts } = useContactsDraft();
  const raw = settings?.contacts?.phoneRaw ?? '';
  const mask = settings?.contacts?.phoneMask ?? '';
  const preset = normalizePhoneDisplayPreset(settings?.contacts?.phoneFormatPreset) as PhoneDisplayPresetId;

  return (
    <AdminPhoneFieldInline
      label="Reception phone"
      raw={raw}
      mask={mask}
      preset={preset}
      onRawChange={(value) => patchContacts({ phoneRaw: value || undefined })}
      onMaskChange={(value) => patchContacts({ phoneMask: value || undefined })}
      onPresetChange={(value) => patchContacts({ phoneFormatPreset: value })}
      collapseWhenEmpty={false}
      hint="Used for reception desk, WhatsApp, and landing booking when no override is set."
    />
  );
}

function ReceptionDeskModule({
  settings,
  showReceptionAccessFields,
  showReceptionToggles,
  surface,
  receptionTenantSlug,
  locale,
}: {
  settings?: TenantSettings;
  showReceptionAccessFields: boolean;
  showReceptionToggles: boolean;
  surface: 'platform' | 'owner';
  receptionTenantSlug: string;
  locale: string;
}) {
  const { patchReception } = useContactsDraft();

  return (
    <div className="space-y-4">
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
      {showReceptionAccessFields ? (
        <ReceptionDeskPinFields
          surface={surface}
          tenantSlug={receptionTenantSlug}
          locale={locale}
        />
      ) : null}
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
      <ReceptionBookingPlatformsFields settings={settings} />
    </div>
  );
}

function GuestAccessMessageModule({ settings }: { settings?: TenantSettings }) {
  const { patchReception } = useContactsDraft();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Reception copies this into Booking chat after issuing access. Guests sign in via{' '}
        <strong className="font-medium text-foreground">Check in</strong> on Concierge (top right in
        the guest app). Placeholders: <code className="text-xs">{'{sendLink}'}</code>,{' '}
        <code className="text-xs">{'{pin}'}</code>, <code className="text-xs">{'{pinOrHelp}'}</code>,{' '}
        <code className="text-xs">{'{guestName}'}</code>, <code className="text-xs">{'{hostelName}'}</code>.
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
  );
}

function PhonesEmailModule({
  settings,
  readinessInput,
}: {
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
}) {
  const { patchContacts, patchReception } = useContactsDraft();
  const [overridesOpen, setOverridesOpen] = useState(() => hasPhoneChannelOverrides(settings ?? {}));

  const taxiRaw = settings?.contacts?.taxiPhoneRaw ?? '';
  const taxiMask = settings?.contacts?.taxiPhoneMask ?? '';
  const taxiPreset = normalizePhoneDisplayPreset(
    settings?.contacts?.taxiPhoneFormatPreset
  ) as PhoneDisplayPresetId;

  const receptionPhoneMissing = isTenantFieldMissing('phoneRaw', readinessInput);

  return (
    <div className="space-y-4">
      {receptionPhoneMissing ? (
        <span className="text-xs font-normal text-amber-700">Reception phone is required for guests</span>
      ) : null}
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
            onRawChange={(value) => patchContacts({ taxiPhoneRaw: value || undefined })}
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
      <AdminField
        label="Instagram"
        value={settings?.contacts?.instagram ?? ''}
        onChange={(value) => patchContacts({ instagram: value.trim() || undefined })}
        placeholder="myhostel"
        hint="Username only (with or without @). Full profile URL also works. Shown in Get in touch."
        width="lg"
      />
      <AdminField
        label="Facebook"
        value={settings?.contacts?.facebook ?? ''}
        onChange={(value) => patchContacts({ facebook: value.trim() || undefined })}
        placeholder="myhostel"
        hint="Page username only (with or without @). Full page URL also works. Shown in Get in touch."
        width="lg"
      />
      <AdminField
        label="Guest WhatsApp chat"
        value={settings?.contacts?.guestChatUrl ?? ''}
        onChange={(value) => patchContacts({ guestChatUrl: value.trim() || undefined })}
        placeholder="https://chat.whatsapp.com/…"
        hint="WhatsApp group invite link — shown to checked-in guests only. Leave empty to use reception WhatsApp (1:1) when enabled."
        width="lg"
      />
    </div>
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
  activeModuleId = null,
  onModuleChange,
}: ContactsFieldsProps) {
  const { patchContacts } = useContactsDraft();
  const showReceptionToggles = shouldShowReceptionWhatsappToggles(settings ?? {});

  const receptionTenantSlug = (tenantSlug ?? readinessInput.slug)?.trim() ?? '';
  const showReceptionAccessFields = surface === 'owner' && Boolean(receptionTenantSlug);
  const mergedSettings = settings ?? readinessInput.settings ?? {};

  const modules = useMemo(
    () =>
      CONTACTS_ADMIN_MODULES.map((definition) => ({
        id: definition.id,
        label: definition.label,
        description: definition.description,
        hint: getContactsAdminModuleHint(definition.id, mergedSettings),
        status: getContactsAdminModuleStatus(definition.id, readinessInput),
        render: () => {
          switch (definition.id) {
            case 'reception-desk':
              return (
                <ReceptionDeskModule
                  settings={settings}
                  showReceptionAccessFields={showReceptionAccessFields}
                  showReceptionToggles={showReceptionToggles}
                  surface={surface}
                  receptionTenantSlug={receptionTenantSlug}
                  locale={locale}
                />
              );
            case 'reception-staff':
              return receptionTenantSlug ? (
                <ReceptionStaffManagement
                  surface={surface}
                  tenantSlug={receptionTenantSlug}
                  locale={locale}
                  disabled={readOnly}
                />
              ) : null;
            case 'guest-access-message':
              return <GuestAccessMessageModule settings={settings} />;
            case 'phones-email':
              return <PhonesEmailModule settings={settings} readinessInput={readinessInput} />;
            case 'stay-policy':
              return (
                <HostelPolicyFields
                  settings={settings}
                  readinessInput={readinessInput}
                  scope="full"
                  embedded
                />
              );
            case 'laundry':
              return <LaundryFields settings={settings} surface={surface} />;
            default:
              return null;
          }
        },
      })),
    [
      receptionTenantSlug,
      locale,
      mergedSettings,
      readOnly,
      readinessInput,
      settings,
      showReceptionAccessFields,
      showReceptionToggles,
      surface,
    ]
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
            onRawChange={(value) => patchContacts({ phoneRaw: value || undefined })}
            onMaskChange={(value) => patchContacts({ phoneMask: value || undefined })}
            onPresetChange={(value) => patchContacts({ phoneFormatPreset: value })}
            collapseWhenEmpty={false}
          />
        </div>
        <HostelPolicyFields settings={settings} readinessInput={readinessInput} scope="launch-core" />
      </div>
    );
  }

  const handleModuleChange = (moduleId: string | null) => {
    onModuleChange?.(moduleId as ContactsAdminModuleId | null);
  };

  return (
    <AdminSettingsDrillDown
      activeModuleId={activeModuleId}
      onModuleChange={handleModuleChange}
      modules={modules}
      detailChrome="external"
      hubFooter={
        <p className="text-sm text-muted-foreground">
          Property address, maps link, and walk directions are in <strong>Arrival journey</strong>.
        </p>
      }
    />
  );
}
