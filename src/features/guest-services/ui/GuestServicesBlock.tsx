'use client';

import { useMemo } from 'react';
import { formatStayReference } from '@/entities/guest-stay';
import { resolveGuestStayPlan, useHostelConfig, useTenant } from '@/entities/tenant';
import { resolveGuestStayBedLabel } from '@/features/guest-stay-chip/lib/buildExtendStayWhatsappMessage';
import { useGuestSession, useIsGuestRegistered } from '@/features/guest-check-in';
import { useTranslations } from '@/shared/i18n';
import { resolveGuestServices } from '../lib/resolveGuestServices';
import { GuestServiceCard } from './GuestServiceCard';

export function GuestServicesBlock() {
  const { settings } = useTenant();
  const hostel = useHostelConfig();
  const { session } = useGuestSession();
  const isRegistered = useIsGuestRegistered();
  const t = useTranslations('components.guestServices');
  const tBed = useTranslations('components.findYourBed');

  const services = useMemo(() => resolveGuestServices(settings), [settings]);
  const plan = useMemo(
    () => resolveGuestStayPlan(settings, session?.bedId),
    [settings, session?.bedId]
  );
  const stayRef = session?.stayId ? formatStayReference(session.stayId) : null;
  const bedLabel = useMemo(
    () =>
      resolveGuestStayBedLabel(plan, (key, values) =>
        tBed(key, values as Record<string, string | number> | undefined)
      ),
    [plan, tBed]
  );

  const whatsappPhone = hostel.reception.whatsapp.raw;
  const waEnabled = hostel.reception.whatsappEnabled && Boolean(whatsappPhone);

  if (!isRegistered || !waEnabled || services.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h3 className="px-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {t('sectionTitle')}
      </h3>
      <div className="space-y-3">
        {services.map((service) => (
          <GuestServiceCard
            key={service.id}
            service={service}
            whatsappPhone={whatsappPhone}
            bedLabel={bedLabel}
            stayRef={stayRef}
            checkoutTime={settings.checkOutTime}
          />
        ))}
      </div>
    </section>
  );
}
