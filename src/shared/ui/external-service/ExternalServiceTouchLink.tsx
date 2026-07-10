'use client';

import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';
import { useLinkPressFeedback } from '@/shared/ui/action-feedback';
import type { ExternalServiceId } from '@/shared/config/external-services';
import { externalServiceTouchLinkVariants } from './service-styles';
import { ExternalServiceIcon } from './ExternalServiceIcon';

interface ExternalServiceTouchLinkProps extends ComponentProps<'a'> {
  service: ExternalServiceId;
  external?: boolean;
}

/** Text-style link with a 44px-friendly tap target and optional brand icon. */
export function ExternalServiceTouchLink({
  service,
  external = true,
  className,
  children,
  href,
  onClick,
  ...props
}: ExternalServiceTouchLinkProps) {
  const { pending, bindLinkPress } = useLinkPressFeedback();
  const pressProps = bindLinkPress(onClick);

  return (
    <a
      href={href}
      data-service={service}
      className={cn(externalServiceTouchLinkVariants(), pending && 'pointer-events-none opacity-80', className)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
      {...pressProps}
    >
      <ExternalServiceIcon service={service} />
      <span className="text-left leading-snug">{children}</span>
    </a>
  );
}

interface TouchLinkProps extends ComponentProps<'a'> {
  external?: boolean;
}

/** Enlarged tap target without a brand icon (e.g. tel: reception). */
export function TouchLink({
  external = false,
  className,
  children,
  href,
  onClick,
  ...props
}: TouchLinkProps) {
  const { pending, bindLinkPress } = useLinkPressFeedback();
  const pressProps = bindLinkPress(onClick);

  return (
    <a
      href={href}
      className={cn(
        'inline-flex min-h-11 max-w-full items-center rounded-md px-2 py-2 -my-1 font-medium text-foreground underline decoration-foreground/35 underline-offset-[3px] transition-colors hover:bg-muted/50 hover:decoration-foreground/70 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
        pending && 'pointer-events-none opacity-80',
        className
      )}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
      {...pressProps}
    >
      <span className="text-left leading-snug">{children}</span>
    </a>
  );
}
