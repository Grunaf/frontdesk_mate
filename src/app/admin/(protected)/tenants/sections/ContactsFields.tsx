import type { TenantSettings } from '@/entities/tenant';
import { isTenantFieldMissing, type TenantReadinessInput } from '@/entities/tenant/lib/resolveTenantReadiness';
import { AdminCheckbox, AdminField, AdminTextarea } from '../ui/AdminField';

export type ContactsFieldsScope = 'full' | 'launch-core' | 'launch-booking-override';

interface ContactsFieldsProps {
  settings?: TenantSettings;
  readinessInput: TenantReadinessInput;
  scope?: ContactsFieldsScope;
}

export function ContactsFields({
  settings,
  readinessInput,
  scope = 'full',
}: ContactsFieldsProps) {
  if (scope === 'launch-booking-override') {
    return (
      <AdminField
        label="Different WhatsApp for bookings (optional)"
        name="bookingWhatsappPhoneRaw"
        defaultValue={settings?.contacts?.bookingWhatsappPhoneRaw}
        hint="Leave empty to use reception phone for hero and room booking links."
      />
    );
  }

  if (scope === 'launch-core') {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Hero and room cards use the reception phone for WhatsApp bookings unless you set a
          separate booking number in the booking step.
        </p>
        <AdminField
          label="Reception phone (raw)"
          name="phoneRaw"
          defaultValue={settings?.contacts?.phoneRaw}
          missing={isTenantFieldMissing('phoneRaw', readinessInput)}
        />
        <AdminField
          label="Address"
          name="address"
          defaultValue={settings?.contacts?.address}
          missing={isTenantFieldMissing('address', readinessInput)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reception</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField
            label="Reception open"
            name="receptionOpen"
            defaultValue={settings?.reception?.open}
            placeholder="08:00"
          />
          <AdminField
            label="Reception close"
            name="receptionClose"
            defaultValue={settings?.reception?.close}
            placeholder="22:00"
          />
        </div>
        <AdminField
          label="Reception WhatsApp (raw, optional override)"
          name="receptionWhatsappPhoneRaw"
          defaultValue={settings?.reception?.whatsappPhoneRaw}
          hint="Defaults to reception phone when empty."
        />
        <AdminField
          label="Different WhatsApp for bookings (optional)"
          name="bookingWhatsappPhoneRaw"
          defaultValue={settings?.contacts?.bookingWhatsappPhoneRaw}
          hint="Landing hero and room cards use this when set; otherwise reception phone."
        />
        <AdminField
          label="Reception availability hint"
          name="receptionAvailabilityHint"
          defaultValue={settings?.reception?.availabilityHint}
          placeholder="Replies on WhatsApp during reception hours."
        />
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
        <AdminField
          label="Reception desk PIN"
          name="receptionDeskPin"
          type="password"
          placeholder={settings?.reception?.deskPinHash ? '•••••• (unchanged)' : 'Set PIN for reception desk'}
          hint="Used at {slug}.reception.domain. Leave blank to keep the current PIN."
        />
      </div>

      <div className="space-y-4 border-t pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact details</p>
        <AdminField
          label="Reception phone (raw)"
          name="phoneRaw"
          defaultValue={settings?.contacts?.phoneRaw}
          missing={isTenantFieldMissing('phoneRaw', readinessInput)}
        />
        <AdminField label="Reception phone (display)" name="phoneMask" defaultValue={settings?.contacts?.phoneMask} />
        <AdminField
          label="Taxi WhatsApp phone (raw)"
          name="taxiPhoneRaw"
          defaultValue={settings?.contacts?.taxiPhoneRaw}
        />
        <AdminField label="Taxi phone (display)" name="taxiPhoneMask" defaultValue={settings?.contacts?.taxiPhoneMask} />
        <AdminField
          label="Route feedback WhatsApp (raw)"
          name="feedbackPhoneRaw"
          defaultValue={settings?.contacts?.feedbackPhoneRaw}
        />
        <AdminField label="Email" name="email" type="email" defaultValue={settings?.contacts?.email} />
        <AdminField
          label="Address"
          name="address"
          defaultValue={settings?.contacts?.address}
          missing={isTenantFieldMissing('address', readinessInput)}
        />
        <AdminField label="Google Maps URL" name="mapsUrl" defaultValue={settings?.contacts?.mapsUrl} />
      </div>

      <div className="space-y-4 border-t pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Arrival directions</p>
        <AdminTextarea
          label="Walk to hostel (tenant override)"
          name="arrivalWalkToHostel"
          defaultValue={settings?.arrivalWalkToHostel}
          placeholder="Final steps from the city route to your door. Overrides city pack text when set."
          hint="Shown in pre-trip info and affects route readiness."
        />
      </div>
    </div>
  );
}
