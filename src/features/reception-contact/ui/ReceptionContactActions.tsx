'use client';

import type { VariantProps } from 'class-variance-authority';
import type { ResolvedReceptionContact } from '@/entities/tenant/lib/resolveReceptionContact';
import type { ReceptionContactContext } from '@/shared/lib/analytics';
import { trackReceptionContactClick } from '@/shared/lib/analytics';
import { Button, buttonVariants, ExternalServiceButton, ExternalServiceTouchLink, Icon, TouchLink } from '@/shared/ui';
import { Phone } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ReceptionContactLabels {
  message: string;
  call: string;
}

interface ReceptionContactActionsProps {
  contact: ResolvedReceptionContact;
  labels: ReceptionContactLabels;
  layout?: 'footer' | 'inline';
  whatsappVariant?: 'primary' | 'muted';
  whatsappButtonClassName?: string;
  callButtonSize?: 'default' | 'lg' | 'sm';
  callButtonVariant?: VariantProps<typeof buttonVariants>['variant'];
  analyticsContext?: ReceptionContactContext;
  tenantSlug?: string | null;
}

export function ReceptionContactActions({
  contact,
  labels,
  layout = 'footer',
  whatsappVariant = 'muted',
  whatsappButtonClassName,
  callButtonSize = 'lg',
  callButtonVariant = 'outline',
  analyticsContext,
  tenantSlug,
}: ReceptionContactActionsProps) {
  const trackClick = (channel: 'whatsapp' | 'tel') => {
    if (!analyticsContext || !tenantSlug) {
      return;
    }

    trackReceptionContactClick(tenantSlug, analyticsContext, channel);
  };

  if (layout === 'inline') {
    return (
      <span className="inline-flex flex-wrap items-center justify-center gap-x-1">
        {contact.whatsappHref ? (
          <ExternalServiceTouchLink
            service="whatsapp"
            href={contact.whatsappHref}
            onClick={() => trackClick('whatsapp')}
          >
            {labels.message}
          </ExternalServiceTouchLink>
        ) : null}
        {contact.whatsappHref && contact.telHref ? (
          <span className="text-muted-foreground">·</span>
        ) : null}
        {contact.telHref ? (
          <TouchLink href={contact.telHref} onClick={() => trackClick('tel')}>
            {labels.call}
          </TouchLink>
        ) : null}
      </span>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {contact.whatsappHref ? (
        <ExternalServiceButton
          service="whatsapp"
          href={contact.whatsappHref}
          onClick={() => trackClick('whatsapp')}
          className={cn(
            whatsappVariant === 'muted' &&
              'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
            whatsappButtonClassName
          )}
        >
          {labels.message}
        </ExternalServiceButton>
      ) : null}
      {contact.telHref ? (
        <Button asChild size={callButtonSize} variant={callButtonVariant} className="w-full">
          <a
            href={contact.telHref}
            className="flex items-center justify-center gap-2"
            onClick={() => trackClick('tel')}
          >
            <Icon icon={Phone} className="size-4" />
            {labels.call}
          </a>
        </Button>
      ) : null}
      {contact.availabilityHint ? (
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          {contact.availabilityHint}
        </p>
      ) : null}
    </div>
  );
}

interface ReceptionContactHintProps {
  contact: ResolvedReceptionContact;
}

export function ReceptionContactHint({ contact }: ReceptionContactHintProps) {
  if (!contact.availabilityHint) {
    return null;
  }

  return (
    <p className="text-center text-sm leading-relaxed text-muted-foreground">
      {contact.availabilityHint}
    </p>
  );
}
