import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/utils';
import type { ExternalServiceId } from '@/shared/config/external-services';
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
  ...props
}: ExternalServiceButtonProps) {
  return (
    <a
      href={href}
      data-service={service}
      className={cn(externalServiceButtonVariants(), className)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
    >
      <ExternalServiceIcon service={service} />
      <span>{children}</span>
    </a>
  );
}
