'use client';

import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';
import type { ExternalServiceId } from '@/shared/config/external-services';
import { useLinkPressFeedback } from '@/shared/ui/action-feedback';
import { externalServiceButtonVariants } from './service-styles';
import { ExternalServiceIcon } from './ExternalServiceIcon';

interface ExternalServiceButtonProps extends ComponentProps<'a'> {
  service: ExternalServiceId;
  external?: boolean;
}

export function ExternalServiceButton({
  service,
  external = true,
  className,
  children,
  href,
  onClick,
  ...props
}: ExternalServiceButtonProps) {
  const { pending, bindLinkPress } = useLinkPressFeedback();
  const pressProps = bindLinkPress(onClick);

  return (
    <a
      href={href}
      data-service={service}
      className={cn(
        externalServiceButtonVariants(),
        pending && 'pointer-events-none opacity-80',
        className
      )}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
      {...pressProps}
    >
      <ExternalServiceIcon service={service} />
      <span>{children}</span>
    </a>
  );
}
