'use client';

import { useMemo } from 'react';
import { resolveReceptionContact } from '@/entities/tenant/lib/resolveReceptionContact';
import { useHostelConfig, useTenant } from '@/entities/tenant';
import { useReceptionContactLabels } from '@/features/reception-contact';
import { trackReceptionContactClick } from '@/shared/lib/analytics';
import { useTranslations } from '@/shared/i18n';
import { ExternalServiceTouchLink, TouchLink } from '@/shared/ui';
import { useBottomSheetOpenCount } from '@/shared/ui/bottom-sheet-open-context';
import { conciergeReceptionStripFixedClass } from '../lib/conciergeStripLayout';

export function ConciergeReceptionStrip() {
  const { name, slug } = useTenant();
  const hostel = useHostelConfig();
  const t = useTranslations('components.conciergeContact');
  const receptionLabels = useReceptionContactLabels();
  const bottomSheetOpenCount = useBottomSheetOpenCount();

  const contact = useMemo(
    () =>
      resolveReceptionContact(hostel, {
        message: t('whatsappMessage', { hostelName: name }),
        urgency: 'low',
        translate: receptionLabels.translateHint,
      }),
    [hostel, name, receptionLabels.translateHint, t]
  );

  if (!contact || bottomSheetOpenCount > 0) {
    return null;
  }

  return (
    <div className={conciergeReceptionStripFixedClass} data-slot="concierge-reception-strip">
      {contact.whatsappHref ? (
        <ExternalServiceTouchLink
          service="whatsapp"
          href={contact.whatsappHref}
          className="w-full min-w-0 justify-center text-center text-sm [&_span]:break-words"
          onClick={() => trackReceptionContactClick(slug, 'strip', 'whatsapp')}
        >
          <span className="short-viewport:hidden">{t('receptionStripLabel', { hostelName: name })}</span>
          <span className="hidden short-viewport:inline">{t('receptionStripLabelCompact')}</span>
        </ExternalServiceTouchLink>
      ) : contact.telHref ? (
        <TouchLink
          href={contact.telHref}
          className="w-full min-w-0 justify-center text-center text-sm [&_span]:break-words"
          onClick={() => trackReceptionContactClick(slug, 'strip', 'tel')}
        >
          <span className="short-viewport:hidden">{receptionLabels.call}</span>
          <span className="hidden short-viewport:inline">{receptionLabels.call}</span>
        </TouchLink>
      ) : null}
      <p className="mt-1 text-center text-sm leading-relaxed text-muted-foreground short-viewport:hidden">
        {t('receptionStripHint')}
      </p>
      {contact.availabilityHint ? (
        <p className="mt-0.5 text-center text-sm leading-relaxed text-muted-foreground short-viewport:hidden">
          {contact.availabilityHint}
        </p>
      ) : null}
    </div>
  );
}
