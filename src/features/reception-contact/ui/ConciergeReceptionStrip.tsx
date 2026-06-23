'use client';

import { useMemo } from 'react';
import { resolveReceptionAvailabilityHint } from '@/entities/tenant/lib/resolveReceptionAvailabilityHint';
import { useHostelConfig, useTenant } from '@/entities/tenant';
import { useTranslations } from '@/shared/i18n';
import { createWhatsappLink } from '@/shared/lib';
import { ExternalServiceTouchLink } from '@/shared/ui';
import { useBottomSheetOpenCount } from '@/shared/ui/bottom-sheet-open-context';
import { conciergeReceptionStripFixedClass } from '../lib/conciergeStripLayout';

export function ConciergeReceptionStrip() {
  const { name } = useTenant();
  const hostel = useHostelConfig();
  const t = useTranslations('components.conciergeContact');
  const tReception = useTranslations('components.taxi');
  const bottomSheetOpenCount = useBottomSheetOpenCount();

  const contact = useMemo(() => {
    const whatsappPhone = hostel.reception.whatsapp.raw;
    const message = t('whatsappMessage', { hostelName: name });

    if (!hostel.reception.whatsappEnabled || !whatsappPhone) {
      return null;
    }

    return {
      whatsappHref: createWhatsappLink(whatsappPhone, message),
      availabilityHint: resolveReceptionAvailabilityHint(hostel.reception, (key, hintParams) =>
        tReception(key, hintParams)
      ),
    };
  }, [hostel.reception, name, t, tReception]);

  if (!contact || bottomSheetOpenCount > 0) {
    return null;
  }

  return (
    <div className={conciergeReceptionStripFixedClass} data-slot="concierge-reception-strip">
      <ExternalServiceTouchLink
        service="whatsapp"
        href={contact.whatsappHref}
        className="w-full min-w-0 justify-center text-center text-sm [&_span]:break-words"
      >
        <span className="short-viewport:hidden">{t('receptionStripLabel', { hostelName: name })}</span>
        <span className="hidden short-viewport:inline">{t('receptionStripLabelCompact')}</span>
      </ExternalServiceTouchLink>
      <p className="mt-1 text-center text-[11px] leading-relaxed text-muted-foreground short-viewport:hidden">
        {t('receptionStripHint')}
      </p>
      {contact.availabilityHint ? (
        <p className="mt-0.5 text-center text-[11px] leading-relaxed text-muted-foreground short-viewport:hidden">
          {contact.availabilityHint}
        </p>
      ) : null}
    </div>
  );
}
